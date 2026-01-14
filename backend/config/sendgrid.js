// config/sendgrid.js
/**
 * SENDGRID EMAIL CONFIGURATION
 * Email service setup using SendGrid API
 * 
 * Features:
 * - Email sending
 * - Template support
 * - Email verification
 * - Password reset
 * - Notifications
 * 
 * @module config/sendgrid
 */

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

// ============================================================================
// SENDGRID CONFIGURATION
// ============================================================================

const SENDGRID_CONFIG = {
  apiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@nepworkbench.com',
  fromName: process.env.FROM_NAME || 'NEP Workbench',
  
  // Template IDs (create these in SendGrid dashboard)
  templates: {
    verification: process.env.VERIFICATION_EMAIL_TEMPLATE_ID,
    passwordReset: process.env.PASSWORD_RESET_EMAIL_TEMPLATE_ID,
    welcome: process.env.WELCOME_EMAIL_TEMPLATE_ID,
    challengeComplete: process.env.CHALLENGE_COMPLETE_TEMPLATE_ID
  },
  
  // Email settings
  trackClicks: true,
  trackOpens: true,
  enabled: process.env.ENABLE_EMAIL_VERIFICATION !== 'false'
};

// Initialize SendGrid
if (SENDGRID_CONFIG.apiKey) {
  sgMail.setApiKey(SENDGRID_CONFIG.apiKey);
  logger.info('✅ SendGrid initialized');
} else {
  logger.warn('⚠️ SENDGRID_API_KEY not found. Email functionality disabled.');
  
  if (process.env.NODE_ENV === 'production') {
    logger.error('❌ SendGrid is required in production');
  }
}

// ============================================================================
// CORE EMAIL FUNCTIONS
// ============================================================================

/**
 * Send Email
 * Generic email sending function
 * 
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async (options) => {
  try {
    // Check if email is enabled
    if (!SENDGRID_CONFIG.enabled || !SENDGRID_CONFIG.apiKey) {
      logger.warn('Email sending is disabled');
      return { success: false, message: 'Email disabled' };
    }
    
    // Validate email
    if (!options.to || !isValidEmail(options.to)) {
      throw new Error('Invalid recipient email');
    }
    
    // Prepare email message
    const msg = {
      to: options.to,
      from: {
        email: SENDGRID_CONFIG.fromEmail,
        name: SENDGRID_CONFIG.fromName
      },
      subject: options.subject,
      text: options.text,
      html: options.html,
      trackingSettings: {
        clickTracking: { enable: SENDGRID_CONFIG.trackClicks },
        openTracking: { enable: SENDGRID_CONFIG.trackOpens }
      }
    };
    
    // Add CC/BCC if provided
    if (options.cc) msg.cc = options.cc;
    if (options.bcc) msg.bcc = options.bcc;
    
    // Add attachments if provided
    if (options.attachments) {
      msg.attachments = options.attachments;
    }
    
    // Send email
    await sgMail.send(msg);
    
    logger.info(`✅ Email sent to: ${options.to}`);
    logger.debug(`Subject: ${options.subject}`);
    
    return {
      success: true,
      message: 'Email sent successfully',
      to: options.to
    };
    
  } catch (error) {
    logger.error('❌ Error sending email:', error.message);
    
    if (error.response) {
      logger.error('SendGrid Error:', error.response.body);
    }
    
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Send Email Using Template
 * Send email using SendGrid dynamic template
 * 
 * @param {Object} options - Template email options
 * @returns {Promise<Object>} Send result
 */
const sendTemplateEmail = async (options) => {
  try {
    if (!SENDGRID_CONFIG.enabled || !SENDGRID_CONFIG.apiKey) {
      logger.warn('Email sending is disabled');
      return { success: false, message: 'Email disabled' };
    }
    
    const msg = {
      to: options.to,
      from: {
        email: SENDGRID_CONFIG.fromEmail,
        name: SENDGRID_CONFIG.fromName
      },
      templateId: options.templateId,
      dynamicTemplateData: options.templateData || {}
    };
    
    await sgMail.send(msg);
    
    logger.info(`✅ Template email sent to: ${options.to}`);
    
    return {
      success: true,
      message: 'Template email sent successfully'
    };
    
  } catch (error) {
    logger.error('❌ Error sending template email:', error.message);
    return {
      success: false,
      message: error.message
    };
  }
};

// ============================================================================
// SPECIFIC EMAIL TYPES
// ============================================================================

/**
 * Send Email Verification
 * Send verification email to new users
 * 
 * @param {Object} params - Verification parameters
 * @returns {Promise<Object>} Send result
 */
