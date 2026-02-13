// models/Student.js
/**
 * STUDENT MODEL
 * Mongoose schema for students with NEP competencies
 * 
 * @module models/Student
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');
const { SECURITY, NEP_COMPETENCIES, CLASS_LEVELS } = require('../config/constants');

const studentSchema = new mongoose.Schema({
  // Unique Student Identifier
  studentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `STU-${nanoid(5).toUpperCase()}`
  },
  
  // References
  schoolId: {
    type: String,
    required: [true, 'School ID is required'],
    ref: 'School',
    index: true
  },
  
  teacherId: {
    type: String,
    required: [true, 'Teacher ID is required'],
    ref: 'Teacher',
    index: true
  },
  
  classSectionId: {
    type: String,
    ref: 'ClassSection',
    index: true
  },
  
  // Personal Information
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  class: {
    type: Number,
    required: [true, 'Class is required'],
    enum: CLASS_LEVELS,
    min: 6,
    max: 12
  },
  
  section: {
    type: String,
    required: [true, 'Section is required'],
    uppercase: true
  },
  
  rollNumber: {
    type: Number,
    required: [true, 'Roll number is required'],
    min: 1
  },
  
  dateOfBirth: {
    type: Date
  },
  
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  // Parent Information
  parentEmail: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid parent email']
  },
  
  parentPassword: {
    type: String,
    select: false
  },
  
  parentPhone: {
    type: String,
    trim: true
  },
  
  guardianName: {
    type: String,
    trim: true
  },
  
  // Performance Index (SPI)
  performanceIndex: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  lastSPIUpdate: {
    type: Date
  },
  
  // NEP 2020 Competency Scores (12 competencies)
  competencyScores: {
    'critical-thinking': { type: Number, default: 0, min: 0, max: 100 },
    'problem-solving': { type: Number, default: 0, min: 0, max: 100 },
    'scientific-temper': { type: Number, default: 0, min: 0, max: 100 },
    'analytical-reasoning': { type: Number, default: 0, min: 0, max: 100 },
    'creativity': { type: Number, default: 0, min: 0, max: 100 },
    'communication': { type: Number, default: 0, min: 0, max: 100 },
    'collaboration': { type: Number, default: 0, min: 0, max: 100 },
    'digital-literacy': { type: Number, default: 0, min: 0, max: 100 },
    'social-responsibility': { type: Number, default: 0, min: 0, max: 100 },
    'innovation': { type: Number, default: 0, min: 0, max: 100 },
    'ethical-awareness': { type: Number, default: 0, min: 0, max: 100 },
    'cultural-understanding': { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Challenge History (last 20 challenges for rolling average)
  recentChallenges: [{
    challengeId: String,
    score: { type: Number, min: 0, max: 100 },
    simulationType: String,
    completedAt: { type: Date, default: Date.now }
  }],
  
  // Consistency Metrics
  stats: {
    dailyStreak: {
      type: Number,
      default: 0
    },
    lastActivityDate: {
      type: Date
    },
    weeklyActivity: {
      type: Number, // Number of active days this week
      default: 0
    },
    totalChallenges: {
      type: Number,
      default: 0
    },
    totalChallengesCompleted: {
      type: Number,
      default: 0
    },
    averageChallengeScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Challenge Limits (per day tracking)
  challengeLimits: {
    date: {
      type: Date,
      default: Date.now
    },
    totalToday: {
      type: Number,
      default: 0
    },
    bySimulation: {
      type: Map,
      of: Number,
      default: new Map()
    }
  },
  
  // Weak Competencies (for targeted improvement)
  weakCompetencies: [{
    type: String,
    enum: NEP_COMPETENCIES
  }],
  
  // Strong Competencies
  strongCompetencies: [{
    type: String,
    enum: NEP_COMPETENCIES
  }],
  
  // Status
  active: {
    type: Boolean,
    default: true
  },
  
  // Security
  passwordChangedAt: { type: Date },
  passwordResetToken: { type: String, select: false },
  passwordResetExpiry: { type: Date, select: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  
  // Metadata
  profilePicture: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

studentSchema.index({ studentId: 1 });
studentSchema.index({ schoolId: 1, class: 1, section: 1, rollNumber: 1 }, { unique: true });
studentSchema.index({ teacherId: 1 });
studentSchema.index({ performanceIndex: -1 });
studentSchema.index({ 'stats.dailyStreak': -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

studentSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

studentSchema.virtual('grade').get(function() {
  const spi = this.performanceIndex;
  if (spi >= 90) return 'A+';
  if (spi >= 80) return 'A';
  if (spi >= 70) return 'B';
  if (spi >= 60) return 'C';
  if (spi >= 50) return 'D';
  return 'F';
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

studentSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(
    this.password,
    SECURITY.BCRYPT_ROUNDS
  );
});

studentSchema.pre('save', async function () {
  if (!this.isModified('parentPassword') || !this.parentPassword) return;

  this.parentPassword = await bcrypt.hash(
    this.parentPassword,
    SECURITY.BCRYPT_ROUNDS
  );
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

studentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

studentSchema.methods.compareParentPassword = async function(candidatePassword) {
  if (!this.parentPassword) return false;
  return await bcrypt.compare(candidatePassword, this.parentPassword);
};

studentSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = SECURITY.ACCOUNT_LOCKOUT.MAX_ATTEMPTS;
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + SECURITY.ACCOUNT_LOCKOUT.DURATION_MS };
  }
  
  return await this.updateOne(updates);
};

studentSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

studentSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return await this.save({ validateBeforeSave: false });
};

/**
 * Update competency score with exponential smoothing
 */
