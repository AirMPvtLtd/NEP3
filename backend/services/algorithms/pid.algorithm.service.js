/**
 * PID CONTROLLER SERVICE
 * Automatic difficulty adjustment using PID control
 */

const PIDController = require('../../algorithms/pid.controller');
const { Student, Challenge, MetaParameters } = require('../../models');
const logger = require('../../utils/logger');

class PIDAlgorithmService {
  constructor() {
    // PID controllers per student (cached)
    this.controllers = new Map();
  }

  /**
   * Get or create PID controller for student
   */
  async getController(studentId) {
    if (this.controllers.has(studentId)) {
      return this.controllers.get(studentId);
    }

    // Load student's PID configuration
    const metaParams = await MetaParameters.findOne({ studentId });
    const config = metaParams?.pidConfig || this.getDefaultConfig();

    const controller = new PIDController(config);

    // Load saved state if exists
    if (metaParams?.pidState) {
      controller.setState(metaParams.pidState);
    }

    this.controllers.set(studentId, controller);
    return controller;
  }

  /**
   * Get default PID configuration
   */
  getDefaultConfig() {
    return {
      Kp: 0.5,    // Proportional gain
      Ki: 0.1,    // Integral gain
      Kd: 0.2,    // Derivative gain
      setpoint: 70, // Target performance (70%)
      outputMin: -2,  // Maximum difficulty decrease
      outputMax: 2,   // Maximum difficulty increase
      integralMax: 5  // Anti-windup
    };
  }

  /**
   * Compute difficulty adjustment
   */
  async computeAdjustment(studentId, currentPerformance) {
    try {
      const controller = await this.getController(studentId);

      // Compute PID output
      const adjustment = controller.compute(currentPerformance);

      // Save controller state
      await this.saveController(studentId, controller);

      return {
        adjustment: Math.round(adjustment * 10) / 10, // Round to 1 decimal
        currentPerformance,
        targetPerformance: controller.config.setpoint,
        error: controller.config.setpoint - currentPerformance,
        components: {
          proportional: controller.lastP || 0,
          integral: controller.integral || 0,
          derivative: controller.lastD || 0
        }
      };

    } catch (error) {
      logger.error('Compute PID adjustment error:', error);
      return {
        adjustment: 0,
        error: error.message
      };
    }
  }

  /**
   * Get recommended difficulty level
   */
  async getRecommendedDifficulty(studentId) {
    try {
      // Get recent performance
      const recentChallenges = await Challenge.find({
        studentId,
        status: { $in: ['completed', 'evaluated'] }
      })
        .sort({ completedAt: -1 })
        .limit(5)
        .lean();

      if (recentChallenges.length === 0) {
        return {
          difficulty: 'medium',
          reasoning: 'No performance history - starting at medium'
        };
      }

      // Calculate average performance
      const avgPerformance = recentChallenges.reduce((sum, c) =>
        sum + (c.results?.totalScore || 0), 0) / recentChallenges.length;

      // Get current difficulty
      const currentDifficulty = recentChallenges[0].difficulty;
      const currentDifficultyValue = this.difficultyToValue(currentDifficulty);

      // Compute adjustment
      const result = await this.computeAdjustment(studentId, avgPerformance);

      // Apply adjustment
      const newDifficultyValue = currentDifficultyValue + result.adjustment;
      const newDifficulty = this.valueToDifficulty(newDifficultyValue);

      return {
        difficulty: newDifficulty,
        currentDifficulty,
        adjustment: result.adjustment,
        currentPerformance: avgPerformance,
        targetPerformance: result.targetPerformance,
        error: result.error,
        components: result.components,
        reasoning: this.explainAdjustment(result)
      };

    } catch (error) {
      logger.error('Get recommended difficulty error:', error);
      return {
        difficulty: 'medium',
        error: error.message
      };
    }
  }

