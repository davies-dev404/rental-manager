const PlatformSetting = require('../../models/PlatformSetting');
const Settings = require('../../models/Settings');
const PaymentService = require('../../services/payments/PaymentService');
const { getPesapalConfig } = require('../../config/pesapalConfig');
const { getIntaSendConfig } = require('../../config/intasendConfig');
const { resolveBrevoApiKey } = require('../../utils/brevoService');
const { validateSafeImageInput, pickAllowed } = require('../../middleware/securityMiddleware');
const {
  invalidateMaintenanceCache,
  evaluateMaintenanceState,
  broadcastMaintenanceEmailNotice
} = require('../../services/maintenanceService');
const { logAdminAction } = require('../../utils/auditLogger');

async function getOrCreatePlatformSettings() {
  let doc = await PlatformSetting.findOne({ key: 'global' });
  if (!doc) {
    doc = await PlatformSetting.create({ key: 'global' });
  }
  return doc;
}

async function getSafeIntegrationStatus() {
  const gw = PaymentService.getActiveGatewayStatus();
  const pesapal = getPesapalConfig({ requireConfigured: false });
  const intasend = getIntaSendConfig({ requireConfigured: false });
  const dbSettings = await Settings.findOne().select('integrations.email.brevo').lean().catch(() => null);
  const envApiKey = resolveBrevoApiKey(process.env.BREVO_API_KEY);
  const dbApiKey = resolveBrevoApiKey(dbSettings?.integrations?.email?.brevo?.apiKey);
  const smtpOk = Boolean(
    (process.env.BREVO_SMTP_USER || process.env.SMTP_USER || '').trim() &&
      (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS || dbSettings?.integrations?.email?.brevo?.smtpKey || '').trim()
  );
  return {
    activeProvider: gw.provider,
    activeEnvironment: gw.environment || 'sandbox',
    gateways: {
      pesapal: {
        configured: Boolean(pesapal.isConfigured),
        environment: pesapal.environment,
        ipnConfigured: Boolean(pesapal.ipnUrl || pesapal.ipnId)
      },
      intasend: {
        configured: Boolean(intasend.isConfigured),
        environment: intasend.environment,
        webhookChallengeConfigured: Boolean(intasend.webhookChallenge)
      },
      mpesaC2B: {
        configured: Boolean(process.env.MPESA_CONSUMER_KEY || process.env.MPESA_SHORTCODE || true),
        callbackBase: '/api/mpesa'
      }
    },
    messaging: {
      brevoConfigured: Boolean(envApiKey || dbApiKey || smtpOk),
      turnstileConfigured: Boolean((process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim())
    }
  };
}

function maintenanceSignature(doc) {
  return JSON.stringify({
    mode: Boolean(doc?.maintenanceMode),
    scheduled: Boolean(doc?.maintenanceScheduled),
    startAt: doc?.maintenanceStartAt ? new Date(doc.maintenanceStartAt).toISOString() : null,
    endAt: doc?.maintenanceEndAt ? new Date(doc.maintenanceEndAt).toISOString() : null,
    message: String(doc?.maintenanceMessage || '').trim()
  });
}

function parseOptionalDate(val) {
  if (val === undefined) return undefined;
  if (val === null || String(val).trim() === '') return null;
  const parsed = new Date(val);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid scheduled maintenance date/time.');
  }
  return parsed;
}

