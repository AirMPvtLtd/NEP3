// algorithms/difficulty.calibration.js
/**
 * DIFFICULTY CALIBRATION - COMPLETE PRODUCTION VERSION
 * Item Response Theory (IRT) based difficulty calibration
 * 
 * @module algorithms/difficulty.calibration
 */

const { MetaParameters, Challenge, Student } = require('../models');

// ============================================================================
// IRT CONFIGURATION
// ============================================================================

const IRT_MODELS = {
  ONE_PARAM: '1PL',      // Rasch model (difficulty only)
  TWO_PARAM: '2PL',      // 2-parameter (difficulty + discrimination)
  THREE_PARAM: '3PL'     // 3-parameter (difficulty + discrimination + guessing)
};

const DEFAULT_CONFIG = {
  // Model type
  model: IRT_MODELS.TWO_PARAM,
  
  // IRT parameters
  irt: {
    // Difficulty parameter (b) - centered at 0
    defaultDifficulty: 0.0,
    difficultyRange: [-3, 3],
    
    // Discrimination parameter (a) - typically 0.5 to 2.5
    defaultDiscrimination: 1.0,
    discriminationRange: [0.5, 2.5],
    
    // Guessing parameter (c) - typically 0 to 0.3
    defaultGuessing: 0.0,
    guessingRange: [0, 0.3]
  },
  
  // Ability estimation
  ability: {
    defaultAbility: 0.0,
    abilityRange: [-3, 3],
    maxIterations: 20,
    convergenceTolerance: 0.01
  },
  
  // Calibration
  calibration: {
    minResponses: 5,
    learningRate: 0.1,
    maxIterations: 50
  }
};

// ============================================================================
// DIFFICULTY CALIBRATION CLASS
// ============================================================================

class DifficultyCalibration {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Item parameters (challenge ID -> parameters)
    this.itemParameters = new Map();
    
    // Person abilities (student ID -> ability)
    this.personAbilities = new Map();
    
