/**
 * COMPANY MEMBER MODEL
 * For research team members who can access AI alignment data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companyMemberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        const companyDomains = (process.env.COMPANY_EMAIL_DOMAINS || '@yourcompany.com').split(',');
        return companyDomains.some(domain => email.endsWith(domain.trim()));
      },
      message: 'Email must be from authorized company domain'
    }
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 12,
    select: false
  },
  
  companyRole: {
    type: String,
    enum: ['RESEARCHER', 'DATA_SCIENTIST', 'AI_ENGINEER', 'DIRECTOR', 'CEO'],
    required: true
  },
  
  department: {
    type: String,
    enum: ['AI_RESEARCH', 'DATA_SCIENCE', 'ENGINEERING', 'EXECUTIVE'],
    required: true
  },
  
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  
  permissions: {
    canExportCognitionData: { type: Boolean, default: false },
    canViewRawData: { type: Boolean, default: false },
    canExportFullDataset: { type: Boolean, default: false },
    canAccessPII: { type: Boolean, default: false },
    maxExportSize: { type: Number, default: 1000 }
  },
  
  apiKeys: [{
    key: String,
    name: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    active: { type: Boolean, default: true },
    lastUsed: Date
  }],
  
  allowedIPAddresses: [{
    ip: String,
    description: String,
    addedAt: { type: Date, default: Date.now }
  }],
  
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'REVOKED'],
    default: 'ACTIVE'
  },
  
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyMember'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyMember'
  },
  
  approvedAt: Date,
  revokedBy: mongoose.Schema.Types.ObjectId,
  revokedAt: Date,
  revokeReason: String
}, {
  timestamps: true
});

companyMemberSchema.index({ email: 1 });
companyMemberSchema.index({ employeeId: 1 });
companyMemberSchema.index({ status: 1 });

companyMemberSchema.pre('save', async function () {

  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);

});


companyMemberSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

companyMemberSchema.methods.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

companyMemberSchema.methods.incLoginAttempts = async function() {
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockedUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockedUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return await this.updateOne(updates);
};

companyMemberSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockedUntil: 1 }
  });
};

module.exports = mongoose.model('CompanyMember', companyMemberSchema);