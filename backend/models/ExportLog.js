/**
 * EXPORT LOG MODEL
 * Audit trail for all data exports
 */

const mongoose = require('mongoose');

const exportLogSchema = new mongoose.Schema({
  companyMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyMember',
    required: true
  },
  
  memberEmail: String,
  memberName: String,
  
  exportType: {
    type: String,
    required: true,
    enum: [
      'COGNITION_DATA',
      'THINKING_PATTERNS',
      'SIMULATION_SESSIONS',
      'FULL_DATASET',
      'ANONYMIZED_DATASET',
      'STATISTICAL_SUMMARY'
    ]
  },
  
  recordCount: { type: Number, required: true },
  fileSize: { type: Number, required: true },
  format: {
    type: String,
    enum: ['JSON', 'CSV', 'JSONL', 'PARQUET'],
    required: true
  },
  
  filters: {
    dateRange: {
      start: Date,
      end: Date
    },
    gradeLevel: [Number],
    subject: [String],
    simulationIds: [String],
    minDataQuality: Number,
    includeIncomplete: Boolean
  },
  
  anonymizationLevel: {
    type: String,
    enum: ['NONE', 'BASIC', 'FULL'],
    required: true
  },
  
  piiRemoved: { type: Boolean, default: true },
  
  accessMethod: {
    type: String,
    enum: ['API', 'DASHBOARD', 'CLI'],
    required: true
  },
  
  apiKeyUsed: String,
  ipAddress: { type: String, required: true },
  userAgent: String,
  
  purpose: {
    type: String,
    required: true,
    enum: [
      'AI_MODEL_TRAINING',
      'RESEARCH_ANALYSIS',
      'QUALITY_ASSURANCE',
      'ALGORITHM_TESTING',
      'PUBLICATION_PREPARATION',
      'INTERNAL_REVIEW'
    ]
  },
  
  purposeDetails: {
    type: String,
    maxlength: 500
  },
  
  downloadUrl: { type: String, required: true },
  downloadUrlExpiresAt: { type: Date, required: true },
  downloaded: { type: Boolean, default: false },
  downloadedAt: Date,
  
  requiresApproval: { type: Boolean, default: false },
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'APPROVED'
  },
  
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvedAt: Date,
  rejectionReason: String,
  
  encrypted: { type: Boolean, default: true },
  encryptionMethod: { type: String, default: 'AES-256-GCM' },
  checksumSHA256: String,
  
  dataUsageAgreementSigned: { type: Boolean, default: false },
  retentionPeriod: { type: Number, default: 90 },
  deleteAfter: Date,
  deleted: { type: Boolean, default: false },
  deletedAt: Date
}, {
  timestamps: true
});

exportLogSchema.index({ companyMemberId: 1, createdAt: -1 });
exportLogSchema.index({ exportType: 1, createdAt: -1 });
exportLogSchema.index({ deleted: 1, deleteAfter: 1 });
exportLogSchema.index({ approvalStatus: 1 });

exportLogSchema.pre('save', function(next) {
  if (!this.deleteAfter && this.retentionPeriod) {
    this.deleteAfter = new Date(Date.now() + this.retentionPeriod * 24 * 60 * 60 * 1000);
  }
  next();
});

exportLogSchema.statics.getStatistics = async function(companyMemberId, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    {
      $match: {
        companyMemberId: mongoose.Types.ObjectId(companyMemberId),
        createdAt: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: '$exportType',
        count: { $sum: 1 },
        totalRecords: { $sum: '$recordCount' },
        totalSize: { $sum: '$fileSize' }
      }
    }
  ]);
};

module.exports = mongoose.model('ExportLog', exportLogSchema);