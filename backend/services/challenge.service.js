// services/challenge.service.js
/**
 * CHALLENGE SERVICE - COMPLETE PRODUCTION VERSION
 * Challenge generation, evaluation, and management
 * 
 * @module services/challenge.service
 */


const { SIM_CONTEXTS, CHALLENGE_STYLES, HMM_STATES } = require('../config/constants');
const { Student, Challenge, KalmanState, MetaParameters, ChallengeLimit } = require('../models');

// Import algorithms
const DifficultyCalibration = require('../algorithms/difficulty.calibration');
const AttentionMechanism = require('../algorithms/attention.mechanism');
const PIDController = require('../algorithms/pid.controller');
const KalmanFilter = require('../algorithms/kalman.filter');
const HMMModel = require('../algorithms/hmm.model');
const BayesianNetwork = require('../algorithms/bayesian.network');

const mistralService = require('./mistral.service');
const { nanoid } = require('nanoid');

// ============================================================================
// SIMULATION CONFIGURATIONS
// ============================================================================

const SIMULATION_CONFIGS = {
  'projectile_motion': {
    name: 'Projectile Motion',
    competencies: ['Mathematical Reasoning', 'Problem Solving', 'Scientific Analysis'],
    parameters: ['initial_velocity', 'launch_angle', 'height'],
    expectedOutputs: ['max_height', 'range', 'time_of_flight'],
    difficulty_ranges: {
      easy: { velocity: [10, 30], angle: [30, 60] },
      medium: { velocity: [30, 60], angle: [15, 75] },
      hard: { velocity: [60, 100], angle: [5, 85] }
    }
  },
  'free_fall': {
    name: 'Free Fall Motion',
    competencies: ['Mathematical Reasoning', 'Scientific Analysis'],
    parameters: ['initial_height', 'initial_velocity'],
    expectedOutputs: ['final_velocity', 'time_to_ground', 'impact_energy'],
    difficulty_ranges: {
      easy: { height: [10, 50], velocity: [0, 10] },
      medium: { height: [50, 150], velocity: [0, 20] },
      hard: { height: [150, 500], velocity: [0, 50] }
    }
  },
  'circular_motion': {
    name: 'Circular Motion',
    competencies: ['Mathematical Reasoning', 'Problem Solving'],
    parameters: ['radius', 'velocity', 'mass'],
    expectedOutputs: ['centripetal_force', 'angular_velocity', 'period'],
    difficulty_ranges: {
      easy: { radius: [1, 5], velocity: [5, 15] },
      medium: { radius: [5, 20], velocity: [15, 40] },
      hard: { radius: [20, 100], velocity: [40, 100] }
    }
  },
  'simple_pendulum': {
    name: 'Simple Pendulum',
    competencies: ['Mathematical Reasoning', 'Scientific Analysis'],
    parameters: ['length', 'angle', 'mass'],
    expectedOutputs: ['period', 'frequency', 'max_velocity'],
    difficulty_ranges: {
      easy: { length: [0.5, 2], angle: [5, 15] },
      medium: { length: [2, 5], angle: [15, 30] },
      hard: { length: [5, 15], angle: [30, 60] }
    }
  },
  'inclined_plane': {
    name: 'Inclined Plane',
    competencies: ['Problem Solving', 'Mathematical Reasoning'],
    parameters: ['angle', 'mass', 'friction_coefficient'],
    expectedOutputs: ['acceleration', 'normal_force', 'friction_force'],
    difficulty_ranges: {
      easy: { angle: [10, 30], friction: [0, 0.2] },
      medium: { angle: [30, 50], friction: [0.2, 0.5] },
      hard: { angle: [50, 70], friction: [0.5, 0.8] }
    }
  }
};

// ============================================================================
// CHALLENGE GENERATION
// ============================================================================

/**
 * Generate new challenge for student
 * @param {Object} options - Generation options
 * @returns {Promise<Object>}
 */
