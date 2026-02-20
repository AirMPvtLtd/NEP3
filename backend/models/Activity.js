// models/Activity.js
/**
 * ACTIVITY MODEL
 * Mongoose schema for activity/audit logging
 * 
 * @module models/Activity
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // User Information
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  userType: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'parent'],
    required: true,
    index: true
  },
  
  schoolId: {
    type: String,
    ref: 'School',
    index: true
  },
  
  // Activity Details
  activityType: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'challenge_generated',
      'challenge_submitted',
      'challenge_evaluated',
      'student_created',
      'teacher_approved',
      'teacher_rejected',
      'password_changed',
      'password_reset',
      'email_sent',
      'report_generated',
      'profile_updated',
      'settings_changed',
      'data_exported',
      'report_downloaded',
      'report_viewed',
      'report_shared',
      'report_verified',
      'password_reset_request',
      'registration',
      'parent_message',
      'challenge_started',
      'score_override',
      'batch_report_started',
      'batch_report_completed',
      'batch_verification',
      'email_verification',
      'external_verification',
      'other'
    ],
    index: true
  },
  
  action: {
    type: String,
    required: true
  },
  
  description: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request Information
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  // Result
  success: {
    type: Boolean,
    default: true
  },
  
  errorMessage: {
    type: String
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // Using timestamp field instead
});

// ============================================================================
// INDEXES
// ============================================================================

activitySchema.index({ userId: 1, timestamp: -1 });
activitySchema.index({ schoolId: 1, timestamp: -1 });
activitySchema.index({ activityType: 1, timestamp: -1 });
activitySchema.index({ timestamp: -1 });

// TTL Index - Retain activities for 5 years (longitudinal research data)
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 157680000 }); // 5 years

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Log activity
 */
activitySchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
};

/**
 * Get user activities
 */
activitySchema.statics.getUserActivities = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get school activities
 */
activitySchema.statics.getSchoolActivities = function(schoolId, limit = 100) {
  return this.find({ schoolId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get activities by type
 */
activitySchema.statics.getByType = function(activityType, limit = 100) {
  return this.find({ activityType })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get failed activities
 */
activitySchema.statics.getFailedActivities = function(schoolId, limit = 50) {
  return this.find({ schoolId, success: false })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get statistics
 */
activitySchema.statics.getStatistics = async function(schoolId, days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        schoolId,
        timestamp: { $gte: date }
      }
    },
    {
      $group: {
        _id: '$activityType',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: ['$success', 1, 0] }
        },
        failureCount: {
          $sum: { $cond: ['$success', 0, 1] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  return stats;
};

/**
 * Get daily activity count
 */
activitySchema.statics.getDailyCount = async function(schoolId, days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        schoolId,
        timestamp: { $gte: date }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  return stats;
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;