/**
 * ATTENTION ALGORITHM SERVICE
 * Bridges attention.mechanism.js with NEP Workbench
 */

const AttentionMechanism = require('../../algorithms/attention.mechanism');
const { AttentionMetrics, Student, Challenge, MetaParameters } = require('../../models');
const logger = require('../../utils/logger');

class AttentionAlgorithmService {
  constructor() {
    // Initialize attention mechanisms per student (cached)
    this.mechanisms = new Map();
  }

  /**
   * Get or create attention mechanism for student
   */
  async getMechanism(studentId) {
    if (this.mechanisms.has(studentId)) {
      return this.mechanisms.get(studentId);
    }

    // Load student's attention configuration
    const metaParams = await MetaParameters.findOne({ studentId });
    const config = metaParams?.attentionConfig || {};

    const mechanism = new AttentionMechanism(config);
    
    // Load student's attention history
    const history = await this.loadAttentionHistory(studentId);
    if (history.length > 0) {
      mechanism.contextMemory = history;
    }

    this.mechanisms.set(studentId, mechanism);
    return mechanism;
  }

  /**
   * Load attention history from database
   */
  async loadAttentionHistory(studentId) {
    const challenges = await Challenge.find({ 
      studentId, 
      status: 'completed' 
    })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean();

    return challenges.map(challenge => ({
      simulation_type: challenge.simulationType,
      difficulty: challenge.difficulty,
      competency: challenge.competenciesAssessed,
      time_of_day: new Date(challenge.completedAt).getHours(),
      session_length: challenge.timeTaken || 0,
      recent_performance: challenge.results?.totalScore || 0
    }));
  }