const createChallenge = async (options) => {
  const {
    studentId,
    simulationType,
    difficulty = 'medium',
    customParameters = null
  } = options;
  
  // Validate student
  const student = await Student.findOne({ studentId });
  if (!student) {
    throw new Error('Student not found');
  }
  
  // Check rate limits
  const limitCheck = await ChallengeLimit.canGenerate(studentId, student.schoolId, simulationType);
  if (!limitCheck.allowed) {
    throw new Error(`Rate limit exceeded: ${limitCheck.reason}`);
  }
  
  // Validate simulation type
  if (!SIMULATION_CONFIGS[simulationType]) {
    throw new Error(`Invalid simulation type: ${simulationType}`);
  }
  
  const config = SIMULATION_CONFIGS[simulationType];
  
  // Generate challenge using AI
  let challengeData;
  try {
    const aiResponse = await generateChallenge({
      simulationType,
      difficulty,
      competencies: config.competencies,
      class: student.class,
      studentLevel: student.level || 'intermediate'
    });
    
    challengeData = aiResponse.challenge;
    
  } catch (error) {
    console.error('AI generation failed, using template:', error);
    challengeData = generateTemplateChallenge(simulationType, difficulty, config);
  }
  
  // Create challenge document
  const challenge = new Challenge({
    challengeId: `CHAL-${nanoid(10).toUpperCase()}`,
    studentId,
    schoolId: student.schoolId,
    simulationType,
    difficulty,
    title: challengeData.title,
    description: challengeData.description,
    objectives: challengeData.objectives || [],
    parameters: challengeData.parameters || [],
    expectedOutputs: challengeData.expectedOutputs || [],
    hints: challengeData.hints || [],
    successCriteria: challengeData.successCriteria || {},
    estimatedTime: challengeData.estimatedTime || 15,
    competencies: config.competencies,
    status: 'pending',
    metadata: {
      generatedBy: 'AI',
      aiModel: 'mistral-large-2411',
      template: false
    }
  });
  
  await challenge.save();
  
  // Record generation in limits
  await ChallengeLimit.recordGeneration(studentId, student.schoolId, simulationType);
  
  return challenge;
};

/**
 * Generate template challenge (fallback)
 * @param {String} simulationType - Simulation type
 * @param {String} difficulty - Difficulty level
 * @param {Object} config - Simulation config
 * @returns {Object}
 */
const generateTemplateChallenge = (simulationType, difficulty, config) => {
  const ranges = config.difficulty_ranges[difficulty];
  
  const parameters = config.parameters.map(param => {
    const range = ranges[param] || [1, 100];
    const defaultValue = Math.floor((range[0] + range[1]) / 2);
    
    return {
      name: param,
      label: param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: 'number',
      min: range[0],
      max: range[1],
      default: defaultValue,
      unit: getParameterUnit(param),
      description: `Enter ${param.replace(/_/g, ' ')}`
    };
  });
  
  const expectedOutputs = config.expectedOutputs.map(output => ({
    name: output,
    label: output.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    unit: getParameterUnit(output),
    description: `Calculate ${output.replace(/_/g, ' ')}`
  }));
  
  return {
    title: `${config.name} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level`,
    description: `Calculate the ${config.expectedOutputs.join(', ')} for this ${config.name.toLowerCase()} scenario.`,
    objectives: [
      `Understand ${config.name.toLowerCase()} principles`,
      'Apply mathematical formulas correctly',
      'Calculate accurate results'
    ],
    parameters,
    expectedOutputs,
    successCriteria: {
      accuracy: 0.95,
      completeness: 1.0,
      explanation: 'Provide correct calculations with appropriate units'
    },
    hints: [
      `Review the formulas for ${config.name.toLowerCase()}`,
      'Check your unit conversions',
      'Verify your calculations step by step'
    ],
    difficulty,
    estimatedTime: difficulty === 'easy' ? 10 : difficulty === 'medium' ? 15 : 20
  };
};

/**
 * Get parameter unit
 * @param {String} param - Parameter name
 * @returns {String}
 */
const getParameterUnit = (param) => {
  const units = {
    velocity: 'm/s',
    initial_velocity: 'm/s',
    final_velocity: 'm/s',
    max_velocity: 'm/s',
    angular_velocity: 'rad/s',
    height: 'm',
    initial_height: 'm',
    max_height: 'm',
    range: 'm',
    radius: 'm',
    length: 'm',
    angle: 'degrees',
    launch_angle: 'degrees',
    mass: 'kg',
    force: 'N',
    centripetal_force: 'N',
    normal_force: 'N',
    friction_force: 'N',
    time: 's',
    time_of_flight: 's',
    time_to_ground: 's',
    period: 's',
    frequency: 'Hz',
    acceleration: 'm/s²',
    energy: 'J',
    impact_energy: 'J',
    friction_coefficient: ''
  };
  
  return units[param] || '';
};

// ============================================================================
// CHALLENGE SUBMISSION
// ============================================================================

/**
 * Submit challenge answer
 * @param {String} challengeId - Challenge ID
 * @param {Object} answers - Student answers
 * @returns {Promise<Object>}
 */
const submitChallenge = async (challengeId, answers) => {
  const challenge = await Challenge.findOne({ challengeId });
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  if (challenge.status === 'evaluated') {
    throw new Error('Challenge already evaluated');
  }
  
  // Update challenge
  challenge.studentAnswer = answers;
  challenge.status = 'submitted';
  challenge.submittedAt = new Date();
  
  await challenge.save();
  
  return challenge;
};

