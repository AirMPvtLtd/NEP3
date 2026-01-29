// models/Ledger.js
/**
 * LEDGER MODEL - IMMUTABLE ASSESSMENT EVENT STORAGE
 * Blockchain-inspired immutable ledger for NEP compliance
 * 
 * @module models/Ledger
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const crypto = require('crypto');
const { NEP_COMPETENCIES } = require('../config/constants');

// ============================================================================
// EVENT TYPES (IMMUTABLE ONCE RECORDED)
// ============================================================================
const EVENT_TYPES = {
  // Assessment events
  COMPETENCY_ASSESSED: 'competency_assessed',
  CHALLENGE_ATTEMPTED: 'challenge_attempted',
  CHALLENGE_EVALUATED: 'challenge_evaluated',
  
  // Report events
  REPORT_GENERATED: 'report_generated',
  REPORT_VERIFIED: 'report_verified',
  REPORT_SHARED: 'report_shared',
  
  // System events
  STUDENT_ENROLLED: 'student_enrolled',
  TEACHER_ASSIGNED: 'teacher_assigned',
  COMPETENCY_UPDATED: 'competency_updated',
  
  // Audit events
  AUDIT_TRAIL: 'audit_trail',
  DATA_CORRECTION: 'data_correction',
  CONSISTENCY_CHECK: 'consistency_check'
};

// ============================================================================
// COMPETENCY ASSESSMENT SUB-SCHEMA
// ============================================================================
const competencyAssessmentSchema = new mongoose.Schema({
  competency: {
    type: String,
    enum: NEP_COMPETENCIES,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  level: {
    type: String,
    enum: ['emerging', 'developing', 'proficient', 'advanced'],
    required: true
  },
  evidence: {
    type: String
  },
  assessedBy: {
    type: String, // teacherId or 'system'
    required: true
  }
}, { _id: false });

// ============================================================================
// CHALLENGE RESULT SUB-SCHEMA
// ============================================================================
const challengeResultSchema = new mongoose.Schema({
  challengeId: {
    type: String,
    required: true
  },
  simulationType: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  totalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  passed: {
    type: Boolean,
    required: true
  },
  timeTaken: {
    type: Number // in seconds
  },
  competenciesAssessed: [competencyAssessmentSchema]
}, { _id: false });

// ============================================================================
// LEDGER METADATA SUB-SCHEMA
// ============================================================================
const ledgerMetadataSchema = new mongoose.Schema({
  previousHash: {
    type: String
  },
  merkleRoot: {
    type: String
  },
  blockIndex: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  chainId: {
    type: String,
    default: () => `CHAIN-${nanoid(6).toUpperCase()}`
  }
}, { _id: false });

// ============================================================================
// MAIN LEDGER SCHEMA
// ============================================================================
const ledgerSchema = new mongoose.Schema({
  // ============================================================================
  // IDENTIFIERS
  // ============================================================================
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => `EVENT-${nanoid(12).toUpperCase()}`
  },
  
  eventType: {
    type: String,
    enum: Object.values(EVENT_TYPES),
    required: true,
    index: true
  },
  
  // ============================================================================
  // ENTITY REFERENCES
  // ============================================================================
  studentId: {
    type: String,
    ref: 'Student',
    index: true
  },
  
  teacherId: {
    type: String,
    ref: 'Teacher'
  },
  
  schoolId: {
    type: String,
    ref: 'School',
    index: true
  },
  
  // ============================================================================
  // EVENT-SPECIFIC DATA
  // ============================================================================
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // For assessment events
  assessment: competencyAssessmentSchema,
  
  // For challenge events
  challenge: challengeResultSchema,
  
  // For report events
  report: {
    reportId: String,
    reportType: String,
    cpi: Number,
    hash: String
  },
  
  // ============================================================================
  // LEDGER-SPECIFIC FIELDS
  // ============================================================================
  hash: {
    type: String,
    required: true,
    unique: true
  },
  
  metadata: {
    type: ledgerMetadataSchema,
    required: true
  },
  
  // ============================================================================
  // AUDIT TRAIL
  // ============================================================================
  createdBy: {
    type: String,
    required: true
  },
  
  createdByRole: {
    type: String,
    enum: ['student', 'teacher', 'admin', 'parent', 'system'],
    required: true
  },
  
  ipAddress: {
    type: String
  },
  
  userAgent: {
    type: String
  },
  
  // ============================================================================
  // STATUS & VALIDATION
  // ============================================================================
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'invalid', 'corrected'],
    default: 'confirmed'
  },
  
  validationHash: {
    type: String
  },
  
  verifiedAt: {
    type: Date
  },
  
  verifiedBy: {
    type: String
  },
  
  // For data corrections
  correctedFrom: {
    type: String, // original eventId
    ref: 'Ledger'
  },
  
  correctionReason: {
    type: String
  },
  
  // ============================================================================
  // TIMESTAMPS
  // ============================================================================
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

ledgerSchema.virtual('isAssessmentEvent').get(function() {
  return [
    EVENT_TYPES.COMPETENCY_ASSESSED,
    EVENT_TYPES.CHALLENGE_ATTEMPTED,
    EVENT_TYPES.CHALLENGE_EVALUATED
  ].includes(this.eventType);
});

ledgerSchema.virtual('isReportEvent').get(function() {
  return [
    EVENT_TYPES.REPORT_GENERATED,
    EVENT_TYPES.REPORT_VERIFIED,
    EVENT_TYPES.REPORT_SHARED
  ].includes(this.eventType);
});

ledgerSchema.virtual('isSystemEvent').get(function() {
  return [
    EVENT_TYPES.STUDENT_ENROLLED,
    EVENT_TYPES.TEACHER_ASSIGNED,
    EVENT_TYPES.COMPETENCY_UPDATED
  ].includes(this.eventType);
});

// ============================================================================
// INDEXES
// ============================================================================

ledgerSchema.index({ eventId: 1 });
ledgerSchema.index({ studentId: 1, eventType: 1, timestamp: -1 });
ledgerSchema.index({ schoolId: 1, eventType: 1 });
ledgerSchema.index({ hash: 1 }, { unique: true });
ledgerSchema.index({ 'metadata.previousHash': 1 });
ledgerSchema.index({ 'metadata.merkleRoot': 1 });
ledgerSchema.index({ status: 1, timestamp: -1 });
ledgerSchema.index({ 'assessment.competency': 1, timestamp: -1 });
ledgerSchema.index({ timestamp: -1 });
ledgerSchema.index({ createdBy: 1, timestamp: -1 });

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

ledgerSchema.pre('save', async function(next) {
  try {
    // Generate hash if not already set
    if (!this.hash) {
      this.hash = this.generateEventHash();
    }
    
    // Set metadata if not present
    if (!this.metadata) {
      this.metadata = {};
    }
    
    // Set timestamp for metadata
    if (!this.metadata.timestamp) {
      this.metadata.timestamp = this.timestamp;
    }
    
    // Get previous hash for chain linking
    if (!this.metadata.previousHash) {
      const lastEvent = await this.constructor.findOne(
        { studentId: this.studentId },
        { hash: 1 },
        { sort: { timestamp: -1 } }
      );
      
      if (lastEvent) {
        this.metadata.previousHash = lastEvent.hash;
        this.metadata.blockIndex = lastEvent.metadata?.blockIndex + 1 || 1;
      } else {
        this.metadata.blockIndex = 0;
      }
    }
    
    // Generate validation hash
    this.validationHash = this.generateValidationHash();
    
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Generate unique hash for this event
 */
