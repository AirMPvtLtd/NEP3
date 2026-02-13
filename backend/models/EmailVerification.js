// models/EmailVerification.js
/**
 * EMAIL VERIFICATION MODEL - COMPLETE PRODUCTION VERSION
 * Store and manage email verification tokens with enhanced security
 * 
 * @module models/EmailVerification
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const emailVerificationSchema = new mongoose.Schema({
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
    default: () => Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    index: true
  },
  
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  
  verifiedAt: {
    type: Date
  },
  
  // Track attempts
  verificationAttempts: {
    type: Number,
    default: 0
  },
  
  maxAttempts: {
    type: Number,
    default: 5
  },
  
  // IP tracking
  createdFromIP: String,
  verifiedFromIP: String,
  
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
    enum: ['pending', 'verified', 'expired', 'revoked'],
    default: 'pending',
    index: true
  },
  
  // Revocation
  revokedAt: Date,
  revokedBy: String,
  revocationReason: String
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

emailVerificationSchema.index({ email: 1, userType: 1 });
emailVerificationSchema.index({ userId: 1, verified: 1 });
emailVerificationSchema.index({ token: 1 }, { unique: true });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired
emailVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // Delete after 7 days

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Create verification token
 * @param {String} email - User email
 * @param {String} userType - User type
 * @param {String} userId - User ID
 * @param {Object} options - Additional options (schoolId, ip, userAgent)
 * @returns {String} Plain text token (to send in email)
 */
emailVerificationSchema.statics.createToken = async function(email, userType, userId, options = {}) {
  // Generate random token (32 bytes = 64 hex chars)
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash token for storage (SHA-256)
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Delete any existing unverified tokens for this user
  await this.deleteMany({
    email,
    userType,
    userId,
    verified: false
  });
  
  // Create new verification record
  await this.create({
    email,
    userType,
    userId,
    schoolId: options.schoolId,
    token: hashedToken,
    createdFromIP: options.ip,
    userAgent: options.userAgent
  });
  
  return token; // Return plain token (not hashed) to send in email
};

/**
 * Verify token
 * @param {String} token - Plain text token
 * @param {Object} options - Additional options (ip)
 * @returns {Object} Verification record or null
 */
emailVerificationSchema.statics.verifyToken = async function(token, options = {}) {
  // Hash the provided token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  // Find verification record
  const verification = await this.findOne({
    token: hashedToken,
    verified: false,
    status: 'pending',
    expiresAt: { $gt: Date.now() }
  });
  
  if (!verification) {
    // Try to find expired or already verified token for better error messages
    const expiredOrVerified = await this.findOne({ token: hashedToken });
    
    if (expiredOrVerified) {
      if (expiredOrVerified.verified) {
        return { error: 'already_verified', verification: expiredOrVerified };
      }
      if (expiredOrVerified.expiresAt < Date.now()) {
        expiredOrVerified.status = 'expired';
        await expiredOrVerified.save();
        return { error: 'expired', verification: expiredOrVerified };
      }
    }
    
    return { error: 'invalid_token', verification: null };
  }
  
  // Check max attempts
  verification.verificationAttempts++;
  
  if (verification.verificationAttempts > verification.maxAttempts) {
    verification.status = 'revoked';
    verification.revokedAt = new Date();
    verification.revocationReason = 'max_attempts_exceeded';
    await verification.save();
    return { error: 'max_attempts', verification };
  }
  
  // Mark as verified
  verification.verified = true;
  verification.verifiedAt = new Date();
  verification.verifiedFromIP = options.ip;
  verification.status = 'verified';
  await verification.save();
  
  return { success: true, verification };
};

/**
 * Check if email is verified
 * @param {String} email - Email address
 * @param {String} userType - User type
 * @returns {Boolean}
 */
emailVerificationSchema.statics.isEmailVerified = async function(email, userType) {
  const verification = await this.findOne({
    email,
    userType,
    verified: true,
    status: 'verified'
  });
  
  return !!verification;
};

/**
 * Get verification status
 * @param {String} userId - User ID
 * @returns {Object} Status info
 */
emailVerificationSchema.statics.getStatus = async function(userId) {
  const verification = await this.findOne({ userId })
    .sort({ createdAt: -1 });
  
  if (!verification) {
    return { exists: false };
  }
  
  return {
    exists: true,
    verified: verification.verified,
    status: verification.status,
    expiresAt: verification.expiresAt,
    isExpired: verification.expiresAt < Date.now(),
    attempts: verification.verificationAttempts,
    maxAttempts: verification.maxAttempts
  };
};