  /**
   * Calculate attention-based challenge selection
   */
  async selectChallenge(studentId, availableChallenges, currentContext) {
    try {
      const mechanism = await this.getMechanism(studentId);
      
      // Prepare query (current context)
      const query = {
        simulation_type: currentContext.preferredSimulation || 'any',
        difficulty: currentContext.currentDifficulty || 'medium',
        competency: currentContext.targetCompetencies || [],
        time_of_day: new Date().getHours(),
        session_length: currentContext.sessionLength || 30,
        recent_performance: currentContext.recentAvgScore || 50
      };

      // Prepare keys and values from available challenges
      const keys = availableChallenges.map(challenge => ({
        simulation_type: challenge.simulationType,
        difficulty: challenge.difficulty,
        competency: challenge.competenciesAssessed,
        time_of_day: new Date().getHours(),
        session_length: 30,
        recent_performance: 50
      }));

      const values = availableChallenges.map(challenge => ({
        score: challenge.predictedScore || 50,
        engagement: challenge.predictedEngagement || 0.5,
        learning: challenge.predictedLearning || 0.5
      }));

      // Calculate attention weights
      const result = mechanism.calculateAttention(query, keys, values);

      // Select top challenge based on attention weights
      const selectedIndex = result.weights.indexOf(Math.max(...result.weights));
      const selectedChallenge = availableChallenges[selectedIndex];

      // Store attention result
      await this.storeAttentionResult(studentId, {
        query,
        selectedChallenge: selectedChallenge._id,
        weights: result.weights,
        topK: result.topK
      });

      return {
        challenge: selectedChallenge,
        attentionScore: result.weights[selectedIndex],
        confidence: result.totalAttention,
        alternatives: result.topK.map((item, i) => ({
          challenge: availableChallenges[item.index],
          score: item.value
        })),
        reasoning: this.explainAttention(result, selectedChallenge)
      };

    } catch (error) {
      logger.error('Attention selection error:', error);
      // Fallback to random selection
      return {
        challenge: availableChallenges[0],
        attentionScore: 0,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Multi-head attention for comprehensive analysis
   */
  async analyzeWithMultiHead(studentId, currentContext, numHeads = 4) {
    try {
      const mechanism = await this.getMechanism(studentId);
      const history = await this.loadAttentionHistory(studentId);

      if (history.length === 0) {
        return null;
      }

      const keys = history;
      const values = history.map(h => ({
        score: h.recent_performance,
        engagement: 0.5,
        learning: 0.5
      }));

      const result = mechanism.multiHeadAttention(
        currentContext,
        keys,
        values,
        numHeads
      );

      return {
        aggregatedOutput: result.output,
        heads: result.heads,
        combinedWeights: result.weights,
        insights: this.extractInsights(result)
      };

    } catch (error) {
      logger.error('Multi-head attention error:', error);
      return null;
    }
  }

  /**
   * Update attention mechanism after challenge completion
   */
  async updateAttention(studentId, challengeData, outcome) {
    try {
      const mechanism = await this.getMechanism(studentId);

      // Add to context memory
      const context = {
        simulation_type: challengeData.simulationType,
        difficulty: challengeData.difficulty,
        competency: challengeData.competenciesAssessed,
        time_of_day: new Date().getHours(),
        session_length: challengeData.timeTaken || 30,
        recent_performance: outcome.score || 0
      };

      mechanism.contextMemory.push(context);

      // Keep only recent history
      if (mechanism.contextMemory.length > 20) {
        mechanism.contextMemory.shift();
      }

      // Save updated mechanism
      await this.saveMechanism(studentId, mechanism);

      return {
        success: true,
        memorySize: mechanism.contextMemory.length
      };

    } catch (error) {
      logger.error('Update attention error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store attention result for analysis
   */
  async storeAttentionResult(studentId, result) {
    try {
      await MetaParameters.findOneAndUpdate(
        { studentId },
        {
          $push: {
            attentionHistory: {
              $each: [{
                timestamp: new Date(),
                ...result
              }],
              $slice: -100 // Keep last 100
            }
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Store attention error:', error);
    }
  }

  /**
   * Save mechanism state
   */
  async saveMechanism(studentId, mechanism) {
    try {
      await MetaParameters.findOneAndUpdate(
        { studentId },
        {
          attentionConfig: {
            temperature: mechanism.config.temperature,
            queryWeights: mechanism.config.queryWeights
          },
          attentionMemory: mechanism.contextMemory
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Save mechanism error:', error);
    }
  }

  /**
   * Explain attention decision
   */
  explainAttention(result, challenge) {
    const topFactors = result.topK.slice(0, 3).map(item => 
      `${item.key.simulation_type} (weight: ${item.value.toFixed(2)})`
    );

    return `Selected based on attention to: ${topFactors.join(', ')}`;
  }

  /**
   * Extract insights from multi-head attention
   */
  extractInsights(result) {
    return {
      primaryFocus: result.heads[0].topK[0]?.key,
      diverseInterests: result.heads.length > 1,
      confidenceLevel: result.weights.reduce((a, b) => a + b, 0) / result.weights.length
    };
  }

  /**
   * Get attention statistics for student
   */
  async getAttentionStatistics(studentId) {
    try {
      const metaParams = await MetaParameters.findOne({ studentId });
      
      if (!metaParams || !metaParams.attentionHistory) {
        return { available: false };
      }

      const history = metaParams.attentionHistory;

      return {
        available: true,
        totalDecisions: history.length,
        averageConfidence: history.reduce((sum, h) => 
          sum + (h.confidence || 0), 0) / history.length,
        topSimulations: this.getTopSimulations(history),
        attentionPattern: this.analyzePattern(history)
      };

    } catch (error) {
      logger.error('Get attention stats error:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * Get top attended simulations
   */
  getTopSimulations(history) {
    const counts = {};
    history.forEach(h => {
      const sim = h.query?.simulation_type;
      if (sim) counts[sim] = (counts[sim] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sim, count]) => ({ simulation: sim, count }));
  }

  /**
   * Analyze attention pattern
   */
  analyzePattern(history) {
    if (history.length < 5) return 'insufficient_data';

    const recentConfidence = history.slice(-5).reduce((sum, h) => 
      sum + (h.confidence || 0), 0) / 5;
    
    const olderConfidence = history.slice(0, 5).reduce((sum, h) => 
      sum + (h.confidence || 0), 0) / 5;

    if (recentConfidence > olderConfidence + 0.1) return 'improving';
    if (recentConfidence < olderConfidence - 0.1) return 'declining';
    return 'stable';
  }
}

// Singleton instance
const attentionService = new AttentionAlgorithmService();

module.exports = attentionService;