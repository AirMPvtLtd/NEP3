/**
 * RESEARCH API KEY MODEL
 * Special API keys for company research access
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const researchAPIKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  name: {
    type: String,
    required: true
  },
  
  companyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyMember',
    required: true
  },
  
  permissions: {
    canExportCognitionData: Boolean,
    canViewRawData: Boolean,
    canExportFullDataset: Boolean,
    maxExportSize: Number
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    required: true
  },
  
  active: {
    type: Boolean,
    default: true
  },
  
  lastUsed: Date,
  
  usageCount: {
    type: Number,
    default: 0
  },
  
  revokedAt: Date,
  revokedBy: mongoose.Schema.Types.ObjectId,
  revokeReason: String
}, {
  timestamps: true
});

researchAPIKeySchema.index({ key: 1 });
researchAPIKeySchema.index({ companyMemberId: 1 });
researchAPIKeySchema.index({ expiresAt: 1 });
researchAPIKeySchema.index({ active: 1 });

researchAPIKeySchema.statics.generateKey = function() {
  return 'rsk_' + crypto.randomBytes(32).toString('hex');
};

researchAPIKeySchema.methods.isValid = function() {
  return this.active && this.expiresAt > Date.now();
};

researchAPIKeySchema.methods.recordUsage = async function() {
  this.lastUsed = Date.now();
  this.usageCount += 1;
  await this.save();
};

module.exports = mongoose.model('ResearchAPIKey', researchAPIKeySchema);