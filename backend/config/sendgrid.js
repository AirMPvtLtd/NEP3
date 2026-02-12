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
  fromEmail: process.env.FROM_EMAIL || 'noreply@nepworkbench.com',
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

const sendVerificationEmail = async ({ to, name, verificationUrl }) => {
  const subject = 'Verify Your Email - NEP Workbench';

  const html = `
  <h2>Welcome ${name}!</h2>
  <p>Please verify your email by clicking below:</p>
  <a href="${verificationUrl}">Verify Email</a>
  <p>This link expires in 24 hours.</p>
  `;

  const text = `
  Welcome ${name},
  Verify your email here:
  ${verificationUrl}
  `;

  return await sendEmail({ to, subject, html, text });
};

const sendPasswordResetEmail = async ({ to, name, resetUrl, ipAddress }) => {
  const subject = 'Password Reset Request - NEP Workbench';

  const html = `
  <h2>Password Reset</h2>
  <p>Hi ${name},</p>
  <p>Click below to reset your password:</p>
  <a href="${resetUrl}">Reset Password</a>
  <p>This link expires in 1 hour.</p>
  <p>IP Address: ${ipAddress || 'Unknown'}</p>
  `;

  const text = `
  Hi ${name},
  Reset your password:
  ${resetUrl}
  This link expires in 1 hour.
  `;

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
