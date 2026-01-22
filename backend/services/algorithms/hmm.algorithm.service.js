/**
 * HMM ALGORITHM SERVICE
 * Learning trajectory analysis and prediction
 */

const { HMMState, Challenge } = require('../../models');
const logger = require('../../utils/logger');

class HMMAlgorithmService {
  /**
   * Update HMM with challenge result
   */
  async updateWithChallenge(studentId, competency, score) {
    try {
      // Get or create HMM
      let hmm = await HMMState.findOne({ studentId, competency });
      
      if (!hmm) {
        hmm = await HMMState.createForCompetency(studentId, competency);
      }
      
      // Add observation
      await hmm.addObservation(score);
      
      // Train if enough data
      if (hmm.observations.length >= 10 && hmm.observations.length % 10 === 0) {
        const trainingResult = await hmm.train();
        
        if (trainingResult.trained) {
          logger.info(`HMM trained for ${studentId}/${competency}: ${trainingResult.iterations} iterations`);
        }
      }
      
      return {
        success: true,
        currentState: hmm.stateSequence[hmm.stateSequence.length - 1]?.state,
        observationCount: hmm.observations.length
      };
      
    } catch (error) {
      logger.error('Update HMM error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get learning trajectory
   */
  async getLearningTrajectory(studentId, competency) {
    try {
      const hmm = await HMMState.findOne({ studentId, competency });
      
      if (!hmm) {
        return {
          available: false,
          message: 'No HMM data available'
        };
      }
      
      const trajectory = hmm.getLearningTrajectory();
      
      return {
        available: true,
        ...trajectory
      };
      
    } catch (error) {
      logger.error('Get trajectory error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
  
  /**
   * Predict next state
   */
  async predictNextState(studentId, competency, timeHorizon = 1) {
    try {
      const hmm = await HMMState.findOne({ studentId, competency });
      
      if (!hmm) {
        return {
          available: false,
          message: 'No HMM data available'
        };
      }
      
      const prediction = await hmm.predict(timeHorizon);
      
      return {
        available: true,
        ...prediction
      };
      
    } catch (error) {
      logger.error('Predict state error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get state probabilities over time
   */
  async getStateProbabilities(studentId, competency) {
    try {
      const hmm = await HMMState.findOne({ studentId, competency });
      
      if (!hmm) {
        return {
          available: false,
          message: 'No HMM data available'
        };
      }
      
      const probabilities = await hmm.getStateProbabilities();
      
      return {
        available: true,
        probabilities
      };
      
    } catch (error) {
      logger.error('Get probabilities error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get HMM statistics
   */
  async getStatistics(studentId, competency) {
    try {
      const hmm = await HMMState.findOne({ studentId, competency });
      
      if (!hmm) {
        return {
          available: false
        };
      }
      
      return {
        available: true,
        observations: hmm.observations.length,
        currentState: hmm.stateSequence[hmm.stateSequence.length - 1]?.state,
        trainingMetadata: hmm.trainingMetadata,
        viterbiPathLength: hmm.viterbiPath.length,
        predictions: hmm.predictions.length
      };
      
    } catch (error) {
      logger.error('Get HMM stats error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
}

const hmmService = new HMMAlgorithmService();

module.exports = hmmService;