// services/email.service.js
/**
 * EMAIL SERVICE - COMPLETE PRODUCTION VERSION
 * SendGrid email service with templates and queuing
 * 
 * @module services/email.service
 */

const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// ============================================================================
// SENDGRID CONFIGURATION
// ============================================================================

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@nep-workbench.com';
const FROM_NAME = process.env.FROM_NAME || 'NEP Workbench';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@nep-workbench.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn('⚠️  SENDGRID_API_KEY not set. Email functionality will be disabled.');
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

const templateDir = path.join(__dirname, '../templates/emails');

/**
 * Load email template
 * @param {String} templateName - Template name
 * @returns {Function} Compiled template
 */
const loadTemplate = (templateName) => {
  try {
    const templatePath = path.join(templateDir, `${templateName}.html`);
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    return handlebars.compile(templateContent);
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return null;
  }
};

/**
 * Base HTML template
 */
const baseTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #4CAF50;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      color: #4CAF50;
    }
    .content {
      padding: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4CAF50;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .highlight {
      background-color: #f0f8ff;
      padding: 15px;
      border-left: 4px solid #4CAF50;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">NEP Workbench</div>
    </div>
    <div class="content">
      {{{content}}}
    </div>
    <div class="footer">
      <p>© {{year}} NEP Workbench. All rights reserved.</p>
      <p>
        <a href="{{baseUrl}}/privacy">Privacy Policy</a> | 
        <a href="{{baseUrl}}/terms">Terms of Service</a> | 
        <a href="{{baseUrl}}/contact">Contact Us</a>
      </p>
      <p>If you have any questions, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>
`;

const baseTemplateCompiled = handlebars.compile(baseTemplate);

// ============================================================================
// EMAIL SENDING
// ============================================================================

/**
 * Send email
 * @param {Object} options - Email options
 * @returns {Promise}
 */
const sendEmail = async (options) => {
  const {
    to,
    subject,
    html,
    text,
    from = FROM_EMAIL,
    fromName = FROM_NAME,
    attachments = [],
    cc = [],
    bcc = [],
    replyTo = SUPPORT_EMAIL
  } = options;
  
  if (!SENDGRID_API_KEY) {
    console.warn('Email not sent (SENDGRID_API_KEY not configured):', { to, subject });
    return { success: false, message: 'Email service not configured' };
  }
  
  try {
    const msg = {
      to,
      from: {
        email: from,
        name: fromName
      },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
      replyTo,
      attachments,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined
    };
    
    const response = await sgMail.send(msg);
    
    console.log(`✅ Email sent to ${to}: ${subject}`);
    
    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode
    };
    
  } catch (error) {
    console.error('❌ Email send error:', error);
    
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response?.body
    };
  }
};

/**
 * Send templated email
 * @param {Object} options - Email options
 * @returns {Promise}
 */
const sendTemplatedEmail = async (options) => {
  const {
    to,
    subject,
    content,
    data = {}
  } = options;
  
  const year = new Date().getFullYear();
  const baseUrl = process.env.FRONTEND_URL || 'https://nep-workbench.com';
  
  const html = baseTemplateCompiled({
    subject,
    content,
    year,
    baseUrl,
    ...data
  });
  
  return await sendEmail({
    ...options,
    html
  });
};

// ============================================================================
// AUTHENTICATION EMAILS
// ============================================================================

/**
 * Send welcome email
 * @param {Object} user - User object
 * @returns {Promise}
 */
const sendWelcomeEmail = async (user) => {
  const { email, name, userType } = user;
  
  const content = `
    <h2>Welcome to NEP Workbench!</h2>
    <p>Dear ${name},</p>
    <p>Thank you for joining NEP Workbench as a ${userType}. We're excited to have you on board!</p>
    <p>Your account has been successfully created. You can now log in and start exploring the platform.</p>
    <div class="highlight">
      <p><strong>Getting Started:</strong></p>
      <ul>
        <li>Complete your profile</li>
        <li>Explore the dashboard</li>
        <li>Check out the tutorials</li>
      </ul>
    </div>
    <a href="${process.env.FRONTEND_URL}/login" class="button">Get Started</a>
    <p>If you have any questions, our support team is here to help!</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Welcome to NEP Workbench!',
    content
  });
};

/**
 * Send email verification
 * @param {Object} user - User object
 * @param {String} token - Verification token
 * @returns {Promise}
 */
