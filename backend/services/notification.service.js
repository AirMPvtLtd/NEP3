// services/notification.service.js
/**
 * NOTIFICATION SERVICE - COMPLETE PRODUCTION VERSION
 * Push notifications, in-app notifications, and alerts
 * 
 * @module services/notification.service
 */

const { Notification, Student, Teacher, Parent, Admin } = require('../models');
const { sendEmail } = require('./email.service');
const { nanoid } = require('nanoid');

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

const NOTIFICATION_TYPES = {
  // Challenge notifications
  CHALLENGE_GENERATED: 'challenge_generated',
  CHALLENGE_SUBMITTED: 'challenge_submitted',
  CHALLENGE_EVALUATED: 'challenge_evaluated',
  CHALLENGE_DEADLINE: 'challenge_deadline',
  
  // Report notifications
  REPORT_GENERATED: 'report_generated',
  REPORT_SHARED: 'report_shared',
  
  // Help ticket notifications
  TICKET_CREATED: 'ticket_created',
  TICKET_RESPONDED: 'ticket_responded',
  TICKET_RESOLVED: 'ticket_resolved',
  
  // Account notifications
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_APPROVED: 'account_approved',
  ACCOUNT_SUSPENDED: 'account_suspended',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_VERIFIED: 'email_verified',
  
  // Achievement notifications
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  MILESTONE_REACHED: 'milestone_reached',
  STREAK_MAINTAINED: 'streak_maintained',
  
  // System notifications
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  MAINTENANCE_SCHEDULED: 'maintenance_scheduled',
  FEATURE_UPDATE: 'feature_update',
  
  // Parent notifications
  CHILD_PROGRESS: 'child_progress',
  PARENT_MESSAGE: 'parent_message',
  
  // Teacher notifications
  STUDENT_NEEDS_HELP: 'student_needs_help',
  CLASS_SUMMARY: 'class_summary'
};

const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

const NOTIFICATION_CHANNELS = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms'
};

// ============================================================================
// NOTIFICATION CREATION
// ============================================================================

/**
 * Create notification
 * @param {Object} options - Notification options
 * @returns {Promise<Object>}
 */
const createNotification = async (options) => {
  const {
    userId,
    userType,
    type,
    title,
    message,
    data = {},
    priority = NOTIFICATION_PRIORITIES.MEDIUM,
    channels = [NOTIFICATION_CHANNELS.IN_APP],
    actionUrl = null,
    expiresAt = null
  } = options;
  
  const notification = new Notification({
    notificationId: `NOTIF-${nanoid(10).toUpperCase()}`,
    userId,
    userType,
    type,
    title,
    message,
    data,
    priority,
    channels,
    actionUrl,
    expiresAt,
    status: 'unread',
    deliveryStatus: {
      in_app: channels.includes(NOTIFICATION_CHANNELS.IN_APP) ? 'pending' : null,
      email: channels.includes(NOTIFICATION_CHANNELS.EMAIL) ? 'pending' : null,
      push: channels.includes(NOTIFICATION_CHANNELS.PUSH) ? 'pending' : null,
      sms: channels.includes(NOTIFICATION_CHANNELS.SMS) ? 'pending' : null
    }
  });
  
  await notification.save();
  
  // Send via channels
  await deliverNotification(notification);
  
  return notification;
};

/**
 * Create bulk notifications
 * @param {Array} notifications - Array of notification options
 * @returns {Promise<Array>}
 */
const createBulkNotifications = async (notifications) => {
  const created = [];
  
  for (const notifOptions of notifications) {
    try {
      const notification = await createNotification(notifOptions);
      created.push(notification);
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }
  
  return created;
};

// ============================================================================
// NOTIFICATION DELIVERY
// ============================================================================

/**
 * Deliver notification through channels
 * @param {Object} notification - Notification object
 * @returns {Promise}
 */
const deliverNotification = async (notification) => {
  const deliveryResults = {};
  
  // In-app (already stored in database)
  if (notification.channels.includes(NOTIFICATION_CHANNELS.IN_APP)) {
    deliveryResults.in_app = 'delivered';
    notification.deliveryStatus.in_app = 'delivered';
  }
  
  // Email
  if (notification.channels.includes(NOTIFICATION_CHANNELS.EMAIL)) {
    try {
      const user = await getUserByIdAndType(notification.userId, notification.userType);
      
      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: notification.title,
          html: `
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${notification.actionUrl ? `<a href="${notification.actionUrl}">View Details</a>` : ''}
          `
        });
        
        deliveryResults.email = 'delivered';
        notification.deliveryStatus.email = 'delivered';
      }
    } catch (error) {
      console.error('Email delivery failed:', error);
      deliveryResults.email = 'failed';
      notification.deliveryStatus.email = 'failed';
    }
  }
  
  // Push notification (placeholder - integrate with FCM/APNS)
  if (notification.channels.includes(NOTIFICATION_CHANNELS.PUSH)) {
    try {
      // await sendPushNotification(notification);
      deliveryResults.push = 'pending';
      notification.deliveryStatus.push = 'pending';
    } catch (error) {
      console.error('Push delivery failed:', error);
      deliveryResults.push = 'failed';
      notification.deliveryStatus.push = 'failed';
    }
  }
  
  // SMS (placeholder - integrate with Twilio/SNS)
  if (notification.channels.includes(NOTIFICATION_CHANNELS.SMS)) {
    try {
      // await sendSMS(notification);
      deliveryResults.sms = 'pending';
      notification.deliveryStatus.sms = 'pending';
    } catch (error) {
      console.error('SMS delivery failed:', error);
      deliveryResults.sms = 'failed';
      notification.deliveryStatus.sms = 'failed';
    }
  }
  
  await notification.save();
  
  return deliveryResults;
};

