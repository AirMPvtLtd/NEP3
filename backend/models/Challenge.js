// models/Challenge.js
/**
 * CHALLENGE MODEL
 * Mongoose schema for AI-generated challenges
 * 
 * @module models/Challenge
 */

const mongoose = require('mongoose');
const { CHALLENGE_DIFFICULTY, CHALLENGE_TYPES, NEP_COMPETENCIES } = require('../config/constants');

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(CHALLENGE_TYPES),
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [{
    type: String
  }], // For MCQ
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  competencies: [{
    type: String,
    enum: NEP_COMPETENCIES
  }],
  points: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  }
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true
  },
  studentAnswer: {
    type: String,
    required: true
  },
  studentReasoning: {
    type: String,
    required: true
  },
  // AI Evaluation
  aiEvaluation: {
    answerCorrect: Boolean,
    answerScore: { type: Number, min: 0, max: 70 },
    reasoningScore: { type: Number, min: 0, max: 30 },
    feedback: String,
    strengths: [String],
    improvements: [String]
  },
  // Kalman Filter
  kalmanFiltered: {
    rawScore: Number,
    filteredScore: Number,
    kalmanGain: Number,
    uncertainty: Number
  },
  // PID Controller
  pidAdjusted: {
    rawScore: Number,
    calibratedScore: Number,
    correction: Number
  },
  // Final Score
  finalScore: {
    type: Number,
    min: 0,
    max: 100
  },
  evaluatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const challengeSchema = new mongoose.Schema({
  // Unique Challenge Identifier
  challengeId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `CHL-${Date.now()}`
  },
  
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
  
  teacherId: {
    type: String,
    ref: 'Teacher'
  },
  
  // Challenge Details
  simulationType: {
    type: String,
    required: [true, 'Simulation type is required'],
    index: true
  },
  
  difficulty: {
    type: String,
    enum: Object.values(CHALLENGE_DIFFICULTY),
    required: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  estimatedTime: {
    type: Number, // in minutes
    default: 10
  },
  
  questions: [questionSchema],
  
  totalPoints: {
    type: Number,
    default: 500,
    min: 0
  },
  
  passingScore: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  
  // Student Responses
  answers: [{
    questionId: String,
    studentAnswer: String,        // Their answer
    studentReasoning: String,     // Their explanation
    aiEvaluation: {               // AI evaluation result
      answerCorrect: Boolean,
      answerScore: Number,        // 0-70 points
      reasoningScore: Number,     // 0-30 points
      feedback: String,
      strengths: [String],
      improvements: [String]
    },
    finalScore: Number,           // 0-100
    evaluatedAt: Date
  }],
  
  // Overall Results
  results: {
    totalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    passed: {
      type: Boolean
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    totalQuestions: {
      type: Number,
      default: 5
    },
    // Competencies assessed
    competenciesAssessed: [{
      competency: {
        type: String,
        enum: NEP_COMPETENCIES
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      }
    }]
  },
  
  // Status
  status: {
    type: String,
    enum: ['generated', 'in-progress', 'submitted', 'evaluated'],
    default: 'generated'
  },
  
  // Timestamps
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  startedAt: {
    type: Date,
    default: null
  },
  
  submittedAt: {
    type: Date,
    default: null
  },
  
  timeSpent: {
    type: Number,  // seconds
    default: 0
  },
  
  evaluatedAt: {
    type: Date
  },
  
  draftSaves: [{                  // Save progress
    savedAt: Date,
    answers: [{
      questionId: String,
      studentAnswer: String,
      studentReasoning: String
    }]
  }],
  
  // Teacher Override
  teacherOverride: {
    overridden: {
      type: Boolean,
      default: false
    },
    teacherScore: {
      type: Number,
      min: 0,
      max: 100
    },
    teacherFeedback: {
      type: String
    },
    overriddenAt: {
      type: Date
    },
    overriddenBy: {
      type: String,
      ref: 'Teacher'
    }
  },
  
  // AI Metadata
  aiMetadata: {
    mistralModel: String,
    tokensUsed: Number,
    evaluationTime: Number, // milliseconds
    metaLearningApplied: Boolean,
    kalmanFilterApplied: Boolean,
    pidControllerApplied: Boolean
  }
}, {
  timestamps: true
});

// ============================================================================
// INDEXES
// ============================================================================

challengeSchema.index({ challengeId: 1 });
challengeSchema.index({ studentId: 1, generatedAt: -1 });
challengeSchema.index({ schoolId: 1, simulationType: 1 });
challengeSchema.index({ status: 1 });
challengeSchema.index({ 'results.totalScore': -1 });

// ============================================================================
// VIRTUALS
// ============================================================================

challengeSchema.virtual('isPassed').get(function() {
  return this.results.passed;
});

challengeSchema.virtual('isCompleted').get(function() {
  return this.status === 'evaluated';
});

// ============================================================================
// INSTANCE METHODS
// ============================================================================

// Start challenge
challengeSchema.methods.start = async function() {
  if (this.status !== 'generated') {
    throw new Error('Challenge already started or completed');
  }
  this.status = 'in-progress';
  this.startedAt = new Date();
  await this.save();
};

// Save draft
challengeSchema.methods.saveDraft = async function(answers) {
  this.draftSaves.push({
    savedAt: new Date(),
    answers
  });
  await this.save();
};

// Submit challenge
challengeSchema.methods.submit = async function(answers) {
  if (this.status === 'evaluated') {
    throw new Error('Challenge already evaluated');
  }
  
  this.answers = answers;
  this.status = 'submitted';
  this.submittedAt = new Date();
  
  if (this.startedAt) {
    this.timeSpent = Math.floor((this.submittedAt - this.startedAt) / 1000);
  }
  
  await this.save();
};

/**
 * Evaluate challenge
 */
challengeSchema.methods.evaluate = async function(evaluationResults) {
  this.status = 'evaluated';
  this.evaluatedAt = new Date();
  
  // Update results
  this.results = {
    ...this.results,
    ...evaluationResults
  };
  
  return await this.save();
};

/**
 * Teacher override score
 */
challengeSchema.methods.overrideScore = async function(teacherId, newScore, feedback) {
  this.teacherOverride = {
    overridden: true,
    teacherScore: newScore,
    teacherFeedback: feedback,
    overriddenAt: new Date(),
    overriddenBy: teacherId
  };
  
  // Update final score
  this.results.totalScore = newScore;
  this.results.percentage = newScore;
  this.results.passed = newScore >= this.passingScore;
  
  return await this.save();
};

/**
 * Calculate total score
 */
challengeSchema.methods.calculateTotalScore = function() {
  if (!this.answers || this.answers.length === 0) return 0;
  
  const total = this.answers.reduce((sum, answer) => {
    return sum + (answer.finalScore || 0);
  }, 0);
  
  return total / this.answers.length;
};

/**
 * Update competency scores
 */
challengeSchema.methods.updateCompetencyScores = function() {
  const competencyMap = new Map();
  
  this.questions.forEach((question, index) => {
    const answer = this.answers[index];
    if (!answer) return;
    
    question.competencies.forEach(comp => {
      if (!competencyMap.has(comp)) {
        competencyMap.set(comp, []);
      }
      competencyMap.get(comp).push(answer.finalScore || 0);
    });
  });
  
  this.results.competenciesAssessed = Array.from(competencyMap.entries()).map(([comp, scores]) => ({
    competency: comp,
    score: scores.reduce((a, b) => a + b, 0) / scores.length
  }));
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find by challenge ID
 */
challengeSchema.statics.findByChallengeId = function(challengeId) {
  return this.findOne({ challengeId });
};

/**
 * Get student challenges
 */
challengeSchema.statics.getByStudent = function(studentId, limit = 20) {
  return this.find({ studentId })
    .sort({ generatedAt: -1 })
    .limit(limit);
};

/**
 * Get recent challenges
 */
challengeSchema.statics.getRecent = function(studentId, days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.find({
    studentId,
    generatedAt: { $gte: date }
  }).sort({ generatedAt: -1 });
};

/**
 * Get school statistics
 */
challengeSchema.statics.getSchoolStatistics = async function(schoolId) {
  const stats = await this.aggregate([
    { $match: { schoolId, status: 'evaluated' } },
    {
      $group: {
        _id: null,
        totalChallenges: { $sum: 1 },
        averageScore: { $avg: '$results.totalScore' },
        passRate: {
          $avg: { $cond: ['$results.passed', 1, 0] }
        },
        totalStudents: { $addToSet: '$studentId' }
      }
    }
  ]);
  
  return stats[0] || {
    totalChallenges: 0,
    averageScore: 0,
    passRate: 0,
    totalStudents: []
  };
};

// ============================================================================
// TRANSFORM
// ============================================================================

challengeSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;