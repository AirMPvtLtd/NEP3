// models/Parent.js
/**
 * PARENT MODEL
 * Mongoose schema for parents/guardians
 * 
 * @module models/Parent
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { SECURITY } = require('../config/constants');

const parentSchema = new mongoose.Schema({
  // References
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    ref: 'Student',
    index: true
  },
  
  schoolId: {
    type: String,
    required: [true, 'School ID is required'],
    ref: 'School',
    index: true
  },
  
  // Personal Information
  name: {
    type: String,
    required: [true, 'Parent name is required'],
    trim: true
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
  
  relationship: {
    type: String,
    enum: ['Father', 'Mother', 'Guardian', 'Other'],
    default: 'Guardian'
  },
  
  occupation: {
    type: String,
    trim: true
  },
  
  // Preferences
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    weeklyReports: {
      type: Boolean,
      default: true
    },
    challengeAlerts: {
      type: Boolean,
      default: true
    },
    lowPerformanceAlerts: {
      type: Boolean,
      default: true
    }
  },
  
  // Statistics
  stats: {
    totalLogins: {
      type: Number,
      default: 0
    },
    lastViewedReport: {
      type: Date
    }
  },
  
  // Security
  passwordChangedAt: { type: Date },
  passwordResetToken: { type: String, select: false },
  passwordResetExpiry: { type: Date, select: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  
  // Metadata
  lastLogin: { type: Date },
  active: { type: Boolean, default: true }
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

parentSchema.index({ studentId: 1 });
parentSchema.index({ email: 1 });
parentSchema.index({ schoolId: 1 });

// ============================================================================
// MIDDLEWARE
// ============================================================================

parentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SECURITY.BCRYPT_ROUNDS);
  next();
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

parentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

parentSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = SECURITY.ACCOUNT_LOCKOUT.MAX_ATTEMPTS;
  
  if (this.loginAttempts + 1 >= maxAttempts) {
    updates.$set = { lockUntil: Date.now() + SECURITY.ACCOUNT_LOCKOUT.DURATION_MS };
  }
  
  return await this.updateOne(updates);
};

parentSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

parentSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  this.stats.totalLogins++;
  return await this.save({ validateBeforeSave: false });
};

// ============================================================================
// STATIC METHODS
// ============================================================================

parentSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

parentSchema.statics.findByStudent = function(studentId) {
  return this.findOne({ studentId, active: true });
};

// ============================================================================
// TRANSFORM
// ============================================================================

parentSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiry;
    delete ret.__v;
    return ret;
  }
});

const Parent = mongoose.model('Parent', parentSchema);

module.exports = Parent;