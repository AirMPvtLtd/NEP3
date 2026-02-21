/**
 * BREVO EMAIL CONFIGURATION
 * Transactional email service using Brevo (Sendinblue)
 */

const SibApiV3Sdk = require('sib-api-v3-sdk');
const logger = require('../utils/logger');

// ======================================================
// BREVO CONFIG
// ======================================================

const BREVO_CONFIG = {
  apiKey: process.env.BREVO_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@tryspyral.com',
  fromName: process.env.FROM_NAME || 'NEP Workbench',
  enabled: process.env.ENABLE_EMAIL_VERIFICATION !== 'false'
};

// Initialize Brevo
let emailApi = null;

if (BREVO_CONFIG.apiKey) {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications['api-key'].apiKey = BREVO_CONFIG.apiKey;
  emailApi = new SibApiV3Sdk.TransactionalEmailsApi();
  logger.info('✅ Brevo initialized');
} else {
  logger.warn('⚠️ BREVO_API_KEY not found. Email disabled.');
}

// ======================================================
// CORE EMAIL FUNCTION
// ======================================================

const sendEmail = async (options) => {
  try {
    if (!BREVO_CONFIG.enabled || !emailApi) {
      logger.warn('Email sending is disabled');
      return { success: false, message: 'Email disabled' };
    }

    if (!options.to || !isValidEmail(options.to)) {
      throw new Error('Invalid recipient email');
    }

    const emailData = {
      sender: {
        name: BREVO_CONFIG.fromName,
        email: BREVO_CONFIG.fromEmail
      },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text
    };

    if (options.cc) {
      emailData.cc = Array.isArray(options.cc)
        ? options.cc.map(e => ({ email: e }))
        : [{ email: options.cc }];
    }

    if (options.bcc) {
      emailData.bcc = Array.isArray(options.bcc)
        ? options.bcc.map(e => ({ email: e }))
        : [{ email: options.bcc }];
    }

    await emailApi.sendTransacEmail(emailData);

    logger.info(`✅ Email sent to: ${options.to}`);
    return { success: true };

  } catch (error) {
    logger.error('❌ Brevo Email Error:', error.response?.body || error.message);
    return { success: false, message: error.message };
  }
};

// ======================================================
// SPECIFIC EMAIL TYPES
// ======================================================

// ── Shared email wrapper ────────────────────────────────────────────────────
function emailShell(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SPYRAL</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <!-- Header -->
      <tr><td style="background:#7877c6;padding:28px 40px;text-align:center">
        <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">SPYRAL</span>
        <p style="margin:4px 0 0;color:#ddd6fe;font-size:13px">NEP 2020 Learning Platform</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px;color:#1a1a2e;font-size:15px;line-height:1.6">
        ${bodyHtml}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8f8fc;padding:20px 40px;text-align:center;border-top:1px solid #ebebf5">
        <p style="margin:0;color:#9999b3;font-size:12px">
          &copy; ${new Date().getFullYear()} SPYRAL &mdash; tryspyral.com<br>
          This is an automated message. Please do not reply to this email.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const subject = 'Verify your email — SPYRAL';
  const safeName = String(name || 'there').replace(/[<>]/g, '');

  const html = emailShell(`
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a2e">Welcome to SPYRAL, ${safeName}!</p>
    <p style="margin:0 0 24px;color:#4a4a6a">Thanks for signing up. Please verify your email address to activate your account.</p>
    <p style="text-align:center;margin:0 0 28px">
      <a href="${verificationUrl}" style="display:inline-block;background:#7877c6;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none">Verify Email Address</a>
    </p>
    <p style="margin:0 0 8px;color:#6b6b8a;font-size:13px">Or copy this link into your browser:</p>
    <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#9999b3">${verificationUrl}</p>
    <p style="margin:0;color:#9999b3;font-size:13px">This link expires in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
  `);

  const text = `Welcome to SPYRAL, ${safeName}!\n\nVerify your email:\n${verificationUrl}\n\nThis link expires in 24 hours.`;
  return await sendEmail({ to, subject, html, text });
};

const sendPasswordResetEmail = async ({ to, name, resetUrl, ipAddress }) => {
  const subject = 'Reset your SPYRAL password';
  const safeName = String(name || 'there').replace(/[<>]/g, '');

  const html = emailShell(`
    <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a1a2e">Reset your password</p>
    <p style="margin:0 0 24px;color:#4a4a6a">Hi ${safeName}, we received a request to reset your SPYRAL password. Click the button below to choose a new one.</p>
    <p style="text-align:center;margin:0 0 28px">
      <a href="${resetUrl}" style="display:inline-block;background:#7877c6;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none">Reset Password</a>
    </p>
    <p style="margin:0 0 8px;color:#6b6b8a;font-size:13px">Or copy this link:</p>
    <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#9999b3">${resetUrl}</p>
    <p style="margin:0 0 8px;color:#9999b3;font-size:13px">This link expires in <strong>1 hour</strong>.</p>
    ${ipAddress ? `<p style="margin:0;color:#c0c0d0;font-size:12px">Request from IP: ${ipAddress}</p>` : ''}
    <p style="margin:16px 0 0;color:#9999b3;font-size:13px">If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
  `);

  const text = `Hi ${safeName},\n\nReset your SPYRAL password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`;
  return await sendEmail({ to, subject, html, text });
};

const sendWelcomeEmail = async ({ to, name, dashboardUrl }) => {
  const subject = 'Welcome to NEP Workbench! 🎉';

  const html = `
  <h2>Welcome ${name}!</h2>
  <p>Your account is active.</p>
  <a href="${dashboardUrl}">Go to Dashboard</a>
  `;

  const text = `
  Welcome ${name},
  Start here:
  ${dashboardUrl}
  `;

  return await sendEmail({ to, subject, html, text });
};

const sendParentNotification = async ({
  to,
  parentName,
  studentName,
  challengeScore,
  performanceIndex
}) => {
  const subject = `${studentName} completed a challenge`;

  const html = `
  <h2>Learning Update</h2>
  <p>Hi ${parentName},</p>
  <p>${studentName} scored ${challengeScore}/100</p>
  <p>Performance Index: ${performanceIndex}/100</p>
  `;

  const text = `
  ${studentName} scored ${challengeScore}/100
  Performance Index: ${performanceIndex}/100
  `;

  return await sendEmail({ to, subject, html, text });
};

// ======================================================
// BULK EMAIL
// ======================================================

const sendBulkEmails = async (recipients, emailData) => {
  const results = [];

  for (const email of recipients) {
    const result = await sendEmail({
      ...emailData,
      to: email
    });

    results.push({ email, success: result.success });
  }

  return results;
};

// ======================================================
// UTILITIES
// ======================================================

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const getEmailStatistics = () => ({
  enabled: BREVO_CONFIG.enabled,
  hasApiKey: !!BREVO_CONFIG.apiKey,
  fromEmail: BREVO_CONFIG.fromEmail
});

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendParentNotification,
  sendBulkEmails,
  getEmailStatistics
};