const sendVerificationEmail = async (params) => {
  const { to, name, verificationToken, verificationUrl } = params;
  
  const subject = 'Verify Your Email - NEP Workbench';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #4F46E5; 
      color: white !important; 
      text-decoration: none; 
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NEP Workbench</h1>
    </div>
    <div class="content">
      <h2>Welcome, ${name}!</h2>
      <p>Thank you for registering with NEP Workbench. Please verify your email address to activate your account.</p>
      
      <p style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </p>
      
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
      
      <p><strong>This link will expire in 24 hours.</strong></p>
      
      <p>If you didn't create this account, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2025 NEP Workbench. All rights reserved.</p>
      <p>This email was sent to ${to}</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
Welcome to NEP Workbench!

Please verify your email address by visiting:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

© 2025 NEP Workbench
  `;
  
  return await sendEmail({ to, subject, html, text });
};

/**
 * Send Password Reset Email
 * 
 * @param {Object} params - Reset parameters
 * @returns {Promise<Object>} Send result
 */
const sendPasswordResetEmail = async (params) => {
  const { to, name, resetToken, resetUrl } = params;
  
  const subject = 'Password Reset Request - NEP Workbench';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #DC2626; 
      color: white !important; 
      text-decoration: none; 
      border-radius: 5px;
      margin: 20px 0;
    }
    .warning { background: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password for your NEP Workbench account.</p>
      
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>
      
      <p>Or copy and paste this link in your browser:</p>
      <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>
      
      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>This link will expire in 1 hour</li>
          <li>If you didn't request this, please ignore this email</li>
          <li>Your password will not change unless you click the link above</li>
        </ul>
      </div>
      
      <p>For security reasons, this request was received from IP: ${params.ipAddress || 'Unknown'}</p>
    </div>
    <div class="footer">
      <p>© 2025 NEP Workbench. All rights reserved.</p>
      <p>This email was sent to ${to}</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password. Click the link below to reset it:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

© 2025 NEP Workbench
  `;
  
  return await sendEmail({ to, subject, html, text });
};

/**
 * Send Welcome Email
 * 
 * @param {Object} params - Welcome parameters
 * @returns {Promise<Object>} Send result
 */
const sendWelcomeEmail = async (params) => {
  const { to, name, role, dashboardUrl } = params;
  
  const subject = 'Welcome to NEP Workbench! 🎉';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10B981; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { 
      display: inline-block; 
      padding: 12px 30px; 
      background: #10B981; 
      color: white !important; 
      text-decoration: none; 
      border-radius: 5px;
      margin: 20px 0;
    }
    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to NEP Workbench!</h1>
    </div>
    <div class="content">
      <h2>Hello ${name}!</h2>
      <p>Your account has been successfully activated. You're now part of India's leading NEP 2020-aligned educational platform!</p>
      
      <h3>What you can do:</h3>
      
      <div class="feature">
        <strong>🎯 AI-Powered Challenges</strong>
        <p>Generate personalized challenges adapted to your level</p>
      </div>
      
      <div class="feature">
        <strong>📊 Performance Tracking</strong>
        <p>Track your progress across 12 NEP competencies</p>
      </div>
      
      <div class="feature">
        <strong>🔬 Interactive Simulations</strong>
        <p>Access 44 physics, math, and chemistry simulations</p>
      </div>
      
      <p style="text-align: center;">
        <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
      </p>
      
      <p>Need help? Contact us at support@nepworkbench.com</p>
    </div>
    <div class="footer">
      <p>© 2025 NEP Workbench. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
Welcome to NEP Workbench!

Hello ${name}!

Your account is now active. Start your learning journey:
${dashboardUrl}

Need help? Email us at support@nepworkbench.com

© 2025 NEP Workbench
  `;
  
  return await sendEmail({ to, subject, html, text });
};

/**
 * Send Parent Notification
 * Notify parents about child's activity
 * 
 * @param {Object} params - Notification parameters
 * @returns {Promise<Object>} Send result
 */
const sendParentNotification = async (params) => {
  const { to, parentName, studentName, challengeScore, performanceIndex } = params;
  
  const subject = `${studentName}'s Challenge Completed - Score: ${challengeScore}/100`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366F1; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .score-card { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; }
    .score-large { font-size: 48px; font-weight: bold; color: #6366F1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Learning Update</h1>
    </div>
    <div class="content">
      <h2>Hi ${parentName},</h2>
      <p>${studentName} has completed a challenge!</p>
      
      <div class="score-card">
        <div class="score-large">${challengeScore}/100</div>
        <p>Challenge Score</p>
        <hr>
        <p><strong>Overall Performance Index:</strong> ${performanceIndex}/100</p>
      </div>
      
      <p>Keep encouraging ${studentName} to continue learning!</p>
      
      <p><a href="${process.env.FRONTEND_URL}/parent/dashboard">View Detailed Report →</a></p>
    </div>
  </div>
</body>
</html>
  `;
  
  const text = `
Hi ${parentName},

${studentName} completed a challenge!

Score: ${challengeScore}/100
Performance Index: ${performanceIndex}/100

View detailed report at: ${process.env.FRONTEND_URL}/parent/dashboard

© 2025 NEP Workbench
  `;
  
  return await sendEmail({ to, subject, html, text });
};

// ============================================================================
// BULK EMAIL
// ============================================================================

/**
 * Send Bulk Emails
 * Send email to multiple recipients
 * 
 * @param {Array} recipients - Array of email addresses
 * @param {Object} emailData - Email content
 * @returns {Promise<Array>} Results array
 */
const sendBulkEmails = async (recipients, emailData) => {
  const results = [];
  
  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        ...emailData,
        to: recipient
      });
      results.push({ recipient, success: result.success });
    } catch (error) {
      results.push({ recipient, success: false, error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  logger.info(`Bulk email: ${successCount}/${recipients.length} sent successfully`);
  
  return results;
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Validate Email Address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get Email Statistics
 * @returns {Object} Email stats
 */
const getEmailStatistics = () => {
  return {
    enabled: SENDGRID_CONFIG.enabled,
    hasApiKey: !!SENDGRID_CONFIG.apiKey,
    fromEmail: SENDGRID_CONFIG.fromEmail,
    fromName: SENDGRID_CONFIG.fromName
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration
  SENDGRID_CONFIG,
  
  // Core Functions
  sendEmail,
  sendTemplateEmail,
  
  // Specific Email Types
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendParentNotification,
  
  // Bulk Email
  sendBulkEmails,
  
  // Utilities
  isValidEmail,
  getEmailStatistics
};