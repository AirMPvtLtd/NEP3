/**
 * DEVELOPER PORTAL CONTROLLER
 *
 * Handles the public API key request form submitted from /developer.
 * No authentication required — prospective customers fill this in.
 *
 * Flow:
 *   1. Validate the request body
 *   2. Persist the request as an Activity (type: api_access_request)
 *   3. Fire a notification email to sales@tryspyral.com
 *   4. Return a 202 Accepted response
 */

'use strict';

const logger       = require('../utils/logger');
const { sendEmail } = require('../config/sendgrid');
const Activity     = require('../models/Activity');

const SALES_EMAIL = 'sales@tryspyral.com';

// Allowed values for orgType and permissions to prevent garbage input
const VALID_ORG_TYPES   = ['university', 'research_institute', 'edtech', 'ngo', 'government', 'other'];
const VALID_PERMISSIONS = ['longitudinal', 'spiTimeline', 'competencyTrends', 'challengeStats', 'listSchools', 'exportDataset'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNotificationHtml(data) {
  const rows = [
    ['Name',           data.name],
    ['Email',          data.email],
    ['Organisation',   data.organisation],
    ['Org Type',       data.orgType],
    ['Endpoints',      (data.permissions || []).join(', ')],
    ['Intended Use',   data.intendedUse],
    ['Submitted At',   new Date().toUTCString()],
  ];

  const tableRows = rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;white-space:nowrap">${k}</td><td style="padding:6px 12px">${escapeHtml(v || '—')}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New API Access Request</title></head>
<body style="font-family:sans-serif;background:#f4f4f5;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
    <div style="background:#7c3aed;padding:24px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px">New Research API Access Request</h1>
      <p style="margin:4px 0 0;color:#ddd6fe;font-size:14px">tryspyral.com developer portal</p>
    </div>
    <div style="padding:32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${tableRows}
      </table>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
      <p style="font-size:13px;color:#6b7280">
        Reply directly to this email to contact the applicant.
        Provision a key via the admin panel once approved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/developer/request-access
 *
 * Public endpoint — no auth token required.
 * Rate-limited by the global rate limiter in app.js.
 */
exports.requestAccess = async (req, res) => {
  try {
    const { name, email, organisation, orgType, intendedUse, permissions = [] } = req.body;

    // ── Basic validation ──────────────────────────────────────────────────────
    const errors = [];

    if (!name || String(name).trim().length < 2)
      errors.push('name is required (min 2 chars)');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push('valid email is required');

    if (!organisation || String(organisation).trim().length < 2)
      errors.push('organisation is required');

    if (!orgType || !VALID_ORG_TYPES.includes(orgType))
      errors.push(`orgType must be one of: ${VALID_ORG_TYPES.join(', ')}`);

    if (!intendedUse || String(intendedUse).trim().length < 20)
      errors.push('intendedUse is required (min 20 chars)');

    if (!Array.isArray(permissions) || permissions.length === 0)
      errors.push('at least one endpoint permission must be selected');

    const invalidPerms = permissions.filter(p => !VALID_PERMISSIONS.includes(p));
    if (invalidPerms.length)
      errors.push(`unknown permissions: ${invalidPerms.join(', ')}`);

    if (errors.length) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    // Sanitise strings before storing
    const cleanName         = String(name).trim().slice(0, 100);
    const cleanEmail        = String(email).trim().toLowerCase().slice(0, 200);
    const cleanOrganisation = String(organisation).trim().slice(0, 200);
    const cleanIntendedUse  = String(intendedUse).trim().slice(0, 2000);

    // ── Persist to Activity log ───────────────────────────────────────────────
    // Store as a platform activity so ops team can see/filter requests
    try {
      await Activity.create({
        activityType: 'api_access_request',
        description:  `API access request from ${cleanName} <${cleanEmail}> (${cleanOrganisation})`,
        metadata: {
          name:         cleanName,
          email:        cleanEmail,
          organisation: cleanOrganisation,
          orgType,
          permissions,
          intendedUse:  cleanIntendedUse,
          ip:           req.ip,
          userAgent:    req.get('user-agent'),
        },
        // No schoolId/userId — this is a pre-signup external request
      });
    } catch (dbErr) {
      // Non-fatal — still send the email and respond 202
      logger.warn('developer.requestAccess: activity save failed', { error: dbErr.message });
    }

    // ── Notify sales team ─────────────────────────────────────────────────────
    try {
      await sendEmail({
        to:      SALES_EMAIL,
        subject: `[API Request] ${cleanName} – ${cleanOrganisation}`,
        html:    buildNotificationHtml({
          name: cleanName,
          email: cleanEmail,
          organisation: cleanOrganisation,
          orgType,
          intendedUse: cleanIntendedUse,
          permissions,
        }),
      });
    } catch (mailErr) {
      // Non-fatal — request is logged; email failure shouldn't block the user
      logger.warn('developer.requestAccess: sales email failed', { error: mailErr.message });
    }

    logger.info('developer.requestAccess: new request received', {
      email: cleanEmail,
      organisation: cleanOrganisation,
      orgType,
    });

    return res.status(202).json({
      success: true,
      message: 'Your access request has been received. Our team will reach out within 2 business days.',
    });

  } catch (err) {
    logger.error('developer.requestAccess error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};