const sendVerificationEmail = async (user, token) => {
  const { email, name } = user;
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Dear ${name},</p>
    <p>Thank you for registering with NEP Workbench. Please verify your email address to complete your registration.</p>
    <div class="highlight">
      <p>Click the button below to verify your email:</p>
      <a href="${verificationUrl}" class="button">Verify Email</a>
    </div>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
    <p><strong>Note:</strong> This link will expire in 24 hours.</p>
    <p>If you didn't create an account with NEP Workbench, please ignore this email.</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Verify Your Email - NEP Workbench',
    content
  });
};

/**
 * Send password reset email
 * @param {Object} user - User object
 * @param {String} token - Reset token
 * @returns {Promise}
 */
const sendPasswordResetEmail = async (user, token) => {
  const { email, name } = user;
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const content = `
    <h2>Reset Your Password</h2>
    <p>Dear ${name},</p>
    <p>We received a request to reset your password for your NEP Workbench account.</p>
    <div class="highlight">
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
    <p><strong>Note:</strong> This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Reset Your Password - NEP Workbench',
    content
  });
};

/**
 * Send password changed confirmation
 * @param {Object} user - User object
 * @returns {Promise}
 */
const sendPasswordChangedEmail = async (user) => {
  const { email, name } = user;
  
  const content = `
    <h2>Password Changed Successfully</h2>
    <p>Dear ${name},</p>
    <p>This is to confirm that your password has been successfully changed.</p>
    <div class="highlight">
      <p><strong>Security Tips:</strong></p>
      <ul>
        <li>Never share your password with anyone</li>
        <li>Use a strong, unique password</li>
        <li>Enable two-factor authentication if available</li>
      </ul>
    </div>
    <p>If you didn't make this change, please contact support immediately.</p>
    <a href="mailto:${SUPPORT_EMAIL}" class="button">Contact Support</a>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Password Changed - NEP Workbench',
    content
  });
};

// ============================================================================
// CHALLENGE EMAILS
// ============================================================================

/**
 * Send challenge evaluation email
 * @param {Object} student - Student object
 * @param {Object} challenge - Challenge object
 * @returns {Promise}
 */
const sendChallengeEvaluationEmail = async (student, challenge) => {
  const { email, name } = student;
  const { challengeId, simulationType, score, feedback } = challenge;
  
  const content = `
    <h2>Challenge Evaluated</h2>
    <p>Dear ${name},</p>
    <p>Your ${simulationType} challenge has been evaluated!</p>
    <div class="highlight">
      <p><strong>Challenge ID:</strong> ${challengeId}</p>
      <p><strong>Score:</strong> ${score}%</p>
      <p><strong>Feedback:</strong> ${feedback || 'Great work!'}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/challenges/${challengeId}" class="button">View Details</a>
    <p>Keep up the great work!</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Challenge Evaluated - NEP Workbench',
    content
  });
};

// ============================================================================
// REPORT EMAILS
// ============================================================================

/**
 * Send NEP report email
 * @param {Object} student - Student object
 * @param {Object} report - Report object
 * @returns {Promise}
 */
const sendNEPReportEmail = async (student, report) => {
  const { email, name } = student;
  const { reportId, reportType, generatedAt } = report;
  
  const content = `
    <h2>Your NEP Report is Ready</h2>
    <p>Dear ${name},</p>
    <p>Your ${reportType} NEP report has been generated and is now available for viewing.</p>
    <div class="highlight">
      <p><strong>Report ID:</strong> ${reportId}</p>
      <p><strong>Generated:</strong> ${new Date(generatedAt).toLocaleDateString()}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/reports/${reportId}" class="button">View Report</a>
    <p>This report provides insights into your learning progress and competency development.</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Your NEP Report is Ready - NEP Workbench',
    content
  });
};

/**
 * Send report to parent
 * @param {Object} parent - Parent object
 * @param {Object} student - Student object
 * @param {Object} report - Report object
 * @returns {Promise}
 */
