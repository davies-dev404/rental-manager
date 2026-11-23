const PlatformSetting = require('../../models/PlatformSetting');
const PaymentService = require('../../services/payments/PaymentService');
const { getPesapalConfig } = require('../../config/pesapalConfig');
const { getIntaSendConfig } = require('../../config/intasendConfig');
const { validateSafeImageInput, pickAllowed } = require('../../middleware/securityMiddleware');
const { invalidateMaintenanceCache } = require('../../middleware/adminMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');

async function getOrCreatePlatformSettings() {
  let doc = await PlatformSetting.findOne({ key: 'global' });
  if (!doc) {
    doc = await PlatformSetting.create({ key: 'global' });
  }
  return doc;
}

function getSafeIntegrationStatus() {
  const gw = PaymentService.getActiveGatewayStatus();
  const pesapal = getPesapalConfig({ requireConfigured: false });
  const intasend = getIntaSendConfig({ requireConfigured: false });
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
      brevoConfigured: Boolean((process.env.BREVO_API_KEY || '').trim()),
      turnstileConfigured: Boolean((process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || '').trim())
    }
  };
}

exports.getPlatformSettings = async (req, res) => {
  try {
    const doc = await getOrCreatePlatformSettings();
    res.json({
      settings: doc.toObject(),
      paymentConfigurationStatus: getSafeIntegrationStatus()
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load platform settings' });
  }
};

exports.updatePlatformSettings = async (req, res) => {
  try {
    const doc = await getOrCreatePlatformSettings();
    const prevState = {
      platformName: doc.platformName,
      supportEmail: doc.supportEmail,
      supportPhone: doc.supportPhone,
      defaultCurrency: doc.defaultCurrency,
      timezone: doc.timezone,
      maintenanceMode: doc.maintenanceMode
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
    if (allowed.maintenanceMessage !== undefined) doc.maintenanceMessage = String(allowed.maintenanceMessage).trim();
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

    await logAdminAction({
      req,
      action: 'PLATFORM_SETTINGS_UPDATED',
      category: 'settings',
      targetType: 'PlatformSetting',
      targetId: String(doc._id),
      details: `Updated platform settings (maintenanceMode=${doc.maintenanceMode}, currency=${doc.defaultCurrency})`,
      previousState: prevState,
      newState: {
        platformName: doc.platformName,
        supportEmail: doc.supportEmail,
        supportPhone: doc.supportPhone,
        defaultCurrency: doc.defaultCurrency,
        timezone: doc.timezone,
        maintenanceMode: doc.maintenanceMode
      }
    });

    res.json({
      success: true,
      settings: doc.toObject(),
      paymentConfigurationStatus: getSafeIntegrationStatus()
    });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update platform settings' });
  }
};