    // Response data
    this.responses = [];
  }
  
  /**
   * Calculate probability of correct response (IRT model)
   * @param {Number} ability - Person ability (theta)
   * @param {Number} difficulty - Item difficulty (b)
   * @param {Number} discrimination - Item discrimination (a)
   * @param {Number} guessing - Guessing parameter (c)
   * @returns {Number} Probability (0-1)
   */
  calculateProbability(ability, difficulty, discrimination = 1.0, guessing = 0.0) {
    const model = this.config.model;
    
    switch (model) {
      case IRT_MODELS.ONE_PARAM: {
        // Rasch model: P(θ) = exp(θ - b) / (1 + exp(θ - b))
        const exponent = ability - difficulty;
        return Math.exp(exponent) / (1 + Math.exp(exponent));
      }
      
      case IRT_MODELS.TWO_PARAM: {
        // 2PL: P(θ) = 1 / (1 + exp(-a(θ - b)))
        const exponent = discrimination * (ability - difficulty);
        return 1 / (1 + Math.exp(-exponent));
      }
      
      case IRT_MODELS.THREE_PARAM: {
        // 3PL: P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
        const exponent = discrimination * (ability - difficulty);
        const twoPL = 1 / (1 + Math.exp(-exponent));
        return guessing + (1 - guessing) * twoPL;
      }
      
      default:
        return 0.5;
    }
  }
  
  /**
   * Estimate person ability using Maximum Likelihood Estimation
   * @param {Array} responses - Array of {itemId, score, itemParams}
   * @returns {Number} Estimated ability
   */
  estimateAbility(responses) {
    if (responses.length === 0) {
      return this.config.ability.defaultAbility;
    }
    
    let ability = this.config.ability.defaultAbility;
    
    for (let iter = 0; iter < this.config.ability.maxIterations; iter++) {
      let firstDerivative = 0;
      let secondDerivative = 0;
      
      responses.forEach(response => {
        const { score, itemParams } = response;
        const { difficulty, discrimination, guessing } = itemParams;
        
        const prob = this.calculateProbability(ability, difficulty, discrimination, guessing);
        const q = 1 - prob;
        
        if (this.config.model === IRT_MODELS.THREE_PARAM) {
          const pMinusC = prob - guessing;
          const derivative = discrimination * pMinusC * q / ((1 - guessing) * prob);
          
          firstDerivative += (score - prob) * derivative;
          secondDerivative -= derivative * derivative * q;
        } else {
          firstDerivative += discrimination * (score - prob);
          secondDerivative -= discrimination * discrimination * prob * q;
        }
      });
      
      if (secondDerivative === 0) break;
      
      const abilityChange = -firstDerivative / secondDerivative;
      ability += abilityChange;
      
      // Constrain ability
      ability = Math.max(
        this.config.ability.abilityRange[0],
        Math.min(this.config.ability.abilityRange[1], ability)
      );
      
      if (Math.abs(abilityChange) < this.config.ability.convergenceTolerance) {
        break;
      }
    }
    
    return ability;
  }
  
  /**
   * Calibrate item parameters using responses
   * @param {String} itemId - Item ID
   * @param {Array} responses - Array of {studentId, ability, score}
   * @returns {Object} Calibrated parameters
   */
  calibrateItem(itemId, responses) {
    if (responses.length < this.config.calibration.minResponses) {
      return this.getDefaultItemParameters();
    }
    
    let difficulty = this.config.irt.defaultDifficulty;
    let discrimination = this.config.irt.defaultDiscrimination;
    let guessing = this.config.irt.defaultGuessing;
    
    const learningRate = this.config.calibration.learningRate;
    
    for (let iter = 0; iter < this.config.calibration.maxIterations; iter++) {
      let diffGradient = 0;
      let discGradient = 0;
      let guessGradient = 0;
      
      responses.forEach(response => {
        const { ability, score } = response;
        const prob = this.calculateProbability(ability, difficulty, discrimination, guessing);
        const error = score - prob;
        
        if (this.config.model === IRT_MODELS.TWO_PARAM || this.config.model === IRT_MODELS.THREE_PARAM) {
          const q = 1 - prob;
          diffGradient += discrimination * prob * q * error;
          discGradient += (ability - difficulty) * prob * q * error;
        } else {
          diffGradient += prob * (1 - prob) * error;
        }
        
        if (this.config.model === IRT_MODELS.THREE_PARAM) {
          guessGradient += (1 - prob) * error;
        }
      });
      
      // Update parameters
      difficulty -= learningRate * diffGradient / responses.length;
      
      if (this.config.model !== IRT_MODELS.ONE_PARAM) {
        discrimination += learningRate * discGradient / responses.length;
      }
      
      if (this.config.model === IRT_MODELS.THREE_PARAM) {
        guessing += learningRate * guessGradient / responses.length;
      }
      
      // Constrain parameters
      difficulty = Math.max(
        this.config.irt.difficultyRange[0],
        Math.min(this.config.irt.difficultyRange[1], difficulty)
      );
      
      discrimination = Math.max(
        this.config.irt.discriminationRange[0],
        Math.min(this.config.irt.discriminationRange[1], discrimination)
      );
      
      guessing = Math.max(
        this.config.irt.guessingRange[0],
        Math.min(this.config.irt.guessingRange[1], guessing)
      );
    }
    
    return { difficulty, discrimination, guessing };
  }
  
  /**
   * Get default item parameters
   * @returns {Object} Default parameters
   */
  getDefaultItemParameters() {
    return {
      difficulty: this.config.irt.defaultDifficulty,
      discrimination: this.config.irt.defaultDiscrimination,
      guessing: this.config.irt.defaultGuessing
    };
  }
  
  /**
   * Calculate information function
   * @param {Number} ability - Ability level
   * @param {Object} itemParams - Item parameters
   * @returns {Number} Information value
   */
  calculateInformation(ability, itemParams) {
    const { difficulty, discrimination, guessing } = itemParams;
    const prob = this.calculateProbability(ability, difficulty, discrimination, guessing);
    const q = 1 - prob;
    
    if (this.config.model === IRT_MODELS.THREE_PARAM) {
      const pMinusC = prob - guessing;
      return discrimination * discrimination * pMinusC * pMinusC * q / 
             ((1 - guessing) * (1 - guessing) * prob);
    }
    
    return discrimination * discrimination * prob * q;
  }
  
  /**
   * Calculate test information
   * @param {Number} ability - Ability level
   * @param {Array} items - Array of item parameters
   * @returns {Number} Total information
   */
  calculateTestInformation(ability, items) {
    return items.reduce((sum, itemParams) => {
      return sum + this.calculateInformation(ability, itemParams);
    }, 0);
  }
  
  /**
   * Calculate standard error of measurement
   * @param {Number} ability - Ability level
   * @param {Array} items - Array of item parameters
   * @returns {Number} Standard error
   */
  calculateSEM(ability, items) {
    const information = this.calculateTestInformation(ability, items);
    return information > 0 ? 1 / Math.sqrt(information) : Infinity;
  }
  
  /**
   * Map IRT difficulty to nominal difficulty level
   * @param {Number} irtDifficulty - IRT difficulty parameter
   * @returns {String} Difficulty level
   */
  mapToNominalDifficulty(irtDifficulty) {
    if (irtDifficulty < -1.5) return 'very_easy';
    if (irtDifficulty < -0.5) return 'easy';
    if (irtDifficulty < 0.5) return 'medium';
    if (irtDifficulty < 1.5) return 'hard';
    return 'expert';
  }
  
  /**
   * Map nominal difficulty to IRT difficulty
   * @param {String} nominalDifficulty - Difficulty level
   * @returns {Number} IRT difficulty
   */
  mapFromNominalDifficulty(nominalDifficulty) {
    const mapping = {
      'very_easy': -2.0,
      'easy': -1.0,
      'medium': 0.0,
      'hard': 1.0,
      'very_hard': 1.5,
      'expert': 2.0
    };
    return mapping[nominalDifficulty] || 0.0;
  }
  
  /**
   * Select optimal next item (adaptive testing)
   * @param {Number} ability - Current ability estimate
   * @param {Array} availableItems - Available item parameters
   * @returns {Object} Selected item
   */
  selectNextItem(ability, availableItems) {
    let maxInformation = -Infinity;
    let selectedItem = null;
    
    availableItems.forEach(item => {
      const information = this.calculateInformation(ability, item.params);
      
      if (information > maxInformation) {
        maxInformation = information;
        selectedItem = item;
      }
    });
    
    return {
      item: selectedItem,
      information: maxInformation,
      reason: 'Maximum information at current ability level'
    };
  }
  
  /**
   * Get item characteristic curve points
   * @param {Object} itemParams - Item parameters
   * @param {Number} points - Number of points
   * @returns {Array} ICC points
   */
  getItemCharacteristicCurve(itemParams, points = 50) {
    const { difficulty, discrimination, guessing } = itemParams;
    const curve = [];
    
    const abilityRange = this.config.ability.abilityRange;
    const step = (abilityRange[1] - abilityRange[0]) / (points - 1);
    
    for (let i = 0; i < points; i++) {
      const ability = abilityRange[0] + i * step;
      const probability = this.calculateProbability(
        ability,
        difficulty,
        discrimination,
        guessing
      );
      
      curve.push({
        ability: Math.round(ability * 100) / 100,
        probability: Math.round(probability * 1000) / 1000
      });
    }
    
    return curve;
  }
  
  /**
   * Get test characteristic curve
   * @param {Array} items - Array of item parameters
   * @param {Number} points - Number of points
   * @returns {Array} TCC points
   */
  getTestCharacteristicCurve(items, points = 50) {
    const curve = [];
    
    const abilityRange = this.config.ability.abilityRange;
    const step = (abilityRange[1] - abilityRange[0]) / (points - 1);
    
    for (let i = 0; i < points; i++) {
      const ability = abilityRange[0] + i * step;
      
      const expectedScore = items.reduce((sum, itemParams) => {
        return sum + this.calculateProbability(
          ability,
          itemParams.difficulty,
          itemParams.discrimination,
          itemParams.guessing
        );
      }, 0);
      
      curve.push({
        ability: Math.round(ability * 100) / 100,
        expectedScore: Math.round(expectedScore * 100) / 100,
        maxScore: items.length
      });
    }
    
    return curve;
  }
  
  /**
   * Get state
   * @returns {Object} State
   */
  getState() {
    return {
      itemParameters: Array.from(this.itemParameters.entries()),
      personAbilities: Array.from(this.personAbilities.entries()),
      responseCount: this.responses.length
    };
  }
  
  /**
   * Set state
   * @param {Object} state - State
   */
  setState(state) {
    if (state.itemParameters) {
      this.itemParameters = new Map(state.itemParameters);
    }
    if (state.personAbilities) {
      this.personAbilities = new Map(state.personAbilities);
    }
  }
}

