// models/CompetencyMaster.js
/**
 * COMPETENCY MASTER MODEL
 * Standardized NEP 2020 competency framework
 * Version-controlled master data for all competencies
 * 
 * @module models/CompetencyMaster
 */

const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const { NEP_COMPETENCIES } = require('../config/constants');

// ============================================================================
// DOMAIN CATEGORIES
// ============================================================================
const DOMAINS = {
  COGNITIVE: 'Cognitive',
  SOCIO_EMOTIONAL: 'Socio-Emotional',
  PHYSICAL: 'Physical',
  ART_AESTHETIC: 'Art & Aesthetic',
  VOCATIONAL: 'Vocational',
  ETHICAL: 'Ethical'
};

// ============================================================================
// COMPETENCY LEVELS
// ============================================================================
const COMPETENCY_LEVELS = {
  EMERGING: 'emerging',
  DEVELOPING: 'developing',
  PROFICIENT: 'proficient',
  ADVANCED: 'advanced'
};

// ============================================================================
// ASSESSMENT METHODS
// ============================================================================
const ASSESSMENT_METHODS = {
  DIRECT_OBSERVATION: 'direct_observation',
  RUBRIC_BASED: 'rubric_based',
  SELF_ASSESSMENT: 'self_assessment',
  PEER_ASSESSMENT: 'peer_assessment',
  TEACHER_ASSESSMENT: 'teacher_assessment',
  AUTOMATED_AI: 'automated_ai',
  PROJECT_BASED: 'project_based',
  PORTFOLIO: 'portfolio'
};