/**
 * Get user by ID and type
 * @param {String} userId - User ID
 * @param {String} userType - User type
 * @returns {Promise<Object>}
 */
const getUserByIdAndType = async (userId, userType) => {
  switch (userType) {
    case 'student':
      return await Student.findOne({ studentId: userId });
    case 'teacher':
      return await Teacher.findOne({ teacherId: userId });
    case 'parent':
      return await Parent.findOne({ parentId: userId });
    case 'admin':
      return await Admin.findOne({ adminId: userId });
    default:
      return null;
  }
};

// ============================================================================
// PREDEFINED NOTIFICATIONS
// ============================================================================

/**
 * Notify challenge evaluated
 * @param {Object} student - Student object
 * @param {Object} challenge - Challenge object
 * @returns {Promise<Object>}
 */
const notifyChallengeEvaluated = async (student, challenge) => {
  const score = challenge.evaluation?.score || 0;
  const emoji = score >= 80 ? '🎉' : score >= 60 ? '👍' : '📚';
  
  return await createNotification({
    userId: student.studentId,
    userType: 'student',
    type: NOTIFICATION_TYPES.CHALLENGE_EVALUATED,
    title: `Challenge Evaluated ${emoji}`,
    message: `Your ${challenge.simulationType} challenge has been evaluated. Score: ${score}%`,
    data: {
      challengeId: challenge.challengeId,
      score,
      simulationType: challenge.simulationType
    },
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    actionUrl: `/challenges/${challenge.challengeId}`
  });
};

/**
 * Notify report generated
 * @param {Object} student - Student object
 * @param {Object} report - Report object
 * @returns {Promise<Object>}
 */
const notifyReportGenerated = async (student, report) => {
  return await createNotification({
    userId: student.studentId,
    userType: 'student',
    type: NOTIFICATION_TYPES.REPORT_GENERATED,
    title: '📊 Your NEP Report is Ready',
    message: `Your ${report.reportType} report has been generated and is ready to view.`,
    data: {
      reportId: report.reportId,
      reportType: report.reportType
    },
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    actionUrl: `/reports/${report.reportId}`
  });
};

/**
 * Notify parent about child progress
 * @param {Object} parent - Parent object
 * @param {Object} student - Student object
 * @param {Object} data - Progress data
 * @returns {Promise<Object>}
 */
const notifyParentProgress = async (parent, student, data) => {
  return await createNotification({
    userId: parent.parentId,
    userType: 'parent',
    type: NOTIFICATION_TYPES.CHILD_PROGRESS,
    title: `📈 ${student.name}'s Progress Update`,
    message: data.message || `${student.name} has made progress in their learning journey.`,
    data: {
      studentId: student.studentId,
      studentName: student.name,
      ...data
    },
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    actionUrl: `/parent/students/${student.studentId}`
  });
};

/**
 * Notify help ticket response
 * @param {Object} student - Student object
 * @param {Object} ticket - Ticket object
 * @returns {Promise<Object>}
 */
const notifyHelpTicketResponse = async (student, ticket) => {
  return await createNotification({
    userId: student.studentId,
    userType: 'student',
    type: NOTIFICATION_TYPES.TICKET_RESPONDED,
    title: '💬 Response to Your Help Ticket',
    message: `We've responded to your ticket: ${ticket.subject}`,
    data: {
      ticketId: ticket.ticketId,
      subject: ticket.subject
    },
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    actionUrl: `/tickets/${ticket.ticketId}`
  });
};

/**
 * Notify teacher approval
 * @param {Object} teacher - Teacher object
 * @returns {Promise<Object>}
 */
const notifyTeacherApproved = async (teacher) => {
  return await createNotification({
    userId: teacher.teacherId,
    userType: 'teacher',
    type: NOTIFICATION_TYPES.ACCOUNT_APPROVED,
    title: '✅ Account Approved',
    message: 'Your teacher account has been approved! You can now access all features.',
    data: {
      teacherId: teacher.teacherId
    },
    priority: NOTIFICATION_PRIORITIES.HIGH,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL],
    actionUrl: '/teacher/dashboard'
  });
};

/**
 * Notify achievement unlocked
 * @param {Object} student - Student object
 * @param {Object} achievement - Achievement data
 * @returns {Promise<Object>}
 */
