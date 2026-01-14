// models/School.js
/**
 * SCHOOL MODEL
 * Mongoose schema for schools/institutions
 * 
 * @module models/School
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { SECURITY } = require('../config/constants');

const schoolSchema = new mongoose.Schema({
  // Unique School Identifier
  schoolId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `SCH-${new Date().getFullYear()}-${nanoid(5).toUpperCase()}`
  },
  
  // School Information
  schoolName: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    minlength: [3, 'School name must be at least 3 characters'],
    maxlength: [200, 'School name cannot exceed 200 characters']
  },
  
  schoolAddress: {
    type: String,
    required: [true, 'School address is required'],
    trim: true
  },
  
  city: {
    type: String,
    trim: true
  },
  
  state: {
    type: String,
    trim: true
  },
  
  pincode: {
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Please enter a valid 6-digit pincode']
  },
  
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  
  website: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Admin Information
  adminName: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true
  },
  
  adminEmail: {
    type: String,
    required: [true, 'Admin email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  adminPassword: {
    type: String,
    required: [true, 'Admin password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password in queries by default
  },
  
  adminPhone: {
    type: String,
    trim: true
  },
  
  // Verification & Status
  verified: {
    type: Boolean,
    default: false
  },
  
  verificationToken: {
    type: String,
    select: false
  },
  
  verificationTokenExpiry: {
    type: Date,
    select: false
  },
  
  active: {
    type: Boolean,
    default: true
  },
  
  // Subscription & Limits
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  
  subscriptionStartDate: {
    type: Date
  },
  
  subscriptionEndDate: {
    type: Date
  },
  
  limits: {
    maxTeachers: {
      type: Number,
      default: 10
    },
    maxStudents: {
      type: Number,
      default: 100
    },
    maxClasses: {
      type: Number,
      default: 5
    }
  },
  
  // Statistics
  stats: {
    totalTeachers: {
      type: Number,
      default: 0
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    totalChallenges: {
      type: Number,
      default: 0
    }
  },
  
  // Settings
  settings: {
    enableEmailNotifications: {
      type: Boolean,
      default: true
    },
    enableParentAccess: {
      type: Boolean,
      default: true
    },
    enableAIEvaluation: {
      type: Boolean,
      default: true
    },
    challengeDailyLimit: {
      type: Number,
      default: 10
    },
    challengePerSimLimit: {
      type: Number,
      default: 3
    }
  },
  
  // Security
  passwordChangedAt: {
    type: Date
  },
  
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpiry: {
    type: Date,
    select: false
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  // Metadata
  lastLogin: {
    type: Date
  },
  
  createdBy: {
    type: String,
    default: 'self-registration'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

schoolSchema.index({ schoolId: 1 });
schoolSchema.index({ adminEmail: 1 });
schoolSchema.index({ verified: 1, active: 1 });
schoolSchema.index({ createdAt: -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for teachers (populated)
schoolSchema.virtual('teachers', {
  ref: 'Teacher',
  localField: 'schoolId',
  foreignField: 'schoolId'
});

// Virtual for students (populated)
schoolSchema.virtual('students', {
  ref: 'Student',
  localField: 'schoolId',
  foreignField: 'schoolId'
});

// Virtual for account locked status
schoolSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ============================================================================
// MIDDLEWARE (Pre-save hooks)
// ============================================================================

// Hash password before saving
schoolSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('adminPassword')) return next();
  
  try {
    // Hash password
    this.adminPassword = await bcrypt.hash(
      this.adminPassword,
      SECURITY.BCRYPT_ROUNDS
    );
    next();
  } catch (error) {
    next(error);
  }
});

// Update passwordChangedAt when password is modified
schoolSchema.pre('save', function(next) {
  if (!this.isModified('adminPassword') || this.isNew) return next();
  
  // Set passwordChangedAt to 1 second ago to ensure JWT is created after
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Compare password with hashed password
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
schoolSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.adminPassword);
};

/**
 * Check if password was changed after JWT was issued
 * @param {number} JWTTimestamp - JWT issued timestamp
 * @returns {boolean} True if password was changed
 */
schoolSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Increment login attempts
 * @returns {Promise<void>}
 */