// ============================================================================
// CHALLENGE EVALUATION
// ============================================================================

/**
 * Evaluate challenge answer
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Object>}
 */
const evaluateChallenge = async (challengeId) => {
  const challenge = await Challenge.findOne({ challengeId });
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  if (challenge.status !== 'submitted') {
    throw new Error('Challenge not submitted');
  }
  
  // Calculate expected answers
  const expectedAnswers = calculateExpectedAnswers(
    challenge.simulationType,
    challenge.studentAnswer?.parameters || {}
  );
  
  // Evaluate using AI
  let evaluation;
  try {
    const aiResponse = await evaluateAnswer({
      question: challenge.description,
      studentAnswer: challenge.studentAnswer,
      expectedAnswer: expectedAnswers,
      competencies: challenge.competencies,
      rubric: challenge.successCriteria
    });
    
    evaluation = aiResponse.evaluation;
    
  } catch (error) {
    console.error('AI evaluation failed, using rule-based:', error);
    evaluation = ruleBasedEvaluation(
      challenge.studentAnswer,
      expectedAnswers,
      challenge.competencies
    );
  }
  
  // Update challenge
  challenge.evaluation = {
    score: evaluation.score,
    breakdown: evaluation.breakdown,
    strengths: evaluation.strengths || [],
    weaknesses: evaluation.weaknesses || [],
    feedback: evaluation.feedback || 'Good effort!',
    suggestions: evaluation.suggestions || [],
    competencyScores: evaluation.competency_scores || {},
    evaluatedAt: new Date(),
    evaluatedBy: 'AI'
  };
  
  challenge.expectedAnswers = expectedAnswers;
  challenge.status = 'evaluated';
  challenge.evaluatedAt = new Date();
  
  await challenge.save();
  
  return challenge;
};

/**
 * Calculate expected answers
 * @param {String} simulationType - Simulation type
 * @param {Object} parameters - Input parameters
 * @returns {Object}
 */
const calculateExpectedAnswers = (simulationType, parameters) => {
  const g = 9.81; // gravity constant
  
  switch (simulationType) {
    case 'projectile_motion': {
      const v0 = parseFloat(parameters.initial_velocity) || 0;
      const angle = parseFloat(parameters.launch_angle) || 45;
      const h0 = parseFloat(parameters.height) || 0;
      
      const angleRad = angle * Math.PI / 180;
      const v0x = v0 * Math.cos(angleRad);
      const v0y = v0 * Math.sin(angleRad);
      
      const timeToMaxHeight = v0y / g;
      const maxHeight = h0 + (v0y * v0y) / (2 * g);
      const totalTime = (v0y + Math.sqrt(v0y * v0y + 2 * g * h0)) / g;
      const range = v0x * totalTime;
      
      return {
        max_height: { value: maxHeight, unit: 'm', tolerance: 0.1 },
        range: { value: range, unit: 'm', tolerance: 0.1 },
        time_of_flight: { value: totalTime, unit: 's', tolerance: 0.05 }
      };
    }
    
    case 'free_fall': {
      const h0 = parseFloat(parameters.initial_height) || 0;
      const v0 = parseFloat(parameters.initial_velocity) || 0;
      
      const timeToGround = (-v0 + Math.sqrt(v0 * v0 + 2 * g * h0)) / g;
      const finalVelocity = v0 + g * timeToGround;
      const mass = parseFloat(parameters.mass) || 1;
      const impactEnergy = 0.5 * mass * finalVelocity * finalVelocity;
      
      return {
        final_velocity: { value: finalVelocity, unit: 'm/s', tolerance: 0.1 },
        time_to_ground: { value: timeToGround, unit: 's', tolerance: 0.05 },
        impact_energy: { value: impactEnergy, unit: 'J', tolerance: 0.5 }
      };
    }
    
    case 'circular_motion': {
      const r = parseFloat(parameters.radius) || 1;
      const v = parseFloat(parameters.velocity) || 10;
      const m = parseFloat(parameters.mass) || 1;
      
      const centripetalForce = m * v * v / r;
      const angularVelocity = v / r;
      const period = 2 * Math.PI * r / v;
      
      return {
        centripetal_force: { value: centripetalForce, unit: 'N', tolerance: 0.1 },
        angular_velocity: { value: angularVelocity, unit: 'rad/s', tolerance: 0.05 },
        period: { value: period, unit: 's', tolerance: 0.05 }
      };
    }
    
    case 'simple_pendulum': {
      const L = parseFloat(parameters.length) || 1;
      const theta = parseFloat(parameters.angle) || 10;
      const m = parseFloat(parameters.mass) || 1;
      
      const period = 2 * Math.PI * Math.sqrt(L / g);
      const frequency = 1 / period;
      const maxVelocity = Math.sqrt(2 * g * L * (1 - Math.cos(theta * Math.PI / 180)));
      
      return {
        period: { value: period, unit: 's', tolerance: 0.05 },
        frequency: { value: frequency, unit: 'Hz', tolerance: 0.01 },
        max_velocity: { value: maxVelocity, unit: 'm/s', tolerance: 0.1 }
      };
    }
    
    case 'inclined_plane': {
      const angle = parseFloat(parameters.angle) || 30;
      const mass = parseFloat(parameters.mass) || 10;
      const mu = parseFloat(parameters.friction_coefficient) || 0.1;
      
      const angleRad = angle * Math.PI / 180;
      const normalForce = mass * g * Math.cos(angleRad);
      const frictionForce = mu * normalForce;
      const acceleration = g * (Math.sin(angleRad) - mu * Math.cos(angleRad));
      
      return {
        acceleration: { value: acceleration, unit: 'm/s²', tolerance: 0.1 },
        normal_force: { value: normalForce, unit: 'N', tolerance: 0.5 },
        friction_force: { value: frictionForce, unit: 'N', tolerance: 0.5 }
      };
    }
    
    default:
      return {};
  }
};