const notifyAchievementUnlocked = async (student, achievement) => {
  return await createNotification({
    userId: student.studentId,
    userType: 'student',
    type: NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED,
    title: `🏆 Achievement Unlocked: ${achievement.name}`,
    message: achievement.description,
    data: {
      achievementId: achievement.id,
      achievementName: achievement.name,
      points: achievement.points
    },
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.IN_APP],
    actionUrl: '/achievements'
  });
};

/**
 * Notify system announcement
 * @param {Array} recipients - Array of {userId, userType}
 * @param {String} title - Announcement title
 * @param {String} message - Announcement message
 * @returns {Promise<Array>}
 */
const notifySystemAnnouncement = async (recipients, title, message) => {
  const notifications = recipients.map(recipient => ({
    userId: recipient.userId,
    userType: recipient.userType,
    type: NOTIFICATION_TYPES.SYSTEM_ANNOUNCEMENT,
    title,
    message,
    priority: NOTIFICATION_PRIORITIES.MEDIUM,
    channels: [NOTIFICATION_CHANNELS.IN_APP, NOTIFICATION_CHANNELS.EMAIL]
  }));
  
  return await createBulkNotifications(notifications);
};

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Get user notifications
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getUserNotifications = async (userId, options = {}) => {
  const {
    status,
    type,
    priority,
    limit = 20,
    skip = 0
  } = options;
  
  const query = { userId };
  if (status) query.status = status;
  if (type) query.type = type;
  if (priority) query.priority = priority;
  
  // Filter out expired
  query.$or = [
    { expiresAt: null },
    { expiresAt: { $gt: new Date() } }
  ];
  
  return await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @returns {Promise<Object>}
 */
const markAsRead = async (notificationId) => {
  const notification = await Notification.findOne({ notificationId });
  if (!notification) {
    throw new Error('Notification not found');
  }
  
  notification.status = 'read';
  notification.readAt = new Date();
  
  await notification.save();
  
  return notification;
};

/**
 * Mark all notifications as read
 * @param {String} userId - User ID
 * @returns {Promise<Object>}
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, status: 'unread' },
    { 
      $set: { 
        status: 'read',
        readAt: new Date()
      }
    }
  );
  
  return result;
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @returns {Promise<Object>}
 */
const deleteNotification = async (notificationId) => {
  const notification = await Notification.findOne({ notificationId });
  if (!notification) {
    throw new Error('Notification not found');
  }
  
  await notification.deleteOne();
  
  return { success: true, message: 'Notification deleted' };
};

/**
 * Get unread count
 * @param {String} userId - User ID
 * @returns {Promise<Number>}
 */
const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({
    userId,
    status: 'unread',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

/**
 * Clean up expired notifications
 * @returns {Promise<Object>}
 */
const cleanupExpiredNotifications = async () => {
  const result = await Notification.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  console.log(`Cleaned up ${result.deletedCount} expired notifications`);
  
  return result;
};

/**
 * Get notification statistics
 * @param {String} userId - User ID (optional)
 * @returns {Promise<Object>}
 */
const getNotificationStats = async (userId = null) => {
  const query = userId ? { userId } : {};
  
  const total = await Notification.countDocuments(query);
  const unread = await Notification.countDocuments({ ...query, status: 'unread' });
  const read = await Notification.countDocuments({ ...query, status: 'read' });
  
  const byType = await Notification.aggregate([
    { $match: query },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  
  const byPriority = await Notification.aggregate([
    { $match: query },
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);
  
  return {
    total,
    unread,
    read,
    byType: byType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    byPriority: byPriority.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {})
  };
};

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Update notification preferences
 * @param {String} userId - User ID
 * @param {Object} preferences - Notification preferences
 * @returns {Promise<Object>}
 */
const updateNotificationPreferences = async (userId, preferences) => {
  const user = await Student.findOne({ studentId: userId }) ||
               await Teacher.findOne({ teacherId: userId }) ||
               await Parent.findOne({ parentId: userId });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  user.notificationPreferences = {
    ...user.notificationPreferences,
    ...preferences
  };
  
  await user.save();
  
  return user.notificationPreferences;
};

// ============================================================================
// SCHEDULED NOTIFICATIONS
// ============================================================================

/**
 * Schedule notification
 * @param {Object} options - Notification options
 * @param {Date} scheduledFor - When to send
 * @returns {Promise<Object>}
 */
const scheduleNotification = async (options, scheduledFor) => {
  const notification = await createNotification({
    ...options,
    status: 'scheduled',
    scheduledFor
  });
  
  return notification;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Creation
  createNotification,
  createBulkNotifications,
  
  // Delivery
  deliverNotification,
  
  // Predefined notifications
  notifyChallengeEvaluated,
  notifyReportGenerated,
  notifyParentProgress,
  notifyHelpTicketResponse,
  notifyTeacherApproved,
  notifyAchievementUnlocked,
  notifySystemAnnouncement,
  
  // Management
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  cleanupExpiredNotifications,
  getNotificationStats,
  
  // Preferences
  updateNotificationPreferences,
  
  // Scheduling
  scheduleNotification,
  
  // Constants
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_CHANNELS
};