/**
 * Resend verification token
 * @param {String} email - Email address
 * @param {String} userType - User type
 * @param {String} userId - User ID
 * @param {Object} options - Additional options
 * @returns {String} New token
 */
emailVerificationSchema.statics.resendToken = async function(email, userType, userId, options = {}) {
  // Check if recently resent (prevent spam)
  const recent = await this.findOne({
    email,
    userType,
    userId,
    lastResendAt: { $gt: Date.now() - 60000 } // Within last minute
  });
  
  if (recent) {
    throw new Error('Please wait before requesting another verification email');
  }
  
  // Check resend count
  const existing = await this.findOne({ email, userType, userId })
    .sort({ createdAt: -1 });
  
  if (existing && existing.resendCount >= 5) {
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
 * Revoke verification token
 * @param {String} userId - User ID
 * @param {String} revokedBy - Who revoked it
 * @param {String} reason - Revocation reason
 * @returns {Object} Revoked verification
 */
emailVerificationSchema.statics.revokeToken = async function(userId, revokedBy, reason) {
  const verification = await this.findOne({
    userId,
    verified: false,
    status: 'pending'
  });
  
  if (!verification) {
    return null;
  }
  
  verification.status = 'revoked';
  verification.revokedAt = new Date();
  verification.revokedBy = revokedBy;
  verification.revocationReason = reason;
  await verification.save();
  
  return verification;
};

/**
 * Clean up old verifications
 * @param {Number} daysOld - Days to keep (default 7)
 * @returns {Object} Delete result
 */
emailVerificationSchema.statics.cleanup = async function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return await this.deleteMany({
    $or: [
      { createdAt: { $lt: cutoffDate } },
      { expiresAt: { $lt: Date.now() }, verified: false }
    ]
  });
};

/**
 * Get statistics
 * @param {String} schoolId - School ID (optional)
 * @returns {Object} Statistics
 */
emailVerificationSchema.statics.getStats = async function(schoolId) {
  const query = schoolId ? { schoolId } : {};
  
  const total = await this.countDocuments(query);
  const verified = await this.countDocuments({ ...query, verified: true });
  const pending = await this.countDocuments({ ...query, verified: false, status: 'pending' });
  const expired = await this.countDocuments({ ...query, status: 'expired' });
  const revoked = await this.countDocuments({ ...query, status: 'revoked' });
  
  return {
    total,
    verified,
    pending,
    expired,
    revoked,
    verificationRate: total > 0 ? (verified / total * 100) : 0
  };
};

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Check if token is expired
 * @returns {Boolean}
 */
emailVerificationSchema.methods.isExpired = function() {
  return this.expiresAt < Date.now();
};

/**
 * Check if token is valid
 * @returns {Boolean}
 */
emailVerificationSchema.methods.isValid = function() {
  return !this.verified && 
         !this.isExpired() && 
         this.status === 'pending' &&
         this.verificationAttempts < this.maxAttempts;
};

/**
 * Get remaining attempts
 * @returns {Number}
 */
emailVerificationSchema.methods.getRemainingAttempts = function() {
  return Math.max(0, this.maxAttempts - this.verificationAttempts);
};

/**
 * Get time until expiry
 * @returns {Number} Milliseconds until expiry
 */
emailVerificationSchema.methods.getTimeUntilExpiry = function() {
  return Math.max(0, this.expiresAt - Date.now());
};

// ============================================================================
// VIRTUALS
// ============================================================================

emailVerificationSchema.virtual('isActive').get(function() {
  return !this.verified && !this.isExpired() && this.status === 'pending';
});

emailVerificationSchema.virtual('expiresInMinutes').get(function() {
  if (this.isExpired()) return 0;
  return Math.ceil(this.getTimeUntilExpiry() / (1000 * 60));
});

emailVerificationSchema.virtual('canResend').get(function() {
  if (!this.lastResendAt) return true;
  return (Date.now() - this.lastResendAt) > 60000; // 1 minute
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

emailVerificationSchema.pre('save', function () {
  // Auto-update status based on expiry
  if (
    !this.verified &&
    this.expiresAt &&
    this.expiresAt < Date.now() &&
    this.status === 'pending'
  ) {
    this.status = 'expired';
  }
});


// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

emailVerificationSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Never expose the token
    delete ret.token;
    delete ret.__v;
    return ret;
  }
});

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

module.exports = EmailVerification;