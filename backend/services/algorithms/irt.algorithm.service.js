/**
 * IRT ALGORITHM SERVICE - FIXED VERSION
 * Properly handles imports from algorithms module
 */

const { MetaParameters, Challenge, Student } = require('../../models');
const logger = require('../../utils/logger');

// Import the entire algorithms module
const algorithms = require('../../algorithms/difficulty.calibration');

class IRTAlgorithmService {
  constructor() {
    // Check if DifficultyCalibration is a class or needs to be instantiated differently
    if (algorithms && algorithms.DifficultyCalibration) {
      this.calibrator = new algorithms.DifficultyCalibration();
    } else if (typeof algorithms === 'function') {
      this.calibrator = new algorithms();
    } else {
      // Fallback: create a mock calibrator
      logger.warn('DifficultyCalibration not found, using mock calibrator');
      this.calibrator = this.createMockCalibrator();
    }
    
    this.itemBank = new Map();
  }

  /**
   * Create a mock calibrator for development
   */
  createMockCalibrator() {
    return {
      estimateAbility: (responses) => {
        // Simple average-based estimation
        const correct = responses.filter(r => r.correct === 1).length;
        const total = responses.length;
        const percentage = total > 0 ? (correct / total) * 100 : 50;
        
        // Map percentage to ability (-3 to +3 scale)
        return ((percentage - 50) / 50) * 3;
      },
      
      calibrateItem: (responses) => {
        if (responses.length < 10) {
          return null;
        }
        
        const correct = responses.filter(r => r.correct === 1).length;
        const p = correct / responses.length;
        
        // Simple difficulty estimation
        const difficulty = Math.log(p / (1 - p));
        
        return {
          difficulty: difficulty,
          discrimination: 1.0,
          guessing: 0.25
        };
      },
      
      calculateProbability: (ability, difficulty, discrimination = 1.0, guessing = 0.25) => {
        const exponent = discrimination * (ability - difficulty);
        return guessing + (1 - guessing) / (1 + Math.exp(-exponent));
      }
    };
  }

  /**
   * Map difficulty string to numerical value
   */
  mapDifficultyToB(difficulty) {
    const difficultyMap = {
      'very_easy': -2.0,
      'easy': -1.0,
      'medium': 0.0,
      'hard': 1.0,
      'very_hard': 2.0
    };
    return difficultyMap[difficulty] || 0.0;
  }

  /**
   * Map numerical difficulty to string
   */
  mapBToDifficulty(b) {
    if (b < -1.5) return 'very_easy';
    if (b < -0.5) return 'easy';
    if (b < 0.5) return 'medium';
    if (b < 1.5) return 'hard';
    return 'very_hard';
  }