/**
 * Rule-based evaluation (fallback)
 * @param {Object} studentAnswer - Student answer
 * @param {Object} expectedAnswers - Expected answers
 * @param {Array} competencies - Competencies
 * @returns {Object}
 */
const ruleBasedEvaluation = (studentAnswer, expectedAnswers, competencies) => {
  const outputs = studentAnswer?.outputs || {};
  
  let totalScore = 0;
  let totalWeight = 0;
  const breakdown = {};
  
  // Evaluate each output
  Object.keys(expectedAnswers).forEach(key => {
    const expected = expectedAnswers[key];
    const actual = parseFloat(outputs[key]);
    
    if (!isNaN(actual)) {
      const difference = Math.abs(actual - expected.value);
      const tolerance = expected.tolerance || expected.value * 0.05;
      
      let score = 100;
      if (difference > tolerance) {
        score = Math.max(0, 100 - (difference / tolerance) * 50);
      }
      
      breakdown[key] = score;
      totalScore += score;
      totalWeight++;
    }
  });
  
  const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  // Generate competency scores
  const competencyScores = {};
  competencies.forEach(comp => {
    competencyScores[comp] = averageScore;
  });
  
  return {
    score: Math.round(averageScore),
    breakdown: {
      conceptual_understanding: Math.round(averageScore),
      mathematical_accuracy: Math.round(averageScore),
      problem_solving: Math.round(averageScore),
      explanation_quality: Math.round(averageScore * 0.8)
    },
    strengths: averageScore >= 80 ? ['Accurate calculations'] : [],
    weaknesses: averageScore < 60 ? ['Review formulas and calculations'] : [],
    feedback: averageScore >= 80 ? 'Excellent work!' : averageScore >= 60 ? 'Good effort, keep practicing!' : 'Review the concepts and try again.',
    suggestions: [],
    competency_scores: competencyScores
  };
};

// ============================================================================
// CHALLENGE MANAGEMENT
// ============================================================================

/**
 * Get challenge by ID
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Object>}
 */
const getChallengeById = async (challengeId) => {
  const challenge = await Challenge.findOne({ challengeId });
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  return challenge;
};

/**
 * Get student challenges
 * @param {String} studentId - Student ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
const getStudentChallenges = async (studentId, options = {}) => {
  const {
    status,
    simulationType,
    limit = 20,
    skip = 0
  } = options;
  
  const query = { studentId };
  if (status) query.status = status;
  if (simulationType) query.simulationType = simulationType;
  
  return await Challenge.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

/**
 * Delete challenge
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Object>}
 */
const deleteChallenge = async (challengeId) => {
  const challenge = await Challenge.findOne({ challengeId });
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  if (challenge.status === 'evaluated') {
    throw new Error('Cannot delete evaluated challenge');
  }
  
  await challenge.deleteOne();
  return { success: true, message: 'Challenge deleted' };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Generation
  createChallenge,
  generateTemplateChallenge,
  
  // Submission
  submitChallenge,
  
  // Evaluation
  evaluateChallenge,
  calculateExpectedAnswers,
  ruleBasedEvaluation,
  
  // Management
  getChallengeById,
  getStudentChallenges,
  deleteChallenge,
  
  // Configuration
  SIMULATION_CONFIGS
};