// ============================================================================
// STUDENT CALIBRATION MANAGEMENT
// ============================================================================

/**
 * Get or create calibration for student
 * @param {String} studentId - Student ID
 * @returns {Promise<DifficultyCalibration>}
 */
const getStudentCalibration = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  const calibration = new DifficultyCalibration();
  
  if (metaParams && metaParams.irtParameters) {
    calibration.setState(metaParams.irtParameters);
  }
  
  return calibration;
};

/**
 * Save calibration state
 * @param {String} studentId - Student ID
 * @param {DifficultyCalibration} calibration - Calibration
 * @returns {Promise}
 */
const saveStudentCalibration = async (studentId, calibration) => {
  const state = calibration.getState();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      irtParameters: state,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Estimate student ability
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const estimateStudentAbility = async (studentId) => {
  const calibration = await getStudentCalibration(studentId);
  
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated'
  }).limit(50);
  
  if (challenges.length === 0) {
    return {
      ability: DEFAULT_CONFIG.ability.defaultAbility,
      confidence: 'none',
      responses: 0
    };
  }
  
  const responses = challenges.map(challenge => {
    const itemParams = calibration.itemParameters.get(challenge.challengeId) || 
                      calibration.getDefaultItemParameters();
    
    itemParams.difficulty = calibration.mapFromNominalDifficulty(challenge.difficulty);
    
    return {
      itemId: challenge.challengeId,
      score: (challenge.evaluation?.score || 0) / 100,
      itemParams
    };
  });
  
  const ability = calibration.estimateAbility(responses);
  
  calibration.personAbilities.set(studentId, ability);
  await saveStudentCalibration(studentId, calibration);
  
  const itemParamsList = responses.map(r => r.itemParams);
  const sem = calibration.calculateSEM(ability, itemParamsList);
  
  return {
    ability: Math.round(ability * 100) / 100,
    standardError: Math.round(sem * 100) / 100,
    confidence: sem < 0.3 ? 'high' : sem < 0.5 ? 'medium' : 'low',
    responses: responses.length,
    nominalLevel: calibration.mapToNominalDifficulty(ability)
  };
};

