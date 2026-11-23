const mongoose = require('mongoose');
const PlatformSetting = require('../models/PlatformSetting');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const DEFAULT_MAINTENANCE_MESSAGE =
  'MakaziFlow is currently undergoing scheduled maintenance. Please check back shortly.';

let maintenanceCache = { fetchedAt: 0, state: null };
const CACHE_TTL_MS = 10000;

function invalidateMaintenanceCache() {
  maintenanceCache = { fetchedAt: 0, state: null };
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatKenyaWindow(startAt, endAt, timezone = 'Africa/Nairobi') {
  if (!startAt) return '';
  const opts = {
    timeZone: timezone || 'Africa/Nairobi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  try {
    const startFmt = new Date(startAt).toLocaleString('en-KE', opts);
    if (!endAt) return `${startFmt} EAT`;
    const endFmt = new Date(endAt).toLocaleString('en-KE', opts);
    return `${startFmt} — ${endFmt} EAT`;
  } catch {
    return endAt ? `${new Date(startAt).toISOString()} — ${new Date(endAt).toISOString()}` : new Date(startAt).toISOString();
  }
}

/**
 * Evaluates both immediate manual maintenanceMode and scheduled [startAt, endAt) windows.
 */
function evaluateMaintenanceState(doc, nowInput = new Date()) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const manualEnabled = Boolean(doc?.maintenanceMode);
  const startDate = doc?.maintenanceStartAt ? new Date(doc.maintenanceStartAt) : null;
  const endDate = doc?.maintenanceEndAt ? new Date(doc.maintenanceEndAt) : null;

  const hasValidStart = Boolean(startDate && !Number.isNaN(startDate.getTime()));
  const hasValidEnd = Boolean(endDate && !Number.isNaN(endDate.getTime()));

  const scheduleEnabled = Boolean(doc?.maintenanceScheduled && hasValidStart);
  const windowNotExpired = !hasValidEnd || now < endDate;

  const isInScheduledWindow = Boolean(scheduleEnabled && now >= startDate && windowNotExpired);
  const isUpcoming = Boolean(!manualEnabled && scheduleEnabled && now < startDate && windowNotExpired);
  const active = Boolean(manualEnabled || isInScheduledWindow);
  const bannerVisible = Boolean(active || isUpcoming);

  return {
    active,
    manualEnabled,
    scheduled: Boolean(scheduleEnabled && windowNotExpired),
    isUpcoming,
    bannerVisible,
    message: (doc?.maintenanceMessage || '').trim() || DEFAULT_MAINTENANCE_MESSAGE,
    startAt: hasValidStart ? startDate.toISOString() : null,
    endAt: hasValidEnd ? endDate.toISOString() : null,
    timezone: doc?.timezone || 'Africa/Nairobi',
    platformName: doc?.platformName || 'MakaziFlow',
    supportEmail: doc?.supportEmail || 'info@afrinextech.co.ke',
    supportPhone: doc?.supportPhone || '0790264792'
  };
}

/**
 * Cached live maintenance evaluator used by API guard & public status endpoint.
 */
async function getLiveMaintenanceStatus() {
  const now = Date.now();
  if (maintenanceCache.state && now - maintenanceCache.fetchedAt <= CACHE_TTL_MS) {
    // Re-evaluate time bounds even when doc is cached so scheduled transitions fire on the exact second
    return evaluateMaintenanceState(maintenanceCache.doc || {}, new Date(now));
  }

  if (mongoose.connection?.readyState !== 1) {
    return evaluateMaintenanceState({}, new Date(now));
  }

  const doc = await PlatformSetting.findOne({ key: 'global' })
    .select('maintenanceMode maintenanceScheduled maintenanceStartAt maintenanceEndAt maintenanceMessage timezone platformName supportEmail supportPhone')
    .maxTimeMS(1500)
    .lean()
    .catch(() => null);

  const state = evaluateMaintenanceState(doc || {}, new Date(now));
  maintenanceCache = {
    fetchedAt: now,
    doc: doc || {},
    state
  };
  return state;
}