studentSchema.methods.updateCompetency = async function(competency, newScore) {
  if (!NEP_COMPETENCIES.includes(competency)) return;
  
  const oldScore = this.competencyScores[competency] || 50;
  // Exponential smoothing: new = old * 0.8 + new * 0.2
  this.competencyScores[competency] = (oldScore * 0.8) + (newScore * 0.2);
  
  await this.identifyWeakStrong();
  return await this.save();
};

/**
 * Identify weak and strong competencies
 */
studentSchema.methods.identifyWeakStrong = function() {
  const scores = Object.entries(this.competencyScores)
    .map(([comp, score]) => ({ comp, score }))
    .sort((a, b) => a.score - b.score);
  
  this.weakCompetencies = scores.slice(0, 3).map(s => s.comp);
  this.strongCompetencies = scores.slice(-3).map(s => s.comp);
};

/**
 * Add challenge to history (keep last 20)
 */
studentSchema.methods.addChallengeResult = async function(challengeId, score, simulationType) {
  this.recentChallenges.push({ challengeId, score, simulationType });
  
  // Keep only last 20
  if (this.recentChallenges.length > 20) {
    this.recentChallenges = this.recentChallenges.slice(-20);
  }
  
  this.stats.totalChallengesCompleted++;
  
  // Update average
  const total = this.recentChallenges.reduce((sum, ch) => sum + ch.score, 0);
  this.stats.averageChallengeScore = total / this.recentChallenges.length;
  
  return await this.save();
};

/**
 * Update daily streak
 */
studentSchema.methods.updateStreak = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!this.stats.lastActivityDate) {
    this.stats.dailyStreak = 1;
  } else {
    const lastActivity = new Date(this.stats.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, no change
    } else if (daysDiff === 1) {
      // Consecutive day
      this.stats.dailyStreak++;
    } else {
      // Streak broken
      this.stats.dailyStreak = 1;
    }
  }
  
  this.stats.lastActivityDate = new Date();
  return await this.save();
};

/**
 * Check if can generate challenge
 */
studentSchema.methods.canGenerateChallenge = function(simulationType, dailyLimit = 10, simLimit = 3) {
  const today = new Date().toISOString().split('T')[0];
  const limitDate = this.challengeLimits.date ? 
    new Date(this.challengeLimits.date).toISOString().split('T')[0] : null;
  
  // Reset if new day
  if (limitDate !== today) {
    return { allowed: true, remaining: { daily: dailyLimit, simulation: simLimit } };
  }
  
  // Check daily limit
  if (this.challengeLimits.totalToday >= dailyLimit) {
    return { allowed: false, reason: 'daily_limit', remaining: 0 };
  }
  
  // Check simulation limit
  const simCount = this.challengeLimits.bySimulation.get(simulationType) || 0;
  if (simCount >= simLimit) {
    return { 
      allowed: false, 
      reason: 'simulation_limit',
      remaining: dailyLimit - this.challengeLimits.totalToday
    };
  }
  
  return { 
    allowed: true,
    remaining: {
      daily: dailyLimit - this.challengeLimits.totalToday,
      simulation: simLimit - simCount
    }
  };
};

/**
 * Record challenge generation
 */
studentSchema.methods.recordChallengeGeneration = async function(simulationType) {
  const today = new Date();
  const limitDate = this.challengeLimits.date ? new Date(this.challengeLimits.date) : null;
  
  // Reset if new day
  if (!limitDate || limitDate.toISOString().split('T')[0] !== today.toISOString().split('T')[0]) {
    this.challengeLimits.date = today;
    this.challengeLimits.totalToday = 1;
    this.challengeLimits.bySimulation = new Map([[simulationType, 1]]);
  } else {
    this.challengeLimits.totalToday++;
    const currentCount = this.challengeLimits.bySimulation.get(simulationType) || 0;
    this.challengeLimits.bySimulation.set(simulationType, currentCount + 1);
  }
  
  this.stats.totalChallenges++;
  return await this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

studentSchema.statics.findByStudentId = function(studentId) {
  return this.findOne({ studentId });
};

studentSchema.statics.getByTeacher = function(teacherId) {
  return this.find({ teacherId, active: true });
};

studentSchema.statics.getByClass = function(schoolId, classNum, section) {
  return this.find({ schoolId, class: classNum, section, active: true });
};

studentSchema.statics.getTopPerformers = function(schoolId, limit = 10) {
  return this.find({ schoolId, active: true })
    .sort({ performanceIndex: -1 })
    .limit(limit);
};

// ============================================================================
// TRANSFORM
// ============================================================================

studentSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.parentPassword;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiry;
    delete ret.__v;
    return ret;
  }
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;