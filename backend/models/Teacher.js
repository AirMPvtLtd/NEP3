// models/Teacher.js
/**
 * TEACHER MODEL
 * Mongoose schema for teachers
 * 
 * @module models/Teacher
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { SECURITY, USER_STATUS, SUBJECTS } = require('../config/constants');

const teacherSchema = new mongoose.Schema({
  // Unique Teacher Identifier
  teacherId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `TCH-${nanoid(5).toUpperCase()}`
  },
  
  // School Reference
  schoolId: {
    type: String,
    required: [true, 'School ID is required'],
    ref: 'School',
    index: true
  },
  
  // Personal Information
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  
  employeeId: {
    type: String,
    trim: true
  },
  
  // Professional Information
  subjects: [{
    type: String,
    enum: SUBJECTS,
    required: true
  }],
  
  specialization: {
    type: String,
    trim: true
  },
  
  qualification: {
    type: String,
    trim: true
  },
  
  experience: {
    type: Number, // Years of experience
    min: 0
  },
  
  // Classes Teaching
  classesTaught: [{
    class: {
      type: Number,
      min: 6,
      max: 12
    },
    sections: [{
      type: String,
      match: /^[A-H]$/
    }]
  }],
  
  // Status & Verification
  status: {
    type: String,
    enum: Object.values(USER_STATUS),
    default: USER_STATUS.PENDING
  },
  
  approvedBy: {
    type: String,
    ref: 'School'
  },
  
  approvedAt: {
    type: Date
  },
  
  rejectedReason: {
    type: String
  },
  
  active: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  stats: {
    totalStudents: {
      type: Number,
      default: 0
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    totalChallengesCreated: {
      type: Number,
      default: 0
    },
    totalChallengesEvaluated: {
      type: Number,
      default: 0
    }
  },
  
  // Preferences & Settings
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    challengeNotifications: {
      type: Boolean,
      default: true
    },
    weeklyReport: {
      type: Boolean,
      default: true
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
  
  profilePicture: {
    type: String // URL to profile picture
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

teacherSchema.index({ teacherId: 1 });
teacherSchema.index({ schoolId: 1, email: 1 });
teacherSchema.index({ status: 1, active: 1 });
teacherSchema.index({ subjects: 1 });
teacherSchema.index({ createdAt: -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

// Virtual for students
teacherSchema.virtual('students', {
  ref: 'Student',
  localField: 'teacherId',
  foreignField: 'teacherId'
});

// Virtual for challenges
teacherSchema.virtual('challenges', {
  ref: 'Challenge',
  localField: 'teacherId',
  foreignField: 'teacherId'
});

// Virtual for account locked status
teacherSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for approved status
teacherSchema.virtual('isApproved').get(function() {
  return this.status === USER_STATUS.APPROVED;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Hash password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, SECURITY.BCRYPT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

// Update passwordChangedAt
teacherSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Compare password
 */
teacherSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if password changed after JWT issued
 */
teacherSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

/**
 * Increment login attempts
 */
teacherSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
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
 */
teacherSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

/**
 * Update last login
 */
teacherSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save({ validateBeforeSave: false });
};

/**
 * Approve teacher
 */
teacherSchema.methods.approve = async function(approvedBySchoolId) {
  this.status = USER_STATUS.APPROVED;
  this.approvedBy = approvedBySchoolId;
  this.approvedAt = new Date();
  return await this.save();
};

/**
 * Reject teacher
 */
teacherSchema.methods.reject = async function(reason) {
  this.status = USER_STATUS.REJECTED;
  this.rejectedReason = reason;
  return await this.save();
};

/**
 * Suspend teacher
 */
teacherSchema.methods.suspend = async function() {
  this.status = USER_STATUS.SUSPENDED;
  this.active = false;
  return await this.save();
};

/**
 * Reactivate teacher
 */
teacherSchema.methods.reactivate = async function() {
  this.status = USER_STATUS.APPROVED;
  this.active = true;
  return await this.save();
};

/**
 * Increment student count
 */
teacherSchema.methods.incrementStudentCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalStudents': 1 } });
};

/**
 * Decrement student count
 */
teacherSchema.methods.decrementStudentCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalStudents': -1 } });
};

/**
 * Increment challenge count
 */
teacherSchema.methods.incrementChallengeCount = async function() {
  return await this.updateOne({ $inc: { 'stats.totalChallengesCreated': 1 } });
};

/**
 * Check if teaches class
 */
teacherSchema.methods.teachesClass = function(classNum, section) {
  return this.classesTaught.some(ct => 
    ct.class === classNum && 
    (!section || ct.sections.includes(section))
  );
};

/**
 * Add class to teaching
 */
teacherSchema.methods.addClass = async function(classNum, section) {
  const existing = this.classesTaught.find(ct => ct.class === classNum);
  
  if (existing) {
    if (!existing.sections.includes(section)) {
      existing.sections.push(section);
    }
  } else {
    this.classesTaught.push({
      class: classNum,
      sections: [section]
    });
  }
  
  this.stats.totalClasses = this.classesTaught.length;
  return await this.save();
};

/**
 * Remove class from teaching
 */
teacherSchema.methods.removeClass = async function(classNum, section) {
  const classIndex = this.classesTaught.findIndex(ct => ct.class === classNum);
  
  if (classIndex !== -1) {
    const classObj = this.classesTaught[classIndex];
    
    if (section) {
      classObj.sections = classObj.sections.filter(s => s !== section);
      if (classObj.sections.length === 0) {
        this.classesTaught.splice(classIndex, 1);
      }
    } else {
      this.classesTaught.splice(classIndex, 1);
    }
  }
  
  this.stats.totalClasses = this.classesTaught.length;
  return await this.save();
};

/**
 * Generate password reset token
 */
teacherSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  this.passwordResetExpiry = Date.now() + 60 * 60 * 1000;
  
  return token;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find by email
 */
teacherSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find by teacher ID
 */
teacherSchema.statics.findByTeacherId = function(teacherId) {
  return this.findOne({ teacherId });
};

/**
 * Get pending teachers for school
 */
teacherSchema.statics.getPendingForSchool = function(schoolId) {
  return this.find({ schoolId, status: USER_STATUS.PENDING });
};

/**
 * Get approved teachers for school
 */
teacherSchema.statics.getApprovedForSchool = function(schoolId) {
  return this.find({ schoolId, status: USER_STATUS.APPROVED, active: true });
};

/**
 * Get teachers by subject
 */
teacherSchema.statics.getBySubject = function(schoolId, subject) {
  return this.find({ 
    schoolId, 
    subjects: subject,
    status: USER_STATUS.APPROVED,
    active: true
  });
};

/**
 * Get statistics for school
 */
teacherSchema.statics.getSchoolStatistics = async function(schoolId) {
  const stats = await this.aggregate([
    { $match: { schoolId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', USER_STATUS.APPROVED] }, 1, 0] }
        },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', USER_STATUS.PENDING] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', USER_STATUS.REJECTED] }, 1, 0] }
        },
        totalStudents: { $sum: '$stats.totalStudents' },
        totalChallenges: { $sum: '$stats.totalChallengesCreated' }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    totalStudents: 0,
    totalChallenges: 0
  };
};

// ============================================================================
// TRANSFORM
// ============================================================================

teacherSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiry;
    delete ret.__v;
    return ret;
  }
});

// ============================================================================
// MODEL EXPORT
// ============================================================================

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;