schoolSchema.methods.incLoginAttempts = async function() {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account if max attempts reached
  const maxAttempts = SECURITY.ACCOUNT_LOCKOUT.MAX_ATTEMPTS;
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { 
      lockUntil: Date.now() + SECURITY.ACCOUNT_LOCKOUT.DURATION_MS 
    };
  }
  
  return await this.updateOne(updates);
};

/**
 * Reset login attempts
 * @returns {Promise<void>}
 */
schoolSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

/**
 * Update last login timestamp
 * @returns {Promise<void>}
 */
schoolSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save({ validateBeforeSave: false });
};

/**
 * Check if subscription is active
 * @returns {boolean} True if subscription is active
 */
schoolSchema.methods.hasActiveSubscription = function() {
  if (!this.subscriptionEndDate) return false;
  return this.subscriptionEndDate > new Date();
};

/**
 * Check if can add more teachers
 * @returns {boolean} True if can add more teachers
 */
schoolSchema.methods.canAddTeacher = function() {
  return this.stats.totalTeachers < this.limits.maxTeachers;
};

/**
 * Check if can add more students
 * @returns {boolean} True if can add more students
 */
schoolSchema.methods.canAddStudent = function() {
  return this.stats.totalStudents < this.limits.maxStudents;
};

/**
 * Increment teacher count
 * @returns {Promise<void>}
 */
schoolSchema.methods.incrementTeacherCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalTeachers': 1 } });
};

/**
 * Decrement teacher count
 * @returns {Promise<void>}
 */
schoolSchema.methods.decrementTeacherCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalTeachers': -1 } });
};

/**
 * Increment student count
 * @returns {Promise<void>}
 */
schoolSchema.methods.incrementStudentCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalStudents': 1 } });
};

/**
 * Decrement student count
 * @returns {Promise<void>}
 */
schoolSchema.methods.decrementStudentCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalStudents': -1 } });
};

/**
 * Increment challenge count
 * @returns {Promise<void>}
 */
schoolSchema.methods.incrementChallengeCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalChallenges': 1 } });
};

/**
 * Generate verification token
 * @returns {string} Verification token
 */
schoolSchema.methods.generateVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return token;
};

/**
 * Generate password reset token
 * @returns {string} Reset token
 */
schoolSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.passwordResetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  
  return token;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find school by email
 * @param {string} email - Admin email
 * @returns {Promise<Object>} School object
 */
schoolSchema.statics.findByEmail = function(email) {
  return this.findOne({ adminEmail: email.toLowerCase() });
};

/**
 * Find school by ID
 * @param {string} schoolId - School ID
 * @returns {Promise<Object>} School object
 */
schoolSchema.statics.findBySchoolId = function(schoolId) {
  return this.findOne({ schoolId });
};

/**
 * Get active schools
 * @returns {Promise<Array>} Array of active schools
 */
schoolSchema.statics.getActiveSchools = function() {
  return this.find({ active: true, verified: true });
};

/**
 * Get school statistics
 * @returns {Promise<Object>} Aggregated statistics
 */
schoolSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalSchools: { $sum: 1 },
        verifiedSchools: {
          $sum: { $cond: ['$verified', 1, 0] }
        },
        activeSchools: {
          $sum: { $cond: ['$active', 1, 0] }
        },
        totalTeachers: { $sum: '$stats.totalTeachers' },
        totalStudents: { $sum: '$stats.totalStudents' },
        totalChallenges: { $sum: '$stats.totalChallenges' }
      }
    }
  ]);
  
  return stats[0] || {
    totalSchools: 0,
    verifiedSchools: 0,
    activeSchools: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalChallenges: 0
  };
};

// ============================================================================
// TRANSFORM (Remove sensitive data from JSON)
// ============================================================================

schoolSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    // Remove sensitive fields
    delete ret.adminPassword;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiry;
    delete ret.verificationToken;
    delete ret.verificationTokenExpiry;
    delete ret.__v;
    
    return ret;
  }
});

// ============================================================================
// MODEL EXPORT
// ============================================================================

const School = mongoose.model('School', schoolSchema);

module.exports = School;