/**
 * Builds the branded MakaziFlow maintenance notice email and sends it to all active platform users.
 */
async function broadcastMaintenanceEmailNotice(settingDoc) {
  if (mongoose.connection?.readyState !== 1) {
    return { totalRecipients: 0, sentCount: 0, skippedCount: 0, failedCount: 0 };
  }

  const state = evaluateMaintenanceState(settingDoc);
  const platformName = state.platformName || 'MakaziFlow';
  const windowLabel = state.scheduled && state.startAt
    ? formatKenyaWindow(state.startAt, state.endAt, state.timezone)
    : '';

  const users = await User.find({
    accountStatus: { $in: ['active', 'pending_verification'] },
    role: { $ne: 'superadmin' },
    email: { $exists: true, $ne: '' }
  })
    .select('name email role')
    .lean();

  const seenEmails = new Set();
  const recipients = [];
  for (const u of users) {
    const email = String(u.email || '').trim().toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);
    recipients.push({ email, name: u.name || 'Valued Partner' });
  }

  const subject = state.active
    ? `[${platformName}] Maintenance Notice — Temporary Service Update`
    : `[${platformName}] Scheduled System Maintenance Notice`;

  const badgeText = state.active ? 'MAINTENANCE UNDERWAY' : 'SCHEDULED MAINTENANCE';
  const headerBg = state.active ? '#be123c' : '#d97706';

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (process.env.NODE_ENV !== 'test') {
    const BATCH_SIZE = 10;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((recipient) => {
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <div style="background: #0a1e35; padding: 20px 24px; color: #ffffff;">
                <span style="display: inline-block; background: ${headerBg}; color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;">
                  ${badgeText}
                </span>
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">${escapeHtml(platformName)} Service Notice</h2>
              </div>
              <div style="padding: 24px; color: #1e293b; line-height: 1.6; font-size: 14px;">
                <p style="margin-top: 0;">Hello <strong>${escapeHtml(recipient.name)}</strong>,</p>
                <div style="background: #f8fafc; border-left: 4px solid ${headerBg}; padding: 14px 16px; border-radius: 6px; margin: 16px 0;">
                  <p style="margin: 0; font-weight: 600; color: #0f172a;">${escapeHtml(state.message)}</p>
                </div>
                ${
                  windowLabel
                    ? `<p style="margin: 12px 0; font-size: 13px; color: #334155;"><strong>Maintenance Window:</strong> ${escapeHtml(windowLabel)}</p>`
                    : ''
                }
                <p style="margin: 12px 0; color: #475569; font-size: 13px;">
                  All tenant ledgers, payment records, properties, and automated schedules remain safe and encrypted during this maintenance window.
                </p>
                <p style="margin-bottom: 0; color: #475569; font-size: 13px;">
                  Need urgent assistance? Reach us at <a href="mailto:${escapeHtml(state.supportEmail)}" style="color: #2546e8;">${escapeHtml(state.supportEmail)}</a> or call <strong>${escapeHtml(state.supportPhone)}</strong>.
                </p>
              </div>
              <div style="background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; text-align: center;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(platformName)}. All rights reserved.
              </div>
            </div>
          `;
          return sendEmail({
            email: recipient.email,
            toName: recipient.name,
            subject,
            message: html,
            skipCommunicationLog: true
          });
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value?.simulated) skippedCount += 1;
          else sentCount += 1;
        } else {
          failedCount += 1;
        }
      }
    }
  } else {
    sentCount = recipients.length;
  }

  await PlatformSetting.updateOne(
    { _id: settingDoc._id },
    {
      $set: {
        maintenanceLastNotifiedAt: new Date(),
        maintenanceLastNotifiedCount: recipients.length
      }
    }
  ).catch(() => {});

  return {
    totalRecipients: recipients.length,
    sentCount,
    skippedCount,
    failedCount,
    subject,
    windowLabel
  };
}

module.exports = {
  DEFAULT_MAINTENANCE_MESSAGE,
  evaluateMaintenanceState,
  getLiveMaintenanceStatus,
  invalidateMaintenanceCache,
  broadcastMaintenanceEmailNotice
};
