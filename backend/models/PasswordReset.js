// models/PasswordReset.js
/**
 * PASSWORD RESET MODEL - COMPLETE PRODUCTION VERSION
 * Store and manage password reset tokens with enhanced security
 * 
 * @module models/PasswordReset
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  
  userType: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'parent'],
    required: true,
    index: true
  },
  
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  schoolId: {
    type: String,
    ref: 'School'
  },
  
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  expiresAt: {
    type: Date,
    required: true,
    default: () => Date.now() + 60 * 60 * 1000, // 1 hour
    index: true
  },
  
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  
  usedAt: {
    type: Date
  },
  
  // Security tracking
  createdFromIP: {
    type: String,
    required: true
  },
  
  usedFromIP: {
    type: String
  },
  
  // Attempt tracking
  verificationAttempts: {
    type: Number,
    default: 0
  },
  
  maxAttempts: {
    type: Number,
    default: 3
  },
  
  // Resend tracking
  resendCount: {
    type: Number,
    default: 0
  },
  
  lastResendAt: Date,
  
  // Device info
  userAgent: String,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'used', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  
  // Revocation
  revokedAt: Date,
  revokedBy: String,
  revocationReason: String,
  
  // Password changed flag
  passwordChanged: {
    type: Boolean,
    default: false
  },
  
  passwordChangedAt: Date
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

passwordResetSchema.index({ email: 1, userType: 1 });
passwordResetSchema.index({ userId: 1, used: 1 });
passwordResetSchema.index({ token: 1 }, { unique: true });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Delete after 24 hours

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Create password reset token
 * @param {String} email - User email
 * @param {String} userType - User type
 * @param {String} userId - User ID
 * @param {Object} options - Additional options (schoolId, ip, userAgent)
 * @returns {String} Plain text token (to send in email)
 */
passwordResetSchema.statics.createToken = async function(email, userType, userId, options = {}) {
  // Check for recent reset requests (rate limiting)
  const recentRequest = await this.findOne({
    email,
    userType,
    userId,
    createdAt: { $gt: Date.now() - 60000 } // Within last minute
  });
  
  if (recentRequest) {
    throw new Error('Please wait before requesting another password reset');
  }
  
  // Check daily limit (prevent abuse)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayCount = await this.countDocuments({
    email,
    userType,
    userId,
    createdAt: { $gte: todayStart }
  });
  
  if (todayCount >= 5) {
    throw new Error('Maximum password reset requests reached for today. Please contact support.');
  }
  
  // Generate random token (32 bytes = 64 hex chars)
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash token for storage (SHA-256)
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Delete any existing unused tokens for this user
  await this.deleteMany({
    email,
    userType,
    userId,
    used: false,
    status: 'pending'
  });
  
  // Create new reset record
  await this.create({
    email,
    userType,
    userId,
    schoolId: options.schoolId,
    token: hashedToken,
    createdFromIP: options.ip || 'unknown',
    userAgent: options.userAgent
  });
  
  return token; // Return plain token (not hashed) to send in email
};

/**
 * Verify and use reset token
 * @param {String} token - Plain text token
 * @param {Object} options - Additional options (ip)
 * @returns {Object} Reset record or error
 */
passwordResetSchema.statics.verifyToken = async function(token, options = {}) {
  // Hash the provided token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Find reset record
  const reset = await this.findOne({
    token: hashedToken,
    used: false,
    status: 'pending',
    expiresAt: { $gt: Date.now() }
  });
  
  if (!reset) {
    // Try to find expired or already used token for better error messages
    const expiredOrUsed = await this.findOne({ token: hashedToken });
    
    if (expiredOrUsed) {
      if (expiredOrUsed.used) {
        return { error: 'already_used', reset: expiredOrUsed };
      }
      if (expiredOrUsed.expiresAt < Date.now()) {
        expiredOrUsed.status = 'expired';
        await expiredOrUsed.save();
        return { error: 'expired', reset: expiredOrUsed };
      }
    }
    
    return { error: 'invalid_token', reset: null };
  }
  
  // Check max attempts
  reset.verificationAttempts++;
  
  if (reset.verificationAttempts > reset.maxAttempts) {
    reset.status = 'revoked';
    reset.revokedAt = new Date();
    reset.revocationReason = 'max_attempts_exceeded';
    await reset.save();
    return { error: 'max_attempts', reset };
  }
  
  // Mark as used
  reset.used = true;
  reset.usedAt = new Date();
  reset.usedFromIP = options.ip;
  reset.status = 'used';
  await reset.save();
  
  return { success: true, reset };
};