/**
 * Calibrate challenge difficulty
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Object>}
 */
const calibrateChallengeDifficulty = async (challengeId) => {
  const challenge = await Challenge.findOne({ challengeId });
  
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  // Get all responses to this challenge
  const responses = await Challenge.find({
    simulationType: challenge.simulationType,
    difficulty: challenge.difficulty,
    status: 'evaluated'
  }).limit(100);
  
  if (responses.length < DEFAULT_CONFIG.calibration.minResponses) {
    return {
      calibrated: false,
      message: `Insufficient responses (need ${DEFAULT_CONFIG.calibration.minResponses}, have ${responses.length})`,
      parameters: null
    };
  }
  
  const calibration = new DifficultyCalibration();
  
  // Prepare response data
  const responseData = [];
  
  for (const resp of responses) {
    const studentCalib = await getStudentCalibration(resp.studentId);
    const ability = studentCalib.personAbilities.get(resp.studentId) || 
                   DEFAULT_CONFIG.ability.defaultAbility;
    
    responseData.push({
      studentId: resp.studentId,
      ability,
      score: (resp.evaluation?.score || 0) / 100
    });
  }
  
  const parameters = calibration.calibrateItem(challengeId, responseData);
  
  return {
    calibrated: true,
    parameters,
    responses: responseData.length,
    nominalDifficulty: calibration.mapToNominalDifficulty(parameters.difficulty),
    icc: calibration.getItemCharacteristicCurve(parameters, 20)
  };
};

/**
 * Select optimal challenge
 * @param {String} studentId - Student ID
 * @param {String} simulationType - Simulation type
 * @returns {Promise<Object>}
 */
const selectOptimalChallenge = async (studentId, simulationType = null) => {
  const abilityData = await estimateStudentAbility(studentId);
  const calibration = new DifficultyCalibration();
  
  // Get available challenges
  const query = { status: 'template' };
  if (simulationType) {
    query.simulationType = simulationType;
  }
  
  const availableChallenges = await Challenge.find(query).limit(50);
  
  if (availableChallenges.length === 0) {
    return {
      challenge: null,
      message: 'No challenges available'
    };
  }
  
  const availableItems = availableChallenges.map(challenge => ({
    challengeId: challenge.challengeId,
    simulationType: challenge.simulationType,
    params: {
      difficulty: calibration.mapFromNominalDifficulty(challenge.difficulty),
      discrimination: DEFAULT_CONFIG.irt.defaultDiscrimination,
      guessing: DEFAULT_CONFIG.irt.defaultGuessing
    }
  }));
  
  const selection = calibration.selectNextItem(abilityData.ability, availableItems);
  
  return {
    selectedChallenge: selection.item?.challengeId,
    information: Math.round(selection.information * 100) / 100,
    reason: selection.reason,
    studentAbility: abilityData.ability
  };
};

/**
 * Get difficulty statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getDifficultyStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.irtParameters) {
    return {
      initialized: false,
      message: 'No IRT calibration data found'
    };
  }
  
  const calibration = new DifficultyCalibration();
  calibration.setState(metaParams.irtParameters);
  
  const ability = calibration.personAbilities.get(studentId) || 
                 DEFAULT_CONFIG.ability.defaultAbility;
  
  return {
    initialized: true,
    ability: Math.round(ability * 100) / 100,
    itemsCalibrated: calibration.itemParameters.size,
    lastUpdated: metaParams.lastUpdated
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  DifficultyCalibration,
  
  // Constants
  IRT_MODELS,
  
  // Student management
  getStudentCalibration,
  saveStudentCalibration,
  
  // Ability estimation
  estimateStudentAbility,
  
  // Item calibration
  calibrateChallengeDifficulty,
  
  // Adaptive testing
  selectOptimalChallenge,
  
  // Statistics
  getDifficultyStatistics,
  
  // Configuration
  DEFAULT_CONFIG
};