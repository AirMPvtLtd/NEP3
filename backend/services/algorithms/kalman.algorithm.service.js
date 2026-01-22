/**
 * KALMAN FILTER ALGORITHM SERVICE
 * Complete integration of kalman.filter.js
 */

const KalmanFilter = require('../../algorithms/kalman.filter');
const { KalmanState, Challenge, MetaParameters } = require('../../models');
const logger = require('../../utils/logger');

class KalmanAlgorithmService {
  /**
   * Get or create Kalman filter for student
   */
  async getFilter(studentId, metric = 'performance_score') {
    let kalmanState = await KalmanState.findOne({ studentId, metric });
    
    if (!kalmanState) {
      kalmanState = await KalmanState.create({
        studentId,
        metric,
        state: { x: 50, P: 10 },
        Q: 0.1,
        R: 5
      });
    }
    
    // Initialize filter with saved state
    const filter = new KalmanFilter({
      x: kalmanState.state.x,
      P: kalmanState.state.P,
      Q: kalmanState.Q,
      R: kalmanState.R
    });
    
    return { filter, kalmanState };
  }
  
  /**
   * Update filter with new observation
   */
  async update(studentId, observation, metric = 'performance_score') {
    try {
      const { filter, kalmanState } = await this.getFilter(studentId, metric);
      
      // ✅ Predict step
      filter.predict();
      
      // ✅ Update step
      filter.update(observation);
      
      // Get updated state
      const state = filter.getState();
      
      // Save to database
      kalmanState.state = { x: state.x, P: state.P };
      kalmanState.prediction = {
        value: state.x,
        confidence: 1 - (state.P / 100),
        timestamp: new Date()
      };
      kalmanState.lastUpdated = new Date();
      
      await kalmanState.save();
      
      return {
        success: true,
        estimate: state.x,
        uncertainty: state.P,
        confidence: 1 - (state.P / 100)
      };
      
    } catch (error) {
      logger.error('Kalman update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Predict future performance
   */
  async predict(studentId, steps = 1, metric = 'performance_score') {
    try {
      const { filter } = await this.getFilter(studentId, metric);
      
      const predictions = [];
      
      for (let i = 0; i < steps; i++) {
        filter.predict();
        const state = filter.getState();
        
        predictions.push({
          step: i + 1,
          estimate: state.x,
          uncertainty: state.P,
          confidence: 1 - (state.P / 100)
        });
      }
      
      return {
        success: true,
        predictions
      };
      
    } catch (error) {
      logger.error('Kalman predict error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Smooth performance history (Kalman smoother)
   */
  async smooth(studentId, observations) {
    try {
      // Get filter
      const { filter } = await this.getFilter(studentId);
      
      // ✅ Use Kalman smoother from algorithm
      const smoothed = filter.smooth(observations);
      
      return {
        success: true,
        smoothed: smoothed.map((value, i) => ({
          original: observations[i],
          smoothed: value,
          index: i
        }))
      };
      
    } catch (error) {
      logger.error('Kalman smooth error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Adaptive noise estimation
   */
  async adaptNoise(studentId) {
    try {
      // Get recent challenges
      const challenges = await Challenge.find({
        studentId,
        status: { $in: ['completed', 'evaluated'] }
      })
        .sort({ completedAt: -1 })
        .limit(20)
        .lean();
      
      if (challenges.length < 5) {
        return {
          adapted: false,
          reason: 'Insufficient data'
        };
      }
      
      const observations = challenges.map(c => c.results?.totalScore || 0);
      
      const { filter, kalmanState } = await this.getFilter(studentId);
      
      // ✅ Adaptive noise estimation
      const noise = filter.estimateNoise(observations);
      
      // Update noise parameters
      kalmanState.Q = noise.Q;
      kalmanState.R = noise.R;
      
      await kalmanState.save();
      
      return {
        adapted: true,
        Q: noise.Q,
        R: noise.R
      };
      
    } catch (error) {
      logger.error('Adapt noise error:', error);
      return {
        adapted: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get Kalman statistics
   */
  async getStatistics(studentId, metric = 'performance_score') {
    try {
      const kalmanState = await KalmanState.findOne({ studentId, metric });
      
      if (!kalmanState) {
        return {
          available: false
        };
      }
      
      return {
        available: true,
        state: {
          estimate: kalmanState.state.x,
          uncertainty: kalmanState.state.P
        },
        parameters: {
          Q: kalmanState.Q,
          R: kalmanState.R
        },
        prediction: kalmanState.prediction,
        lastUpdated: kalmanState.lastUpdated
      };
      
    } catch (error) {
      logger.error('Get Kalman stats error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
}

const kalmanService = new KalmanAlgorithmService();

module.exports = kalmanService;