exports.getPlatformSettings = async (req, res) => {
  try {
    const doc = await getOrCreatePlatformSettings();
    res.json({
      settings: doc.toObject(),
      maintenanceState: evaluateMaintenanceState(doc),
      paymentConfigurationStatus: await getSafeIntegrationStatus()
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load platform settings' });
  }
};

exports.updatePlatformSettings = async (req, res) => {
  try {
    const doc = await getOrCreatePlatformSettings();
    const prevMaintSig = maintenanceSignature(doc);
    const prevState = {
      platformName: doc.platformName,
      supportEmail: doc.supportEmail,
      supportPhone: doc.supportPhone,
      defaultCurrency: doc.defaultCurrency,
      timezone: doc.timezone,
      maintenanceMode: doc.maintenanceMode,
      maintenanceScheduled: doc.maintenanceScheduled,
      maintenanceStartAt: doc.maintenanceStartAt,
      maintenanceEndAt: doc.maintenanceEndAt
    };

    const allowed = pickAllowed(req.body, [
      'platformName',
      'platformLogo',
      'supportEmail',
      'supportPhone',
      'supportAddress',
      'defaultCurrency',
      'timezone',
      'maintenanceMode',
      'maintenanceScheduled',
      'maintenanceStartAt',
      'maintenanceEndAt',
      'maintenanceNotifyEmails',
      'maintenanceMessage',
      'subscriptionConfig',
      'notifications'
    ]);

    if (allowed.platformLogo !== undefined) {
      const check = validateSafeImageInput(allowed.platformLogo, { maxBytes: 1500 * 1024 });
      if (!check.valid) {
        return res.status(400).json({ message: check.message });
      }
      allowed.platformLogo = check.value;
    }

    if (allowed.platformName !== undefined) doc.platformName = String(allowed.platformName).trim() || 'MakaziFlow';
    if (allowed.platformLogo !== undefined) doc.platformLogo = allowed.platformLogo;
    if (allowed.supportEmail !== undefined) doc.supportEmail = String(allowed.supportEmail).trim();
    if (allowed.supportPhone !== undefined) doc.supportPhone = String(allowed.supportPhone).trim();
    if (allowed.supportAddress !== undefined) doc.supportAddress = String(allowed.supportAddress).trim();
    if (allowed.defaultCurrency !== undefined) doc.defaultCurrency = String(allowed.defaultCurrency).trim().toUpperCase() || 'KES';
    if (allowed.timezone !== undefined) doc.timezone = String(allowed.timezone).trim() || 'Africa/Nairobi';
    if (allowed.maintenanceMode !== undefined) doc.maintenanceMode = Boolean(allowed.maintenanceMode);
    if (allowed.maintenanceScheduled !== undefined) doc.maintenanceScheduled = Boolean(allowed.maintenanceScheduled);
    if (allowed.maintenanceStartAt !== undefined) doc.maintenanceStartAt = parseOptionalDate(allowed.maintenanceStartAt);
    if (allowed.maintenanceEndAt !== undefined) doc.maintenanceEndAt = parseOptionalDate(allowed.maintenanceEndAt);
    if (allowed.maintenanceNotifyEmails !== undefined) doc.maintenanceNotifyEmails = Boolean(allowed.maintenanceNotifyEmails);
    if (allowed.maintenanceMessage !== undefined) doc.maintenanceMessage = String(allowed.maintenanceMessage).trim();

    if (doc.maintenanceScheduled) {
      if (!doc.maintenanceStartAt) {
        return res.status(400).json({ message: 'Please set a start date & time for scheduled maintenance.' });
      }
      if (doc.maintenanceEndAt && doc.maintenanceEndAt <= doc.maintenanceStartAt) {
        return res.status(400).json({ message: 'Scheduled maintenance end time must be after the start time.' });
      }
    }

    if (allowed.subscriptionConfig && typeof allowed.subscriptionConfig === 'object') {
      doc.subscriptionConfig = {
        ...(doc.subscriptionConfig?.toObject ? doc.subscriptionConfig.toObject() : doc.subscriptionConfig),
        ...pickAllowed(allowed.subscriptionConfig, ['trialDays', 'gracePeriodDays', 'allowPublicSignup', 'autoExpirySweepEnabled'])
      };
    }
    if (allowed.notifications && typeof allowed.notifications === 'object') {
      doc.notifications = {
        ...(doc.notifications?.toObject ? doc.notifications.toObject() : doc.notifications),
        ...pickAllowed(allowed.notifications, ['emailOnNewUser', 'emailOnLargePayment', 'emailOnSupportTicket', 'adminAlertEmail'])
      };
    }

    doc.updatedBy = req.user._id;
    doc.updatedAt = new Date();
    await doc.save();

    invalidateMaintenanceCache();

    const newMaintSig = maintenanceSignature(doc);
    let maintenanceNotification = { triggered: false };
    const shouldBroadcastEmail =
      (doc.maintenanceMode || doc.maintenanceScheduled) &&
      doc.maintenanceNotifyEmails !== false &&
      (newMaintSig !== prevMaintSig || req.body?.sendMaintenanceEmailNow === true);

    if (shouldBroadcastEmail) {
      try {
        const delivery = await broadcastMaintenanceEmailNotice(doc);
        maintenanceNotification = { triggered: true, ...delivery };
      } catch (notifyErr) {
        maintenanceNotification = { triggered: true, error: notifyErr.message };
      }
    }

    await logAdminAction({
      req,
      action: 'PLATFORM_SETTINGS_UPDATED',
      category: 'settings',
      targetType: 'PlatformSetting',
      targetId: String(doc._id),
      details: `Updated platform settings (maintenanceMode=${doc.maintenanceMode}, scheduled=${doc.maintenanceScheduled}, currency=${doc.defaultCurrency})`,
      previousState: prevState,
      newState: {
        platformName: doc.platformName,
        supportEmail: doc.supportEmail,
        supportPhone: doc.supportPhone,
        defaultCurrency: doc.defaultCurrency,
        timezone: doc.timezone,
        maintenanceMode: doc.maintenanceMode,
        maintenanceScheduled: doc.maintenanceScheduled,
        maintenanceStartAt: doc.maintenanceStartAt,
        maintenanceEndAt: doc.maintenanceEndAt
      }
    });

    const refreshedDoc = await getOrCreatePlatformSettings();

    res.json({
      success: true,
      settings: refreshedDoc.toObject(),
      maintenanceState: evaluateMaintenanceState(refreshedDoc),
      maintenanceNotification,
      paymentConfigurationStatus: await getSafeIntegrationStatus()
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update platform settings' });
  }
};

exports.sendMaintenanceBroadcast = async (req, res) => {
  try {
    const doc = await getOrCreatePlatformSettings();
    if (!doc.maintenanceMode && !doc.maintenanceScheduled && !(doc.maintenanceMessage || '').trim()) {
      return res.status(400).json({
        message: 'Enable maintenance mode, set a schedule, or enter a notice message before emailing users.'
      });
    }

    const delivery = await broadcastMaintenanceEmailNotice(doc);
    await logAdminAction({
      req,
      action: 'MAINTENANCE_NOTICE_BROADCAST',
      category: 'settings',
      targetType: 'PlatformSetting',
      targetId: String(doc._id),
      details: `Broadcasted maintenance notice emails to ${delivery.totalRecipients} recipient(s)`
    });

    const refreshedDoc = await getOrCreatePlatformSettings();
    return res.json({
      success: true,
      delivery,
      settings: refreshedDoc.toObject(),
      maintenanceState: evaluateMaintenanceState(refreshedDoc)
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to send maintenance email broadcast' });
  }
};