  /**
   * Estimate student ability (θ)
   */
  async estimateStudentAbility(studentId) {
    try {
      const challenges = await Challenge.find({
        studentId,
        status: { $in: ['completed', 'evaluated'] }
      }).lean();

      if (challenges.length < 3) {
        return {
          ability: 0,
          standardError: 2.0,
          sampleSize: challenges.length,
          reliable: false,
          message: 'Insufficient data (need at least 3 challenges)'
        };
      }

      const responses = challenges.map(c => ({
        correct: (c.results?.totalScore || 0) >= 60 ? 1 : 0,
        difficulty: this.mapDifficultyToB(c.difficulty),
        discrimination: 1.0,
        guessing: 0.25
      }));

      const ability = this.calibrator.estimateAbility(responses);
      const se = this.calculateStandardError(ability, responses);

      // Store in database
      await MetaParameters.findOneAndUpdate(
        { userId: studentId },
        {
          irtAbility: ability,
          irtStandardError: se,
          irtSampleSize: challenges.length,
          irtLastUpdated: new Date(),
          $push: {
            irtHistory: {
              ability,
              standardError: se,
              sampleSize: challenges.length,
              timestamp: new Date()
            }
          }
        },
        { upsert: true, new: true }
      );

      return {
        ability,
        standardError: se,
        sampleSize: challenges.length,
        reliable: challenges.length >= 10 && se < 0.5,
        percentile: this.abilityToPercentile(ability),
        abilityLevel: this.getAbilityLevel(ability)
      };

    } catch (error) {
      logger.error('Estimate student ability error:', error);
      return {
        ability: 0,
        standardError: 2.0,
        sampleSize: 0,
        reliable: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate standard error
   */
  calculateStandardError(ability, responses) {
    if (responses.length === 0) return 2.0;
    
    let information = 0;
    
    responses.forEach(r => {
      const p = this.calibrator.calculateProbability(
        ability,
        r.difficulty,
        r.discrimination,
        r.guessing
      );
      
      const q = 1 - p;
      const pStar = (p - r.guessing) / (1 - r.guessing);
      const qStar = 1 - pStar;
      
      const itemInfo = (r.discrimination ** 2) * (pStar * qStar) / 
                      ((1 - r.guessing) ** 2 * p * q);
      
      information += itemInfo;
    });
    
    return information > 0 ? Math.sqrt(1 / information) : 2.0;
  }

  /**
   * Convert ability to percentile
   */
  abilityToPercentile(ability) {
    // Normal distribution approximation
    const mean = 0;
    const sd = 1;
    const z = (ability - mean) / sd;
    
    // Approximation of cumulative normal distribution
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    return Math.round((z > 0 ? 1 - p : p) * 100);
  }

  /**
   * Get ability level
   */
  getAbilityLevel(ability) {
    if (ability >= 2.0) return 'Very Advanced';
    if (ability >= 1.0) return 'Advanced';
    if (ability >= 0.0) return 'Average';
    if (ability >= -1.0) return 'Developing';
    return 'Beginning';
  }

  /**
   * Get optimal difficulty for student
   */
  async getOptimalDifficulty(studentId) {
    try {
      const abilityData = await this.estimateStudentAbility(studentId);
      
      if (!abilityData.reliable) {
        return {
          difficulty: 'medium',
          studentAbility: abilityData.ability,
          expectedSuccessRate: 50,
          reasoning: 'Insufficient data - using medium difficulty',
          reliable: false
        };
      }

      // Optimal difficulty is slightly above student ability
      const optimalB = abilityData.ability + 0.5;
      const difficulty = this.mapBToDifficulty(optimalB);
      
      // Calculate expected success rate
      const successRate = this.calibrator.calculateProbability(
        abilityData.ability,
        optimalB,
        1.0,
        0.25
      );

      return {
        difficulty,
        numericalDifficulty: optimalB,
        studentAbility: abilityData.ability,
        expectedSuccessRate: Math.round(successRate * 100),
        reasoning: `Selected to maximize learning at ability θ=${abilityData.ability.toFixed(2)}`,
        reliable: true
      };

    } catch (error) {
      logger.error('Get optimal difficulty error:', error);
      return {
        difficulty: 'medium',
        studentAbility: 0,
        expectedSuccessRate: 50,
        reasoning: 'Error occurred - using medium difficulty',
        reliable: false,
        error: error.message
      };
    }
  }

  /**
   * Calibrate an item (challenge)
   */
  async calibrateItem(challengeId) {
    try {
      const responses = await Challenge.find({
        challengeId,
        status: 'evaluated'
      }).lean();

      if (responses.length < 10) {
        return {
          calibrated: false,
          reason: 'insufficient_data',
          required: 10,
          current: responses.length
        };
      }

      const responsePattern = responses.map(r => ({
        correct: (r.results?.totalScore || 0) >= 60 ? 1 : 0
      }));

      const parameters = this.calibrator.calibrateItem(responsePattern);

      if (!parameters) {
        return {
          calibrated: false,
          reason: 'calibration_failed'
        };
      }

      this.itemBank.set(challengeId, parameters);

      // Persist to MongoDB via collection API (bypasses schema strict mode).
      // The IRT calibration job queries 'metadata.irt' to find uncalibrated items.
      await Challenge.collection.updateMany(
        { challengeId },
        {
          $set: {
            'metadata.irt': {
              difficulty: parameters.difficulty,
              discrimination: parameters.discrimination,
              guessing: parameters.guessing,
              sampleSize: responses.length,
              calibratedAt: new Date(),
            },
          },
        }
      );

      return {
        calibrated: true,
        parameters,
        sampleSize: responses.length
      };

    } catch (error) {
      logger.error('Calibrate item error:', error);
      return {
        calibrated: false,
        reason: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get IRT statistics for student
   */
  async getIRTStatistics(studentId) {
    try {
      const meta = await MetaParameters.findOne({ userId: studentId });
      
      if (!meta || !meta.irtAbility) {
        return {
          available: false,
          message: 'No IRT data available'
        };
      }

      return {
        available: true,
        studentAbility: meta.irtAbility,
        standardError: meta.irtStandardError,
        sampleSize: meta.irtSampleSize,
        lastUpdated: meta.irtLastUpdated,
        percentile: this.abilityToPercentile(meta.irtAbility),
        abilityLevel: this.getAbilityLevel(meta.irtAbility),
        reliable: meta.irtSampleSize >= 10 && meta.irtStandardError < 0.5,
        history: meta.irtHistory?.slice(-10) || []
      };

    } catch (error) {
      logger.error('Get IRT statistics error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new IRTAlgorithmService();