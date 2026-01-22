// services/notification.service.js
/**
 * NOTIFICATION SERVICE - FIXED
 */

const { 
  Notification,  // ✅ Now exported
  Student, 
  Teacher, 
  Parent, 
  School        // ✅ CHANGE: Admin → School
} = require('../models');

const { sendEmail } = require('./email.service');
const { nanoid } = require('nanoid');
const logger = require('../utils/logger');

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  CHALLENGE: 'challenge',
  REPORT: 'report',
  ACHIEVEMENT: 'achievement',
  REMINDER: 'reminder',
  SYSTEM: 'system'
};

// ============================================================================
// CREATE NOTIFICATION
// ============================================================================

const createNotification = async ({
  userId,
  userType,
  type,
  title,
  message,
  actionUrl = null,
  metadata = {}
}) => {
  try {
    const notification = await Notification.create({
      notificationId: `NOTIF-${nanoid(10)}`,
      userId,
      userType,
      type,
      title,
      message,
      actionUrl,
      metadata,
      read: false,
      createdAt: new Date()
    });

    logger.info(`Notification created: ${notification.notificationId} for ${userType} ${userId}`);

    return {
      success: true,
      notification
    };
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

// ============================================================================
// SEND NOTIFICATION (CREATE + EMAIL)
// ============================================================================

const sendNotification = async ({
  userId,
  userType,
  type,
  title,
  message,
  actionUrl = null,
  sendEmail: shouldSendEmail = false,
  metadata = {}
}) => {
  try {
    // Create in-app notification
    const notification = await createNotification({
      userId,
      userType,
      type,
      title,
      message,
      actionUrl,
      metadata
    });

    // Send email if requested
    if (shouldSendEmail) {
      const user = await getUserByIdAndType(userId, userType);
      
      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: title,
          html: `
            <h2>${title}</h2>
            <p>${message}</p>
            ${actionUrl ? `<p><a href="${actionUrl}">View Details</a></p>` : ''}
          `
        });
      }
    }

    return notification;
  } catch (error) {
    logger.error('Send notification error:', error);
    throw error;
  }
};

// ============================================================================
// GET USER NOTIFICATIONS
// ============================================================================

const getUserNotifications = async (userId, { 
  unreadOnly = false, 
  limit = 50, 
  skip = 0 
} = {}) => {
  try {
    const query = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    return {
      success: true,
      notifications,
      pagination: {
        total,
        limit,
        skip,
        hasMore: total > skip + limit
      },
      unreadCount
    };
  } catch (error) {
    logger.error('Get notifications error:', error);
    throw error;
  }
};

// ============================================================================
// MARK AS READ
// ============================================================================

const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { notificationId, userId },
      {
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    return {
      success: true,
      notification
    };
  } catch (error) {
    logger.error('Mark as read error:', error);
    throw error;
  }
};

// ============================================================================
// MARK ALL AS READ
// ============================================================================

const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      {
        read: true,
        readAt: new Date()
      }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    logger.error('Mark all as read error:', error);
    throw error;
  }
};

// ============================================================================
// DELETE NOTIFICATION
// ============================================================================

const deleteNotification = async (notificationId, userId) => {
  try {
    const result = await Notification.deleteOne({ 
      notificationId, 
      userId 
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }

    return {
      success: true,
      deleted: true
    };
  } catch (error) {
    logger.error('Delete notification error:', error);
    throw error;
  }
};

// ============================================================================
// GET UNREAD COUNT
// ============================================================================

const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    return {
      success: true,
      count
    };
  } catch (error) {
    logger.error('Get unread count error:', error);
    throw error;
  }
};

// ============================================================================
// SEND BULK NOTIFICATIONS
// ============================================================================

const sendBulkNotifications = async (notifications) => {
  try {
    const results = [];

    for (const notif of notifications) {
      try {
        const result = await sendNotification(notif);
        results.push({ success: true, notification: result.notification });
      } catch (error) {
        results.push({ 
          success: false, 
          userId: notif.userId, 
          error: error.message 
        });
      }
    }

    return {
      success: true,
      results,
      total: notifications.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    logger.error('Send bulk notifications error:', error);
    throw error;
  }
};

// ============================================================================
// HELPER: GET USER BY ID AND TYPE
// ============================================================================

const getUserByIdAndType = async (userId, userType) => {
  try {
    let user;
    
    switch (userType) {
      case 'student':
        user = await Student.findById(userId).select('email name');
        break;
      case 'teacher':
        user = await Teacher.findById(userId).select('email name');
        break;
      case 'parent':
        user = await Parent.findById(userId).select('email name');
        break;
      case 'admin':
        user = await School.findById(userId).select('adminEmail schoolName'); // ✅ FIXED
        if (user) {
          user.email = user.adminEmail; // Map to email
          user.name = user.schoolName;
        }
        break;
      default:
        throw new Error('Invalid user type');
    }

    return user;
  } catch (error) {
    logger.error('Get user error:', error);
    return null;
  }
};

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

const notificationTemplates = {
  challengeCompleted: (studentName, score) => ({
    type: NOTIFICATION_TYPES.SUCCESS,
    title: 'Challenge Completed!',
    message: `${studentName} completed a challenge with ${score}% score.`
  }),
  
  reportGenerated: (studentName, reportId) => ({
    type: NOTIFICATION_TYPES.INFO,
    title: 'NEP Report Generated',
    message: `Progress report for ${studentName} is ready.`,
    actionUrl: `/reports/${reportId}`
  }),
  
  achievementUnlocked: (achievementName) => ({
    type: NOTIFICATION_TYPES.ACHIEVEMENT,
    title: 'Achievement Unlocked!',
    message: `Congratulations! You earned: ${achievementName}`
  }),
  
  reminderPending: (itemName) => ({
    type: NOTIFICATION_TYPES.REMINDER,
    title: 'Reminder',
    message: `You have a pending ${itemName}`
  })
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createNotification,
  sendNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  sendBulkNotifications,
  notificationTemplates,
  NOTIFICATION_TYPES
};