  /**
   * Update PID after challenge completion
   */
  async updateAfterChallenge(studentId, challengeData) {
    try {
      const performance = challengeData.results?.totalScore || 0;

      // Compute adjustment
      const result = await this.computeAdjustment(studentId, performance);

      // Store update history
      await this.storeUpdateHistory(studentId, {
        performance,
        adjustment: result.adjustment,
        error: result.error,
        timestamp: new Date()
      });

      return {
        success: true,
        performance,
        adjustment: result.adjustment,
        nextDifficulty: await this.getRecommendedDifficulty(studentId)
      };

    } catch (error) {
      logger.error('Update PID error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Auto-tune PID parameters (Ziegler-Nichols method)
   */
  async autoTune(studentId) {
    try {
      // Get performance history
      const challenges = await Challenge.find({
        studentId,
        status: { $in: ['completed', 'evaluated'] }
      })
        .sort({ completedAt: 1 })
        .limit(20)
        .lean();

      if (challenges.length < 10) {
        return {
          tuned: false,
          reason: 'Insufficient data (need at least 10 challenges)'
        };
      }

      // Extract performance data
      const performanceData = challenges.map(c => ({
        score: c.results?.totalScore || 0,
        timestamp: c.completedAt
      }));

      const controller = await this.getController(studentId);

      // Auto-tune
      const tunedParams = controller.autoTune(performanceData);

      // Update configuration
      controller.config.Kp = tunedParams.Kp;
      controller.config.Ki = tunedParams.Ki;
      controller.config.Kd = tunedParams.Kd;

      // Save
      await this.saveController(studentId, controller);

      return {
        tuned: true,
        parameters: {
          Kp: tunedParams.Kp,
          Ki: tunedParams.Ki,
          Kd: tunedParams.Kd
        },
        method: 'Ziegler-Nichols'
      };

    } catch (error) {
      logger.error('Auto-tune PID error:', error);
      return {
        tuned: false,
        error: error.message
      };
    }
  }

  /**
   * Reset PID controller
   */
  async reset(studentId) {
    try {
      const controller = await this.getController(studentId);
      controller.reset();
      await this.saveController(studentId, controller);

      return {
        success: true,
        message: 'PID controller reset'
      };

    } catch (error) {
      logger.error('Reset PID error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get PID statistics
   */
  async getStatistics(studentId) {
    try {
      const metaParams = await MetaParameters.findOne({ studentId });

      if (!metaParams || !metaParams.pidState) {
        return {
          available: false,
          message: 'No PID data available'
        };
      }

      const controller = await this.getController(studentId);

      return {
        available: true,
        parameters: {
          Kp: controller.config.Kp,
          Ki: controller.config.Ki,
          Kd: controller.config.Kd,
          setpoint: controller.config.setpoint
        },
        state: {
          integral: controller.integral,
          lastError: controller.lastError,
          lastOutput: controller.lastOutput
        },
        history: metaParams.pidUpdateHistory?.slice(-10) || []
      };

    } catch (error) {
      logger.error('Get PID statistics error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Save controller state
   */
  async saveController(studentId, controller) {
    try {
      await MetaParameters.findOneAndUpdate(
        { studentId },
        {
          pidConfig: {
            Kp: controller.config.Kp,
            Ki: controller.config.Ki,
            Kd: controller.config.Kd,
            setpoint: controller.config.setpoint
          },
          pidState: controller.getState(),
          pidLastUpdated: new Date()
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Save PID controller error:', error);
    }
  }

  /**
   * Store update history
   */
  async storeUpdateHistory(studentId, update) {
    try {
      await MetaParameters.findOneAndUpdate(
        { studentId },
        {
          $push: {
            pidUpdateHistory: {
              $each: [update],
              $slice: -100 // Keep last 100
            }
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Store PID history error:', error);
    }
  }

  /**
   * Map difficulty to numeric value
   */
  difficultyToValue(difficulty) {
    const mapping = {
      'very_easy': 1,
      'easy': 2,
      'medium': 3,
      'hard': 4,
      'very_hard': 5
    };
    return mapping[difficulty] || 3;
  }

  /**
   * Map numeric value to difficulty
   */
  valueToDifficulty(value) {
    const clamped = Math.max(1, Math.min(5, Math.round(value)));
    const mapping = {
      1: 'very_easy',
      2: 'easy',
      3: 'medium',
      4: 'hard',
      5: 'very_hard'
    };
    return mapping[clamped];
  }

  /**
   * Explain adjustment
   */
  explainAdjustment(result) {
    const { error, adjustment } = result;

    if (Math.abs(error) < 5) {
      return 'Performance is at target - maintaining current difficulty';
    }

    if (error > 0) {
      return `Performance below target by ${Math.abs(error).toFixed(1)}% - ${adjustment > 0 ? 'slightly increasing' : 'maintaining'} difficulty to challenge`;
    }

    return `Performance above target by ${Math.abs(error).toFixed(1)}% - ${adjustment < 0 ? 'slightly decreasing' : 'maintaining'} difficulty for optimal learning`;
  }
}

// Singleton
const pidService = new PIDAlgorithmService();

module.exports = pidService;