const sendReportToParent = async (parent, student, report) => {
  const { email, name } = parent;
  const { reportId, reportType, generatedAt } = report;
  
  const content = `
    <h2>${student.name}'s NEP Report</h2>
    <p>Dear ${name},</p>
    <p>A ${reportType} NEP report for ${student.name} has been generated and is now available for your review.</p>
    <div class="highlight">
      <p><strong>Student:</strong> ${student.name}</p>
      <p><strong>Class:</strong> ${student.class}-${student.section}</p>
      <p><strong>Report Type:</strong> ${reportType}</p>
      <p><strong>Generated:</strong> ${new Date(generatedAt).toLocaleDateString()}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/parent/reports/${reportId}" class="button">View Report</a>
    <p>This report provides insights into your child's learning progress and development.</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: `${student.name}'s NEP Report - NEP Workbench`,
    content
  });
};

// ============================================================================
// NOTIFICATION EMAILS
// ============================================================================

/**
 * Send help ticket response
 * @param {Object} student - Student object
 * @param {Object} ticket - Ticket object
 * @returns {Promise}
 */
const sendHelpTicketResponse = async (student, ticket) => {
  const { email, name } = student;
  const { ticketId, subject, response } = ticket;
  
  const content = `
    <h2>Response to Your Help Ticket</h2>
    <p>Dear ${name},</p>
    <p>We've responded to your help ticket.</p>
    <div class="highlight">
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Response:</strong></p>
      <p>${response}</p>
    </div>
    <a href="${process.env.FRONTEND_URL}/tickets/${ticketId}" class="button">View Ticket</a>
    <p>If you have any additional questions, please reply to the ticket.</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: `Ticket Response: ${subject} - NEP Workbench`,
    content
  });
};

/**
 * Send teacher approval notification
 * @param {Object} teacher - Teacher object
 * @returns {Promise}
 */
const sendTeacherApprovalEmail = async (teacher) => {
  const { email, name } = teacher;
  
  const content = `
    <h2>Account Approved!</h2>
    <p>Dear ${name},</p>
    <p>Great news! Your teacher account has been approved.</p>
    <div class="highlight">
      <p>You can now access all teacher features including:</p>
      <ul>
        <li>View and manage student progress</li>
        <li>Evaluate challenges</li>
        <li>Generate reports</li>
        <li>Communicate with parents</li>
      </ul>
    </div>
    <a href="${process.env.FRONTEND_URL}/teacher/dashboard" class="button">Access Dashboard</a>
    <p>Welcome to the NEP Workbench teaching community!</p>
  `;
  
  return await sendTemplatedEmail({
    to: email,
    subject: 'Account Approved - NEP Workbench',
    content
  });
};

// ============================================================================
// BULK EMAIL
// ============================================================================

/**
 * Send bulk emails
 * @param {Array} recipients - Array of recipient objects
 * @param {Object} emailOptions - Email options
 * @returns {Promise}
 */
const sendBulkEmail = async (recipients, emailOptions) => {
  const results = {
    success: [],
    failed: []
  };
  
  for (const recipient of recipients) {
    try {
      const result = await sendEmail({
        ...emailOptions,
        to: recipient.email
      });
      
      if (result.success) {
        results.success.push(recipient.email);
      } else {
        results.failed.push({ email: recipient.email, error: result.error });
      }
    } catch (error) {
      results.failed.push({ email: recipient.email, error: error.message });
    }
  }
  
  return results;
};

// ============================================================================
// EMAIL QUEUE (Simple in-memory queue)
// ============================================================================

const emailQueue = [];
let isProcessing = false;

/**
 * Add email to queue
 * @param {Object} emailOptions - Email options
 */
const queueEmail = (emailOptions) => {
  emailQueue.push({
    ...emailOptions,
    queuedAt: new Date()
  });
  
  processEmailQueue();
};

/**
 * Process email queue
 */
const processEmailQueue = async () => {
  if (isProcessing || emailQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  while (emailQueue.length > 0) {
    const emailOptions = emailQueue.shift();
    
    try {
      await sendEmail(emailOptions);
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    } catch (error) {
      console.error('Error processing queued email:', error);
    }
  }
  
  isProcessing = false;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  sendEmail,
  sendTemplatedEmail,
  
  // Authentication
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  
  // Challenges
  sendChallengeEvaluationEmail,
  
  // Reports
  sendNEPReportEmail,
  sendReportToParent,
  
  // Notifications
  sendHelpTicketResponse,
  sendTeacherApprovalEmail,
  
  // Bulk
  sendBulkEmail,
  
  // Queue
  queueEmail,
  processEmailQueue,
  
  // Configuration
  FROM_EMAIL,
  FROM_NAME,
  SUPPORT_EMAIL
};