ledgerSchema.methods.generateEventHash = function() {
  const dataString = JSON.stringify({
    eventId: this.eventId,
    eventType: this.eventType,
    studentId: this.studentId,
    timestamp: this.timestamp.toISOString(),
    data: this.data,
    assessment: this.assessment,
    challenge: this.challenge,
    report: this.report
  });
  
  return crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
};

/**
 * Generate validation hash for integrity checking
 */
ledgerSchema.methods.generateValidationHash = function() {
  const validationData = {
    eventId: this.eventId,
    hash: this.hash,
    timestamp: this.timestamp.toISOString(),
    createdBy: this.createdBy
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(validationData))
    .digest('hex');
};

/**
 * Verify event integrity
 */
ledgerSchema.methods.verifyIntegrity = function() {
  const calculatedHash = this.generateEventHash();
  const calculatedValidationHash = this.generateValidationHash();
  
  return {
    isHashValid: calculatedHash === this.hash,
    isValidationHashValid: calculatedValidationHash === this.validationHash,
    calculatedHash,
    storedHash: this.hash,
    calculatedValidationHash,
    storedValidationHash: this.validationHash
  };
};

/**
 * Get event as verifiable object
 */
ledgerSchema.methods.toVerifiableObject = function() {
  return {
    eventId: this.eventId,
    eventType: this.eventType,
    studentId: this.studentId,
    timestamp: this.timestamp,
    hash: this.hash,
    metadata: this.metadata,
    validationHash: this.validationHash,
    verification: this.verifyIntegrity()
  };
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Create a competency assessment event
 */
ledgerSchema.statics.createCompetencyAssessment = async function(params) {
  const {
    studentId,
    teacherId,
    schoolId,
    competency,
    score,
    level,
    evidence,
    assessedBy,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  } = params;
  
  const event = new this({
    eventType: EVENT_TYPES.COMPETENCY_ASSESSED,
    studentId,
    teacherId,
    schoolId,
    assessment: {
      competency,
      score,
      level,
      evidence,
      assessedBy
    },
    data: {
      competency,
      score,
      level,
      evidence,
      assessedBy,
      assessmentType: 'direct'
    },
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  });
  
  return event.save();
};

/**
 * Create a challenge evaluation event
 */
ledgerSchema.statics.createChallengeEvaluation = async function(params) {
  const {
    studentId,
    teacherId,
    schoolId,
    challengeId,
    simulationType,
    difficulty,
    totalScore,
    passed,
    timeTaken,
    competenciesAssessed,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  } = params;
  
  const event = new this({
    eventType: EVENT_TYPES.CHALLENGE_EVALUATED,
    studentId,
    teacherId,
    schoolId,
    challenge: {
      challengeId,
      simulationType,
      difficulty,
      totalScore,
      passed,
      timeTaken,
      competenciesAssessed
    },
    data: {
      challengeId,
      simulationType,
      difficulty,
      totalScore,
      passed,
      timeTaken,
      competenciesAssessed
    },
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  });
  
  return event.save();
};

/**
 * Create a report generation event
 */
ledgerSchema.statics.createReportEvent = async function (params) {
  const {
    studentId,
    teacherId,
    schoolId,
    reportId,
    reportType,
    cpi,
    hash,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  } = params;

  const event = new this({
    eventType: EVENT_TYPES.REPORT_GENERATED,

    studentId,
    teacherId,
    schoolId,

    report: {
      reportId,
      reportType,
      cpi,
      hash
    },

    data: {
      reportId,
      reportType,
      cpi,
      hash
    },

    // 🔴 YE 2 CHEEZ MISSING THI — AB ADD KI
    hash,
    metadata: {
      timestamp: new Date()
    },

    createdBy,
    createdByRole,
    ipAddress,
    userAgent,

    status: 'confirmed',
    timestamp: new Date()
  });

  return event.save();
};


/**
 * Get student's ledger events
 */
ledgerSchema.statics.getStudentEvents = async function(studentId, options = {}) {
  const {
    eventType,
    limit = 100,
    offset = 0,
    startDate,
    endDate,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;
  
  const query = { studentId };
  
  if (eventType) {
    query.eventType = eventType;
  }
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const [events, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(parseInt(offset))
      .limit(parseInt(limit)),
    this.countDocuments(query)
  ]);
  
  return {
    events,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  };
};

/**
 * Get events for merkle tree generation
 */
ledgerSchema.statics.getEventsForMerkleTree = async function(studentId, limit = 100) {
  const events = await this.find({
    studentId,
    eventType: {
      $in: [
        EVENT_TYPES.COMPETENCY_ASSESSED,
        EVENT_TYPES.CHALLENGE_EVALUATED
      ]
    },
    status: 'confirmed'
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('eventId hash timestamp eventType');
  
  return events.map(event => ({
    eventId: event.eventId,
    hash: event.hash,
    timestamp: event.timestamp,
    eventType: event.eventType
  }));
};

/**
 * Verify ledger chain integrity for a student
 */
ledgerSchema.statics.verifyChainIntegrity = async function(studentId) {
  const events = await this.find({ studentId })
    .sort({ 'metadata.blockIndex': 1 })
    .select('eventId hash metadata timestamp');
  
  const integrityReport = {
    studentId,
    totalEvents: events.length,
    chainBroken: false,
    invalidEvents: [],
    verificationTimestamp: new Date()
  };
  
  for (let i = 1; i < events.length; i++) {
    const current = events[i];
    const previous = events[i - 1];
    
    // Check if previous hash matches
    if (current.metadata?.previousHash !== previous.hash) {
      integrityReport.chainBroken = true;
      integrityReport.invalidEvents.push({
        eventId: current.eventId,
        issue: 'Previous hash mismatch',
        expected: previous.hash,
        actual: current.metadata?.previousHash
      });
    }
    
    // Verify individual event integrity
    const eventIntegrity = current.verifyIntegrity();
    if (!eventIntegrity.isHashValid) {
      integrityReport.chainBroken = true;
      integrityReport.invalidEvents.push({
        eventId: current.eventId,
        issue: 'Event hash mismatch',
        details: eventIntegrity
      });
    }
  }
  
  integrityReport.chainValid = !integrityReport.chainBroken;
  return integrityReport;
};

/**
 * Create merkle tree from events
 */
ledgerSchema.statics.createMerkleTree = async function(studentId, eventLimit = 100) {
  const events = await this.getEventsForMerkleTree(studentId, eventLimit);
  
  if (events.length === 0) {
    return {
      merkleRoot: null,
      leafCount: 0,
      events: []
    };
  }
  
  // Create leaf hashes
  const leafHashes = events.map(event => 
    crypto.createHash('sha256')
      .update(`${event.eventId}:${event.hash}:${event.timestamp.getTime()}`)
      .digest('hex')
  );
  
  // Build merkle tree
  const buildMerkleTree = (hashes) => {
    if (hashes.length === 1) return hashes[0];
    
    const nextLevel = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left; // Duplicate if odd number
      const combined = crypto.createHash('sha256')
        .update(left + right)
        .digest('hex');
      nextLevel.push(combined);
    }
    
    return buildMerkleTree(nextLevel);
  };
  
  const merkleRoot = buildMerkleTree(leafHashes);
  
  return {
    merkleRoot,
    leafCount: leafHashes.length,
    events: events.map((event, index) => ({
      eventId: event.eventId,
      leafHash: leafHashes[index],
      index
    }))
  };
};

/**
 * Get student's competency history from ledger
 */
ledgerSchema.statics.getCompetencyHistory = async function(studentId, competency) {
  const events = await this.find({
    studentId,
    eventType: EVENT_TYPES.COMPETENCY_ASSESSED,
    'assessment.competency': competency,
    status: 'confirmed'
  })
    .sort({ timestamp: 1 })
    .select('timestamp assessment.score assessment.level metadata');
  
  return events.map(event => ({
    timestamp: event.timestamp,
    score: event.assessment?.score,
    level: event.assessment?.level,
    blockIndex: event.metadata?.blockIndex
  }));
};

/**
 * Get latest assessment for each competency
 */
ledgerSchema.statics.getLatestCompetencyScores = async function(studentId) {
  const pipeline = [
    {
      $match: {
        studentId,
        eventType: EVENT_TYPES.COMPETENCY_ASSESSED,
        status: 'confirmed'
      }
    },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$assessment.competency',
        latestScore: { $first: '$assessment.score' },
        latestLevel: { $first: '$assessment.level' },
        latestTimestamp: { $first: '$timestamp' },
        eventId: { $first: '$eventId' },
        hash: { $first: '$hash' }
      }
    },
    {
      $project: {
        competency: '$_id',
        score: '$latestScore',
        level: '$latestLevel',
        assessedAt: '$latestTimestamp',
        eventId: 1,
        hash: 1,
        _id: 0
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

const Ledger = mongoose.model('Ledger', ledgerSchema);

// Export constants
Ledger.EVENT_TYPES = EVENT_TYPES;

module.exports = Ledger;