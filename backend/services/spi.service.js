// services/spi.service.js
/**
 * SPI SERVICE - COMPLETE PRODUCTION VERSION
 * Student Performance Index calculation and analysis
 * 
 * @module services/spi.service
 */
/*
const { Student, Challenge, KalmanState, MetaParameters } = require('../models');

// ============================================================================
// SPI CALCULATION CONSTANTS
// ============================================================================

const SPI_WEIGHTS = {
  accuracy: 0.35,           // 35% - Answer correctness
  consistency: 0.20,        // 20% - Performance consistency
  improvement: 0.15,        // 15% - Learning trajectory
  competencyDepth: 0.15,    // 15% - Mastery across competencies
  challengeDifficulty: 0.10, // 10% - Difficulty level attempted
  timeEfficiency: 0.05      // 5% - Time management
};

const DIFFICULTY_MULTIPLIERS = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.3,
  expert: 1.6
};

const COMPETENCY_WEIGHTS = {
  'NCF_1': 1.0,  // Numerical and Measurement Skills
  'NCF_2': 1.0,  // Patterns and Relationships
  'NCF_3': 1.0,  // Shapes and Spatial Understanding
  'NCF_4': 1.0,  // Data Handling
  'NCF_5': 1.0,  // Mathematical Reasoning
  'NCF_6': 1.0,  // Mathematical Communication
  'NCF_7': 1.0,  // Problem Solving
  'NCF_8': 1.0,  // Algebraic Thinking
  'NCF_9': 1.0,  // Proportional Reasoning
  'NCF_10': 1.0, // Systematic Thinking
  'NCF_11': 1.0, // Analytical Thinking
  'NCF_12': 1.0  // Critical Thinking
};

// ============================================================================
// CORE SPI CALCULATION
// ============================================================================

/**
 * Calculate Student Performance Index
 * @param {String} studentId - Student ID
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} SPI data
 
const calculateSPI = async (studentId, options = {}) => {
  const {
    periodStart = null,
    periodEnd = null,
    includeBreakdown = true
  } = options;
  
  try {
    const student = await Student.findOne({ studentId });
    if (!student) {
      throw new Error('Student not found');
    }
    
    const challengeQuery = {
      studentId,
      status: 'evaluated'
    };
    
    if (periodStart || periodEnd) {
      challengeQuery.submittedAt = {};
      if (periodStart) challengeQuery.submittedAt.$gte = new Date(periodStart);
      if (periodEnd) challengeQuery.submittedAt.$lte = new Date(periodEnd);
    }
    
    const challenges = await Challenge.find(challengeQuery).sort({ submittedAt: 1 });
    
    if (challenges.length === 0) {
      return {
        spi: 0,
        grade: 'N/A',
        components: {},
        message: 'No evaluated challenges found'
      };
    }
    
    const accuracyScore = calculateAccuracyScore(challenges);
    const consistencyScore = calculateConsistencyScore(challenges);
    const improvementScore = calculateImprovementScore(challenges);
    const competencyDepthScore = await calculateCompetencyDepthScore(studentId, challenges);
    const difficultyScore = calculateDifficultyScore(challenges);
    const timeEfficiencyScore = calculateTimeEfficiencyScore(challenges);
    
    const spi = Math.round(
      (accuracyScore * SPI_WEIGHTS.accuracy) +
      (consistencyScore * SPI_WEIGHTS.consistency) +
      (improvementScore * SPI_WEIGHTS.improvement) +
      (competencyDepthScore * SPI_WEIGHTS.competencyDepth) +
      (difficultyScore * SPI_WEIGHTS.challengeDifficulty) +
      (timeEfficiencyScore * SPI_WEIGHTS.timeEfficiency)
    );
    
    const grade = getSPIGrade(spi);
    
    const result = {
      spi,
      grade,
      totalChallenges: challenges.length,
      calculatedAt: new Date()
    };
    
    if (includeBreakdown) {
      result.components = {
        accuracy: {
          score: Math.round(accuracyScore),
          weight: SPI_WEIGHTS.accuracy,
          contribution: Math.round(accuracyScore * SPI_WEIGHTS.accuracy)
        },
        consistency: {
          score: Math.round(consistencyScore),
          weight: SPI_WEIGHTS.consistency,
          contribution: Math.round(consistencyScore * SPI_WEIGHTS.consistency)
        },
        improvement: {
          score: Math.round(improvementScore),
          weight: SPI_WEIGHTS.improvement,
          contribution: Math.round(improvementScore * SPI_WEIGHTS.improvement)
        },
        competencyDepth: {
          score: Math.round(competencyDepthScore),
          weight: SPI_WEIGHTS.competencyDepth,
          contribution: Math.round(competencyDepthScore * SPI_WEIGHTS.competencyDepth)
        },
        difficulty: {
          score: Math.round(difficultyScore),
          weight: SPI_WEIGHTS.challengeDifficulty,
          contribution: Math.round(difficultyScore * SPI_WEIGHTS.challengeDifficulty)
        },
        timeEfficiency: {
          score: Math.round(timeEfficiencyScore),
          weight: SPI_WEIGHTS.timeEfficiency,
          contribution: Math.round(timeEfficiencyScore * SPI_WEIGHTS.timeEfficiency)
        }
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('SPI calculation error:', error);
    throw error;
  }
};

const calculateAccuracyScore = (challenges) => {
  if (challenges.length === 0) return 0;
  const totalScore = challenges.reduce((sum, challenge) => sum + (challenge.evaluation?.score || 0), 0);
  return totalScore / challenges.length;
};

const calculateConsistencyScore = (challenges) => {
  if (challenges.length < 2) return 100;
  const scores = challenges.map(c => c.evaluation?.score || 0);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 100 - (stdDev / 30) * 100);
};

const calculateImprovementScore = (challenges) => {
  if (challenges.length < 3) return 50;
  const scores = challenges.map(c => c.evaluation?.score || 0);
  const n = scores.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = scores.reduce((a, b) => a + b, 0);
  const xySum = scores.reduce((sum, score, i) => sum + i * score, 0);
  const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  return 50 + Math.min(50, Math.max(-50, slope * 25));
};

const calculateCompetencyDepthScore = async (studentId, challenges) => {
  try {
    const kalmanState = await KalmanState.findOne({ studentId });
    if (!kalmanState || !kalmanState.competencyStates) {
      return calculateBasicCompetencyScore(challenges);
    }
    const competencyScores = [];
    for (const [competency, state] of kalmanState.competencyStates.entries()) {
      const weight = COMPETENCY_WEIGHTS[competency] || 1.0;
      competencyScores.push(state.x * weight);
    }
    if (competencyScores.length === 0) return calculateBasicCompetencyScore(challenges);
    const avgScore = competencyScores.reduce((a, b) => a + b, 0) / competencyScores.length;
    const breadthBonus = (competencyScores.length / Object.keys(COMPETENCY_WEIGHTS).length) * 10;
    return Math.min(100, avgScore + breadthBonus);
  } catch (error) {
    return calculateBasicCompetencyScore(challenges);
  }
};

const calculateBasicCompetencyScore = (challenges) => {
  const competencyScores = new Map();
  challenges.forEach(challenge => {
    if (challenge.competencies && challenge.evaluation?.competencyScores) {
      challenge.competencies.forEach(competency => {
        const score = challenge.evaluation.competencyScores[competency] || 0;
        if (!competencyScores.has(competency)) competencyScores.set(competency, []);
        competencyScores.get(competency).push(score);
      });
    }
  });
  if (competencyScores.size === 0) return 50;
  let totalScore = 0, count = 0;
  for (const scores of competencyScores.values()) {
    totalScore += scores.reduce((a, b) => a + b, 0) / scores.length;
    count++;
  }
  return totalScore / count;
};

const calculateDifficultyScore = (challenges) => {
  if (challenges.length === 0) return 0;
  const difficultyScores = challenges.map(challenge => {
    const multiplier = DIFFICULTY_MULTIPLIERS[challenge.difficulty || 'medium'] || 1.0;
    return (challenge.evaluation?.score || 0) * multiplier;
  });
  const avgScore = difficultyScores.reduce((a, b) => a + b, 0) / difficultyScores.length;
  return Math.min(100, (avgScore / 160) * 100);
};

const calculateTimeEfficiencyScore = (challenges) => {
  if (challenges.length === 0) return 0;
  let totalEfficiency = 0, count = 0;
  challenges.forEach(challenge => {
    if (challenge.startedAt && challenge.submittedAt) {
      const timeTaken = (challenge.submittedAt - challenge.startedAt) / 60000;
      const estimatedTime = challenge.estimatedTime || 20;
      let efficiency;
      if (timeTaken <= estimatedTime * 0.8) efficiency = 70;
      else if (timeTaken <= estimatedTime * 1.2) efficiency = 100;
      else efficiency = Math.max(0, 100 - (timeTaken / estimatedTime - 1.2) * 50);
      totalEfficiency += efficiency;
      count++;
    }
  });
  return count > 0 ? totalEfficiency / count : 70;
};

const getSPIGrade = (spi) => {
  if (spi >= 90) return 'A+';
  if (spi >= 85) return 'A';
  if (spi >= 80) return 'A-';
  if (spi >= 75) return 'B+';
  if (spi >= 70) return 'B';
  if (spi >= 65) return 'B-';
  if (spi >= 60) return 'C+';
  if (spi >= 55) return 'C';
  if (spi >= 50) return 'C-';
  if (spi >= 45) return 'D+';
  if (spi >= 40) return 'D';
  return 'F';
};

const getSPILevel = (spi) => {
  if (spi >= 85) return 'Excellent';
  if (spi >= 70) return 'Very Good';
  if (spi >= 55) return 'Good';
  if (spi >= 40) return 'Satisfactory';
  return 'Needs Improvement';
};

const calculateSPITrend = async (studentId, options = {}) => {
  const { intervals = 5, periodStart = null, periodEnd = null } = options;
  try {
    const student = await Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    const challengeQuery = { studentId, status: 'evaluated', submittedAt: { $exists: true } };
    if (periodStart) challengeQuery.submittedAt.$gte = new Date(periodStart);
    if (periodEnd) challengeQuery.submittedAt.$lte = new Date(periodEnd);
    const challenges = await Challenge.find(challengeQuery).sort({ submittedAt: 1 });
    if (challenges.length < intervals) return { trend: 'insufficient_data', dataPoints: [] };
    const chunkSize = Math.ceil(challenges.length / intervals);
    const dataPoints = [];
    for (let i = 0; i < intervals; i++) {
      const chunk = challenges.slice(i * chunkSize, Math.min((i + 1) * chunkSize, challenges.length));
      const spi = Math.round((calculateAccuracyScore(chunk) * SPI_WEIGHTS.accuracy) + (calculateConsistencyScore(chunk) * SPI_WEIGHTS.consistency) + (calculateImprovementScore(chunk) * SPI_WEIGHTS.improvement) + (calculateDifficultyScore(chunk) * SPI_WEIGHTS.challengeDifficulty));
      dataPoints.push({ interval: i + 1, spi, challengeCount: chunk.length, avgScore: Math.round(calculateAccuracyScore(chunk)), period: { start: chunk[0].submittedAt, end: chunk[chunk.length - 1].submittedAt } });
    }
    const change = dataPoints[dataPoints.length - 1].spi - dataPoints[0].spi;
    const trend = change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable';
    return { trend, change, dataPoints, summary: { highest: Math.max(...dataPoints.map(d => d.spi)), lowest: Math.min(...dataPoints.map(d => d.spi)), current: dataPoints[dataPoints.length - 1].spi } };
  } catch (error) {
    console.error('SPI trend error:', error);
    throw error;
  }
};

const compareSPIWithClass = async (studentId) => {
  try {
    const student = await Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    const studentSPI = await calculateSPI(studentId);
    const classmates = await Student.find({ schoolId: student.schoolId, class: student.class, section: student.section, studentId: { $ne: studentId } });
    const classSPIs = (await Promise.all(classmates.map(async (c) => { try { return (await calculateSPI(c.studentId)).spi; } catch { return null; } }))).filter(s => s !== null);
    if (classSPIs.length === 0) return { studentSPI: studentSPI.spi, classAverage: null, percentile: null, ranking: null };
    const classAverage = classSPIs.reduce((a, b) => a + b, 0) / classSPIs.length;
    const percentile = Math.round((classSPIs.filter(s => s < studentSPI.spi).length / classSPIs.length) * 100);
    const ranking = [studentSPI.spi, ...classSPIs].sort((a, b) => b - a).indexOf(studentSPI.spi) + 1;
    return { studentSPI: studentSPI.spi, classAverage: Math.round(classAverage), percentile, ranking, totalStudents: classSPIs.length + 1, difference: Math.round(studentSPI.spi - classAverage) };
  } catch (error) {
    console.error('SPI comparison error:', error);
    throw error;
  }
};

module.exports = { calculateSPI, calculateSPITrend, compareSPIWithClass, calculateAccuracyScore, calculateConsistencyScore, calculateImprovementScore, calculateCompetencyDepthScore, calculateDifficultyScore, calculateTimeEfficiencyScore, getSPIGrade, getSPILevel, SPI_WEIGHTS, DIFFICULTY_MULTIPLIERS, COMPETENCY_WEIGHTS };
*/