/**
 * Mark password as changed
 * @param {String} token - Plain text token
 * @returns {Object} Updated reset record
 */
passwordResetSchema.statics.markPasswordChanged = async function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const reset = await this.findOne({ token: hashedToken });
  
  if (reset) {
    reset.passwordChanged = true;
    reset.passwordChangedAt = new Date();
    await reset.save();
  }
  
  return reset;
};

/**
 * Get reset status
 * @param {String} userId - User ID
 * @returns {Object} Status info
 */
passwordResetSchema.statics.getStatus = async function(userId) {
  const reset = await this.findOne({ userId })
    .sort({ createdAt: -1 });
  
  if (!reset) {
    return { exists: false };
  }
  
  return {
    exists: true,
    used: reset.used,
    status: reset.status,
    expiresAt: reset.expiresAt,
    isExpired: reset.expiresAt < Date.now(),
    attempts: reset.verificationAttempts,
    maxAttempts: reset.maxAttempts,
    passwordChanged: reset.passwordChanged
  };
};

/**
 * Resend password reset token
 * @param {String} email - Email address
 * @param {String} userType - User type
 * @param {String} userId - User ID
 * @param {Object} options - Additional options
 * @returns {String} New token
 */
passwordResetSchema.statics.resendToken = async function(email, userType, userId, options = {}) {
  // Check if recently resent (prevent spam)
  const recent = await this.findOne({
    email,
    userType,
    userId,
    lastResendAt: { $gt: Date.now() - 60000 } // Within last minute
  });
  
  if (recent) {
    throw new Error('Please wait before requesting another password reset email');
  }
  
  // Check resend count
  const existing = await this.findOne({ email, userType, userId })
    .sort({ createdAt: -1 });
  
  if (existing && existing.resendCount >= 3) {
    throw new Error('Maximum resend attempts reached. Please contact support.');
  }
  
  // Create new token
  const token = await this.createToken(email, userType, userId, options);
  
  // Update resend tracking
  if (existing) {
    existing.resendCount++;
    existing.lastResendAt = new Date();
    await existing.save();
  }
  
  return token;
};

/**
 * Revoke reset token
 * @param {String} userId - User ID
 * @param {String} revokedBy - Who revoked it
 * @param {String} reason - Revocation reason
 * @returns {Object} Revoked reset
 */
passwordResetSchema.statics.revokeToken = async function(userId, revokedBy, reason) {
  const reset = await this.findOne({
    userId,
    used: false,
    status: 'pending'
  });
  
  if (!reset) {
    return null;
  }
  
  reset.status = 'revoked';
  reset.revokedAt = new Date();
  reset.revokedBy = revokedBy;
  reset.revocationReason = reason;
  await reset.save();
  
  return reset;
};

/**
 * Revoke all tokens for user
 * @param {String} userId - User ID
 * @param {String} reason - Revocation reason
 * @returns {Number} Number of tokens revoked
 */
passwordResetSchema.statics.revokeAllTokens = async function(userId, reason = 'security_measure') {
  const result = await this.updateMany(
    { userId, used: false, status: 'pending' },
    {
      status: 'revoked',
      revokedAt: new Date(),
      revocationReason: reason
    }
  );
  
  return result.modifiedCount;
};

/**
 * Clean up old reset tokens
 * @param {Number} hoursOld - Hours to keep (default 24)
 * @returns {Object} Delete result
 */