// ============================================================================
// COMPETENCY SUB-SCHEMA
// ============================================================================
const competencySchema = new mongoose.Schema({
  // Core identifier
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  
  // Standard name from NEP 2020
  name: {
    type: String,
    enum: NEP_COMPETENCIES,
    required: true,
    unique: true
  },
  
  // Domain classification
  domain: {
    type: String,
    enum: Object.values(DOMAINS),
    required: true,
    index: true
  },
  
  // Description from NEP documentation
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Grade bands (1-5: Foundational, 6-8: Preparatory, 9-12: Secondary)
  applicableGrades: {
    type: [Number],
    required: true,
    default: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    validate: {
      validator: function(grades) {
        return grades.every(grade => grade >= 1 && grade <= 12);
      },
      message: 'Grades must be between 1 and 12'
    }
  },
  
  // Competency levels with descriptors
  levels: [{
    level: {
      type: String,
      enum: Object.values(COMPETENCY_LEVELS),
      required: true
    },
    descriptor: {
      type: String,
      required: true,
      trim: true
    },
    minScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    indicators: [{
      type: String,
      trim: true
    }]
  }],
  
  // Assessment methods for this competency
  assessmentMethods: [{
    type: String,
    enum: Object.values(ASSESSMENT_METHODS)
  }],
  
  // Weight in CPI calculation (default 1.0)
  weight: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 2.0
  },
  
  // Related competencies for holistic assessment
  relatedCompetencies: [{
    type: String,
    ref: 'CompetencyMaster'
  }],
  
  // Metadata
  metadata: {
    nepSection: String,
    nepClause: String,
    officialDocument: String,
    lastUpdated: Date,
    references: [{
      title: String,
      url: String,
      type: String
    }]
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Version tracking
  version: {
    type: String,
    default: 'NEP2020_v1.0',
    index: true
  },
  
  // Audit trail
  createdBy: {
    type: String,
    required: true,
    default: 'system'
  },
  
  updatedBy: {
    type: String,
    required: true,
    default: 'system'
  },
  
  // Soft delete
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// MAIN COMPETENCY MASTER SCHEMA
// ============================================================================
const competencyMasterSchema = new mongoose.Schema({
  // Unique identifier
  masterId: {
    type: String,
    required: true,
    unique: true,
    default: () => `COMP-MASTER-${nanoid(8).toUpperCase()}`
  },
  
  // Framework name
  framework: {
    type: String,
    required: true,
    default: 'NEP_2020',
    index: true
  },
  
  // Version with semantic versioning
  version: {
    type: String,
    required: true,
    default: '1.0.0',
    index: true
  },
  
  // Competency domains
  domains: [{
    code: {
      type: String,
      required: true,
      uppercase: true
    },
    name: {
      type: String,
      enum: Object.values(DOMAINS),
      required: true
    },
    description: String,
    weight: {
      type: Number,
      default: 1.0
    }
  }],
  
  // All competencies in this version
  competencies: [competencySchema],
  
  // Overall framework metadata
  metadata: {
    description: {
      type: String,
      default: 'National Education Policy 2020 Competency Framework'
    },
    publishedDate: {
      type: Date,
      default: Date.now
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    revisionNotes: String,
    authority: {
      type: String,
      default: 'Ministry of Education, Government of India'
    },
    complianceLevel: {
      type: String,
      enum: ['FULL', 'PARTIAL', 'CUSTOM'],
      default: 'FULL'
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // For version control
  previousVersion: {
    type: String,
    ref: 'CompetencyMaster'
  },
  
  // Migration notes when updating
  migrationNotes: String,
  
  // Audit trail
  createdBy: {
    type: String,
    required: true,
    default: 'system'
  },
  
  updatedBy: {
    type: String,
    required: true,
    default: 'system'
  },
  
  // Validation flags
  validated: {
    type: Boolean,
    default: false
  },
  
  validatedBy: String,
  
  validatedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================================================
// INDEXES
// ============================================================================

competencyMasterSchema.index({ masterId: 1 });
competencyMasterSchema.index({ framework: 1, version: 1 }, { unique: true });
competencyMasterSchema.index({ isActive: 1 });
competencyMasterSchema.index({ 'competencies.name': 1 });
competencyMasterSchema.index({ 'competencies.code': 1 });
competencyMasterSchema.index({ 'competencies.domain': 1 });
competencyMasterSchema.index({ 'competencies.isActive': 1 });
competencyMasterSchema.index({ version: 1, 'competencies.applicableGrades': 1 });

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

competencyMasterSchema.virtual('activeCompetencies').get(function() {
  return this.competencies.filter(comp => comp.isActive);
});

competencyMasterSchema.virtual('competencyCount').get(function() {
  return this.competencies.length;
});

competencyMasterSchema.virtual('activeCompetencyCount').get(function() {
  return this.competencies.filter(comp => comp.isActive).length;
});

competencyMasterSchema.virtual('domainSummary').get(function() {
  const summary = {};
  this.domains.forEach(domain => {
    const domainCompetencies = this.competencies.filter(
      comp => comp.domain === domain.name && comp.isActive
    );
    summary[domain.name] = {
      count: domainCompetencies.length,
      weight: domain.weight,
      competencies: domainCompetencies.map(c => c.name)
    };
  });
  return summary;
});

// ============================================================================
// PRE-SAVE MIDDLEWARE
// ============================================================================

competencyMasterSchema.pre('save', async function () {

  // Validate that all competency codes are unique
  const competencyCodes = this.competencies.map(c => c.code);
  const uniqueCodes = new Set(competencyCodes);

  if (uniqueCodes.size !== competencyCodes.length) {
    throw new Error('Duplicate competency codes found within the framework');
  }

  // Validate competency levels don't overlap
  this.competencies.forEach(competency => {
    competency.levels.sort((a, b) => a.minScore - b.minScore);

    for (let i = 1; i < competency.levels.length; i++) {
      if (competency.levels[i].minScore <= competency.levels[i - 1].maxScore) {
        throw new Error(`Competency ${competency.code} has overlapping score ranges`);
      }
    }
  });

  // Set updated timestamp
  if (this.isModified()) {
    if (!this.metadata) this.metadata = {};
    this.metadata.publishedDate = new Date();
  }
});


// ============================================================================
// INSTANCE METHODS
// ============================================================================

/**
 * Get competency by code
 */
competencyMasterSchema.methods.getCompetencyByCode = function(code) {
  return this.competencies.find(comp => 
    comp.code === code.toUpperCase() && comp.isActive
  );
};

/**
 * Get competency by name
 */
competencyMasterSchema.methods.getCompetencyByName = function(name) {
  return this.competencies.find(comp => 
    comp.name === name && comp.isActive
  );
};

/**
 * Get competencies by domain
 */
competencyMasterSchema.methods.getCompetenciesByDomain = function(domain) {
  return this.competencies.filter(comp => 
    comp.domain === domain && comp.isActive
  );
};

/**
 * Get competencies for specific grade
 */
competencyMasterSchema.methods.getCompetenciesForGrade = function(grade) {
  return this.competencies.filter(comp => 
    comp.applicableGrades.includes(grade) && comp.isActive
  );
};

/**
 * Determine competency level based on score
 */
competencyMasterSchema.methods.getCompetencyLevel = function(competencyCode, score) {
  const competency = this.getCompetencyByCode(competencyCode);
  if (!competency) return null;
  
  const level = competency.levels.find(l => 
    score >= l.minScore && score <= l.maxScore
  );
  
  return level ? level.level : null;
};

/**
 * Get all assessment methods for a competency
 */
competencyMasterSchema.methods.getAssessmentMethods = function(competencyCode) {
  const competency = this.getCompetencyByCode(competencyCode);
  return competency ? competency.assessmentMethods : [];
};

/**
 * Validate if a competency score is valid
 */
competencyMasterSchema.methods.validateScore = function(competencyCode, score) {
  const competency = this.getCompetencyByCode(competencyCode);
  if (!competency) return false;
  
  return score >= 0 && score <= 100;
};

/**
 * Get weighted score for CPI calculation
 */
competencyMasterSchema.methods.getWeightedScore = function(competencyCode, score) {
  const competency = this.getCompetencyByCode(competencyCode);
  if (!competency) return score;
  
  return score * competency.weight;
};

/**
 * Export framework as JSON for AI processing
 */
competencyMasterSchema.methods.toAIFormat = function() {
  return {
    framework: this.framework,
    version: this.version,
    domains: this.domains.map(d => ({
      name: d.name,
      description: d.description,
      weight: d.weight
    })),
    competencies: this.activeCompetencies.map(c => ({
      code: c.code,
      name: c.name,
      domain: c.domain,
      description: c.description,
      levels: c.levels.map(l => ({
        level: l.level,
        descriptor: l.descriptor,
        scoreRange: [l.minScore, l.maxScore]
      })),
      weight: c.weight,
      assessmentMethods: c.assessmentMethods
    })),
    metadata: this.metadata
  };
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get active framework
 */
competencyMasterSchema.statics.getActiveFramework = async function() {
  return this.findOne({ isActive: true })
    .sort({ version: -1 })
    .lean();
};

/**
 * Get framework by version
 */
competencyMasterSchema.statics.getFrameworkByVersion = async function(version) {
  return this.findOne({ version, isActive: true }).lean();
};

/**
 * Create new framework version
 */
competencyMasterSchema.statics.createNewVersion = async function(params) {
  const {
    version,
    previousVersion,
    competencies,
    domains,
    metadata,
    createdBy
  } = params;
  
  // Deactivate previous version if exists
  if (previousVersion) {
    await this.findOneAndUpdate(
      { version: previousVersion },
      { isActive: false }
    );
  }
  
  const newFramework = new this({
    version,
    previousVersion,
    competencies,
    domains,
    metadata: {
      ...metadata,
      publishedDate: new Date(),
      effectiveDate: new Date()
    },
    createdBy,
    updatedBy: createdBy
  });
  
  return newFramework.save();
};

/**
 * Import NEP 2020 standard competencies
 */
competencyMasterSchema.statics.importNEPStandard = async function(createdBy = 'system') {
  const standardDomains = [
    { code: 'COG', name: DOMAINS.COGNITIVE, description: 'Thinking and reasoning abilities', weight: 1.2 },
    { code: 'SOC', name: DOMAINS.SOCIO_EMOTIONAL, description: 'Social and emotional intelligence', weight: 1.1 },
    { code: 'PHY', name: DOMAINS.PHYSICAL, description: 'Physical health and motor skills', weight: 1.0 },
    { code: 'ART', name: DOMAINS.ART_AESTHETIC, description: 'Creative and aesthetic appreciation', weight: 1.0 },
    { code: 'VOC', name: DOMAINS.VOCATIONAL, description: 'Vocational skills and career readiness', weight: 1.1 },
    { code: 'ETH', name: DOMAINS.ETHICAL, description: 'Ethical and moral reasoning', weight: 1.1 }
  ];
  
  // Standard NEP 2020 competencies (simplified example)
  const standardCompetencies = [
    {
      code: 'CRIT_THINK',
      name: 'Critical Thinking',
      domain: DOMAINS.COGNITIVE,
      description: 'Ability to analyze information objectively and make reasoned judgments',
      applicableGrades: [6, 7, 8, 9, 10, 11, 12],
      levels: [
        { level: COMPETENCY_LEVELS.EMERGING, descriptor: 'Can identify basic patterns', minScore: 0, maxScore: 25 },
        { level: COMPETENCY_LEVELS.DEVELOPING, descriptor: 'Can compare and contrast information', minScore: 26, maxScore: 50 },
        { level: COMPETENCY_LEVELS.PROFICIENT, descriptor: 'Can analyze complex problems', minScore: 51, maxScore: 75 },
        { level: COMPETENCY_LEVELS.ADVANCED, descriptor: 'Can evaluate multiple perspectives and synthesize', minScore: 76, maxScore: 100 }
      ],
      assessmentMethods: [
        ASSESSMENT_METHODS.RUBRIC_BASED,
        ASSESSMENT_METHODS.PROJECT_BASED,
        ASSESSMENT_METHODS.AUTOMATED_AI
      ],
      weight: 1.2,
      metadata: {
        nepSection: '4.24',
        nepClause: 'Development of critical thinking'
      }
    },
    {
      code: 'COMM_SKILL',
      name: 'Communication Skills',
      domain: DOMAINS.SOCIO_EMOTIONAL,
      description: 'Ability to express ideas clearly and listen effectively',
      applicableGrades: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      levels: [
        { level: COMPETENCY_LEVELS.EMERGING, descriptor: 'Basic verbal expression', minScore: 0, maxScore: 25 },
        { level: COMPETENCY_LEVELS.DEVELOPING, descriptor: 'Clear expression in familiar contexts', minScore: 26, maxScore: 50 },
        { level: COMPETENCY_LEVELS.PROFICIENT, descriptor: 'Effective communication in diverse contexts', minScore: 51, maxScore: 75 },
        { level: COMPETENCY_LEVELS.ADVANCED, descriptor: 'Persuasive and nuanced communication', minScore: 76, maxScore: 100 }
      ],
      assessmentMethods: [
        ASSESSMENT_METHODS.DIRECT_OBSERVATION,
        ASSESSMENT_METHODS.PEER_ASSESSMENT,
        ASSESSMENT_METHODS.SELF_ASSESSMENT
      ],
      weight: 1.1
    },
    // Add more competencies as needed...
  ];
  
  const framework = new this({
    framework: 'NEP_2020',
    version: '1.0.0',
    domains: standardDomains,
    competencies: standardCompetencies,
    metadata: {
      description: 'National Education Policy 2020 Standard Competency Framework',
      authority: 'Ministry of Education, Government of India',
      complianceLevel: 'FULL',
      references: [
        {
          title: 'National Education Policy 2020',
          url: 'https://www.education.gov.in/sites/upload_files/mhrd/files/NEP_Final_English_0.pdf',
          type: 'Official Document'
        }
      ]
    },
    createdBy,
    updatedBy: createdBy,
    validated: true,
    validatedBy: 'system',
    validatedAt: new Date()
  });
  
  return framework.save();
};

/**
 * Validate assessment against framework
 */
competencyMasterSchema.statics.validateAssessment = async function(assessmentData) {
  const framework = await this.getActiveFramework();
  if (!framework) return { valid: false, error: 'No active framework found' };
  
  const validationResults = [];
  const modelInstance = new this(framework);
  
  for (const assessment of assessmentData) {
    const competency = modelInstance.getCompetencyByCode(assessment.competencyCode);
    
    if (!competency) {
      validationResults.push({
        competencyCode: assessment.competencyCode,
        valid: false,
        error: 'Competency not found in framework'
      });
      continue;
    }
    
    if (!modelInstance.validateScore(assessment.competencyCode, assessment.score)) {
      validationResults.push({
        competencyCode: assessment.competencyCode,
        valid: false,
        error: 'Invalid score (must be 0-100)'
      });
      continue;
    }
    
    const level = modelInstance.getCompetencyLevel(assessment.competencyCode, assessment.score);
    
    validationResults.push({
      competencyCode: assessment.competencyCode,
      valid: true,
      level,
      weightedScore: modelInstance.getWeightedScore(assessment.competencyCode, assessment.score),
      competencyName: competency.name,
      domain: competency.domain
    });
  }
  
  return {
    valid: validationResults.every(r => r.valid),
    results: validationResults,
    frameworkVersion: framework.version
  };
};

/**
 * Get competency statistics
 */
competencyMasterSchema.statics.getCompetencyStats = async function() {
  const framework = await this.getActiveFramework();
  if (!framework) return null;
  
  const modelInstance = new this(framework);
  
  return {
    framework: framework.framework,
    version: framework.version,
    totalCompetencies: framework.competencyCount,
    activeCompetencies: framework.activeCompetencyCount,
    domains: framework.domainSummary,
    gradeCoverage: {
      foundational: modelInstance.getCompetenciesForGrade(3).length,
      preparatory: modelInstance.getCompetenciesForGrade(8).length,
      secondary: modelInstance.getCompetenciesForGrade(11).length
    },
    generatedAt: new Date()
  };
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

const CompetencyMaster = mongoose.model('CompetencyMaster', competencyMasterSchema);

// Export constants
CompetencyMaster.DOMAINS = DOMAINS;
CompetencyMaster.COMPETENCY_LEVELS = COMPETENCY_LEVELS;
CompetencyMaster.ASSESSMENT_METHODS = ASSESSMENT_METHODS;

module.exports = CompetencyMaster;