/**
 * SPI SERVICE - INTEGRATED WITH ADAPTIVE ENGINE
 * Integrates: Kalman Filter, HMM Model, Bayesian Network
 * 
 * @module services/spi.service
 */

const { Student, Challenge, KalmanState, MetaParameters } = require('../models');
const { HMM_STATES } = require('../config/constants');

// Import algorithms
const KalmanFilter = require('../algorithms/kalman.filter');
const HMMModel = require('../algorithms/hmm.model');
const BayesianNetwork = require('../algorithms/bayesian.network');

// ============================================================================
// SPI CALCULATION WITH KALMAN SMOOTHING
// ============================================================================

/**
 * Calculate Student Performance Index with Kalman smoothing
 * 
 * INTEGRATION: Kalman Filter smooths SPI fluctuations
 * 
 * @param {String} studentId - Student ID
 * @param {Object} options - Calculation options
 * @returns {Promise<Object>} SPI data with Kalman estimate
 */
const calculateSPI = async (studentId, options = {}) => {
  const { periodStart = null, periodEnd = null, includeBreakdown = true } = options;
  
  try {
    const student = await Student.findOne({ studentId });
    if (!student) throw new Error('Student not found');
    
    // Get evaluated challenges
    const challengeQuery = {
      studentId,
      status: 'evaluated'
    };
    
    if (periodStart || periodEnd) {
      challengeQuery.submittedAt = {};
      if (periodStart) challengeQuery.submittedAt.$gte = new Date(periodStart);
      if (periodEnd) challengeQuery.submittedAt.$lte = new Date(periodEnd);
    }
    
    const challenges = await Challenge.find(challengeQuery).sort({ submittedAt: 1 });
    
    if (challenges.length === 0) {
      return {
        spi: 0,
        kalman_estimate: 0,
        kalman_uncertainty: 100,
        grade: 'N/A',
        learning_state: HMM_STATES.STRUGGLING,
        components: {},
        message: 'No evaluated challenges found'
      };
    }
    
    // Calculate raw SPI components
    const accuracyScore = calculateAccuracyScore(challenges);
    const consistencyScore = calculateConsistencyScore(challenges);
    const improvementScore = calculateImprovementScore(challenges);
    
    // Raw SPI (before Kalman smoothing)
    const rawSPI = Math.round(
      (accuracyScore * 0.35) +
      (consistencyScore * 0.20) +
      (improvementScore * 0.15)
    );
    
    // ========================================================================
    // INTEGRATION 1: KALMAN FILTER - Smooth SPI fluctuations
    // ========================================================================
    let kalmanEstimate = rawSPI;
    let kalmanUncertainty = 100;
    
    try {
      const kalman = new KalmanFilter(studentId);
      await kalman.initialize();
      
      // Update Kalman with latest performance
      const latestScore = challenges[challenges.length - 1].evaluation?.score || 0;
      const kalmanState = await kalman.update(latestScore, {
        simulationType: challenges[challenges.length - 1].simulationType,
        difficulty: challenges[challenges.length - 1].difficulty
      });
      
      kalmanEstimate = Math.round(kalmanState.estimatedAbility);
      kalmanUncertainty = Math.round(kalmanState.uncertainty);
      
    } catch (error) {
      console.error('Kalman filter error:', error);
      // Fall back to raw SPI if Kalman fails
    }
    
    // ========================================================================
    // INTEGRATION 2: HMM MODEL - Determine learning state
    // ========================================================================
    let learningState = HMM_STATES.LEARNING;
    
    try {
      const hmm = new HMMModel(studentId);
      await hmm.initialize();
      
      learningState = await hmm.getCurrentState();
      
      // Optionally transition based on recent performance
      const recentPerformance = challenges.slice(-5).map(c => c.evaluation?.score || 0);
      const avgRecent = recentPerformance.reduce((a, b) => a + b, 0) / recentPerformance.length;
      
      if (shouldTransitionState(learningState, avgRecent)) {
        learningState = await hmm.transition({
          performance: avgRecent,
          consistency: consistencyScore,
          improvement: improvementScore > 0
        });
      }
      
    } catch (error) {
      console.error('HMM model error:', error);
    }
    
    // ========================================================================
    // INTEGRATION 3: BAYESIAN NETWORK - Concept mastery
    // ========================================================================
    let conceptMastery = {};
    
    try {
      const bayesianNet = new BayesianNetwork(studentId);
      await bayesianNet.initialize();
      
      // Get current concept beliefs
      conceptMastery = await bayesianNet.getConceptMastery();
      
      // Update beliefs based on recent challenges
      for (const challenge of challenges.slice(-10)) {
        if (challenge.evaluation?.competencyScores) {
          for (const [concept, score] of Object.entries(challenge.evaluation.competencyScores)) {
            if (score >= 70) {
              await bayesianNet.updateBelief(concept, 'success');
            } else {
              await bayesianNet.updateBelief(concept, 'failure');
            }
          }
        }
      }
      
      // Refresh mastery after updates
      conceptMastery = await bayesianNet.getConceptMastery();
      
    } catch (error) {
      console.error('Bayesian network error:', error);
    }
    
    // ========================================================================
    // BUILD FINAL SPI RESPONSE
    // ========================================================================
    
    const result = {
      spi: kalmanEstimate, // Use Kalman-smoothed SPI
      spi_raw: rawSPI, // Original unsmoothed SPI
      kalman_estimate: kalmanEstimate,
      kalman_uncertainty: kalmanUncertainty,
      grade: getSPIGrade(kalmanEstimate),
      learning_state: learningState,
      concept_mastery: conceptMastery,
      totalChallenges: challenges.length,
      calculatedAt: new Date()
    };
    
    if (includeBreakdown) {
      result.components = {
        accuracy: {
          score: Math.round(accuracyScore),
          weight: 0.35,
          contribution: Math.round(accuracyScore * 0.35)
        },
        consistency: {
          score: Math.round(consistencyScore),
          weight: 0.20,
          contribution: Math.round(consistencyScore * 0.20)
        },
        improvement: {
          score: Math.round(improvementScore),
          weight: 0.15,
          contribution: Math.round(improvementScore * 0.15)
        }
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('SPI calculation error:', error);
    throw error;
  }
};

/**
 * Determine if HMM state transition is needed
 */
function shouldTransitionState(currentState, avgPerformance) {
  if (currentState === HMM_STATES.STRUGGLING && avgPerformance >= 70) return true;
  if (currentState === HMM_STATES.LEARNING && avgPerformance >= 85) return true;
  if (currentState === HMM_STATES.MASTERING && avgPerformance < 60) return true;
  if (currentState === HMM_STATES.EXPERT && avgPerformance < 75) return true;
  return false;
}

// ============================================================================
// HELPER FUNCTIONS (Keep your existing implementations)
// ============================================================================

const calculateAccuracyScore = (challenges) => {
  if (challenges.length === 0) return 0;
  const totalScore = challenges.reduce((sum, challenge) => sum + (challenge.evaluation?.score || 0), 0);
  return totalScore / challenges.length;
};

const calculateConsistencyScore = (challenges) => {
  if (challenges.length < 2) return 100;
  const scores = challenges.map(c => c.evaluation?.score || 0);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 100 - (stdDev / 30) * 100);
};

const calculateImprovementScore = (challenges) => {
  if (challenges.length < 3) return 50;
  const scores = challenges.map(c => c.evaluation?.score || 0);
  const n = scores.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = scores.reduce((a, b) => a + b, 0);
  const xySum = scores.reduce((sum, score, i) => sum + i * score, 0);
  const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  return 50 + Math.min(50, Math.max(-50, slope * 25));
};

const getSPIGrade = (spi) => {
  if (spi >= 90) return 'A+';
  if (spi >= 85) return 'A';
  if (spi >= 80) return 'A-';
  if (spi >= 75) return 'B+';
  if (spi >= 70) return 'B';
  if (spi >= 65) return 'B-';
  if (spi >= 60) return 'C+';
  if (spi >= 55) return 'C';
  if (spi >= 50) return 'C-';
  return 'F';
};

const getSPILevel = (spi) => {
  if (spi >= 85) return 'Excellent';
  if (spi >= 70) return 'Very Good';
  if (spi >= 55) return 'Good';
  if (spi >= 40) return 'Satisfactory';
  return 'Needs Improvement';
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  calculateSPI,
  calculateAccuracyScore,
  calculateConsistencyScore,
  calculateImprovementScore,
  getSPIGrade,
  getSPILevel
};