passwordResetSchema.statics.cleanup = async function(hoursOld = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
  
  return await this.deleteMany({
    $or: [
      { createdAt: { $lt: cutoffDate } },
      { expiresAt: { $lt: Date.now() }, used: false }
    ]
  });
};

/**
 * Get statistics
 * @param {String} schoolId - School ID (optional)
 * @returns {Object} Statistics
 */
passwordResetSchema.statics.getStats = async function(schoolId) {
  const query = schoolId ? { schoolId } : {};
  
  const total = await this.countDocuments(query);
  const used = await this.countDocuments({ ...query, used: true });
  const pending = await this.countDocuments({ ...query, used: false, status: 'pending' });
  const expired = await this.countDocuments({ ...query, status: 'expired' });
  const revoked = await this.countDocuments({ ...query, status: 'revoked' });
  const passwordChanged = await this.countDocuments({ ...query, passwordChanged: true });
  
  // Today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayRequests = await this.countDocuments({ 
    ...query,
    createdAt: { $gte: todayStart }
  });
  
  return {
    total,
    used,
    pending,
    expired,
    revoked,
    passwordChanged,
    todayRequests,
    successRate: total > 0 ? (passwordChanged / total * 100) : 0
  };
};

/**
 * Get recent suspicious activity
 * @param {Number} hours - Hours to look back (default 24)
 * @returns {Array} Suspicious activities
 */
passwordResetSchema.statics.getSuspiciousActivity = async function(hours = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);
  
  // Find users with multiple reset attempts
  const pipeline = [
    { $match: { createdAt: { $gte: cutoffDate } } },
    {
      $group: {
        _id: { email: '$email', userType: '$userType' },
        count: { $sum: 1 },
        ips: { $addToSet: '$createdFromIP' }
      }
    },
    { $match: { count: { $gte: 3 } } },
    { $sort: { count: -1 } }
  ];
  
  return await this.aggregate(pipeline);
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if token is expired
 * @returns {Boolean}
 */
passwordResetSchema.methods.isExpired = function() {
  return this.expiresAt < Date.now();
};

/**
 * Check if token is valid
 * @returns {Boolean}
 */
passwordResetSchema.methods.isValid = function() {
  return !this.used && 
         !this.isExpired() && 
         this.status === 'pending' &&
         this.verificationAttempts < this.maxAttempts;
};

/**
 * Get remaining attempts
 * @returns {Number}
 */
passwordResetSchema.methods.getRemainingAttempts = function() {
  return Math.max(0, this.maxAttempts - this.verificationAttempts);
};

/**
 * Get time until expiry
 * @returns {Number} Milliseconds until expiry
 */
passwordResetSchema.methods.getTimeUntilExpiry = function() {
  return Math.max(0, this.expiresAt - Date.now());
};

/**
 * Revoke this token
 * @param {String} revokedBy - Who revoked it
 * @param {String} reason - Revocation reason
 * @returns {Object} This reset
 */
passwordResetSchema.methods.revoke = async function(revokedBy, reason) {
  this.status = 'revoked';
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revocationReason = reason;
  return await this.save();
};

// ============================================================================
// VIRTUALS
// ============================================================================

passwordResetSchema.virtual('isActive').get(function() {
  return !this.used && !this.isExpired() && this.status === 'pending';
});

passwordResetSchema.virtual('expiresInMinutes').get(function() {
  if (this.isExpired()) return 0;
  return Math.ceil(this.getTimeUntilExpiry() / (1000 * 60));
});

passwordResetSchema.virtual('canResend').get(function() {
  if (!this.lastResendAt) return true;
  return (Date.now() - this.lastResendAt) > 60000; // 1 minute
});

passwordResetSchema.virtual('wasSuccessful').get(function() {
  return this.used && this.passwordChanged;
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

passwordResetSchema.pre('save', function(next) {
  // Auto-update status based on expiry
  if (!this.used && this.expiresAt < Date.now() && this.status === 'pending') {
    this.status = 'expired';
  }
  next();
});

// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

passwordResetSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Never expose the token
    delete ret.token;
    delete ret.__v;
    return ret;
  }
});

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

module.exports = PasswordReset;