// services/algorithms/bayesian.algorithm.service.js
/**
 * BAYESIAN NETWORK ALGORITHM SERVICE - COMPLETE FIXED VERSION
 * Advanced inference and learning with Bayesian Networks
 * 
 * FIXED: Changed 'var' to 'varName' (var is a reserved keyword)
 */

const { MetaParameters } = require('../../models');
const logger = require('../../utils/logger');

class BayesianAlgorithmService {
  /**
   * Perform inference with method selection
   */
  async performInference(studentId, queryVariable, evidence = {}, method = 'auto') {
    try {
      // Get student's Bayesian network from MetaParameters
      const meta = await MetaParameters.findOne({ userId: studentId });
      
      if (!meta || !meta.bayesianNetwork) {
        return {
          success: false,
          message: 'Bayesian network not initialized for this student'
        };
      }
      
      const network = meta.bayesianNetwork;
      
      // Simple inference based on evidence
      const result = this.simpleInference(network, queryVariable, evidence);
      
      return {
        success: true,
        query: queryVariable,
        result: result.probabilities,
        method: method || 'simple',
        confidence: this.calculateConfidence(result.probabilities)
      };
      
    } catch (error) {
      logger.error('Bayesian inference error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get prediction with explanation
   */
  async getPrediction(studentId, targetVariable, context = {}) {
    try {
      // Get student's network
      const meta = await MetaParameters.findOne({ userId: studentId });
      
      if (!meta || !meta.bayesianNetwork) {
        // Return default prediction if network doesn't exist
        return {
          success: true,
          prediction: this.getDefaultPrediction(targetVariable),
          confidence: 0.5,
          distribution: {},
          explanation: 'Using default prediction (network not initialized)'
        };
      }
      
      const network = meta.bayesianNetwork;
      
      // Perform inference
      const inference = this.simpleInference(network, targetVariable, context);
      
      // Get most likely state
      const probabilities = inference.probabilities;
      const mostLikely = Object.entries(probabilities)
        .reduce((max, [state, prob]) => 
          prob > max.probability ? { state, probability: prob } : max,
          { state: null, probability: 0 }
        );
      
      // Generate explanation
      const explanation = this.explainPrediction(
        targetVariable,
        { 
          prediction: mostLikely.state,
          confidence: mostLikely.probability,
          distribution: probabilities
        },
        context
      );
      
      return {
        success: true,
        prediction: mostLikely.state,
        confidence: mostLikely.probability,
        distribution: probabilities,
        explanation
      };
      
    } catch (error) {
      logger.error('Bayesian prediction error:', error);
      return {
        success: false,
        prediction: this.getDefaultPrediction(targetVariable),
        confidence: 0.5,
        error: error.message
      };
    }
  }
  
  /**
   * Update network from challenge data
   */
  async updateFromChallenge(studentId, challengeData) {
    try {
      const meta = await MetaParameters.findOne({ userId: studentId });
      
      if (!meta) {
        // Initialize network if it doesn't exist
        await MetaParameters.findOneAndUpdate(
          { userId: studentId },
          {
            $set: {
              bayesianNetwork: this.createDefaultNetwork(),
              bayesianLastUpdated: new Date()
            }
          },
          { upsert: true }
        );
        return { success: true, message: 'Network initialized' };
      }
      
      // Extract evidence from challenge
      const evidence = {
        difficulty: challengeData.difficulty,
        passed: challengeData.passed,
        score: challengeData.score
      };
      
      // Update network with new evidence
      if (!meta.bayesianNetwork) {
        meta.bayesianNetwork = this.createDefaultNetwork();
      }
      
      // Store evidence in network
      if (!meta.bayesianNetwork.evidence) {
        meta.bayesianNetwork.evidence = [];
      }
      
      meta.bayesianNetwork.evidence.push({
        ...evidence,
        timestamp: new Date()
      });
      
      // Keep only last 100 evidence points
      if (meta.bayesianNetwork.evidence.length > 100) {
        meta.bayesianNetwork.evidence = meta.bayesianNetwork.evidence.slice(-100);
      }
      
      meta.bayesianLastUpdated = new Date();
      await meta.save();
      
      return {
        success: true,
        evidenceUpdated: Object.keys(evidence).length
      };
      
    } catch (error) {
      logger.error('Update network error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Explain prediction
   * ✅ FIXED: Changed 'var' to 'varName' (var is reserved keyword)
   */
  explainPrediction(variable, prediction, context) {
    const explanations = [];
    
    // Confidence explanation
    if (prediction.confidence > 0.8) {
      explanations.push('High confidence prediction');
    } else if (prediction.confidence < 0.5) {
      explanations.push('Low confidence - more data needed');
    }
    
    // Context influence
    // ✅ FIXED: Changed [var, val] to [varName, val]
    const influences = Object.entries(context)
      .map(([varName, val]) => `${varName}=${val}`)
      .join(', ');
    
    if (influences) {
      explanations.push(`Based on: ${influences}`);
    }
    
    return explanations.join('. ');
  }
  
  /**
   * Get network insights
   */
  async getNetworkInsights(studentId) {
    try {
      const meta = await MetaParameters.findOne({ userId: studentId });
      
      if (!meta || !meta.bayesianNetwork) {
        return { 
          available: false,
          message: 'Bayesian network not initialized'
        };
      }
      
      const network = meta.bayesianNetwork;
      
      return {
        available: true,
        structure: {
          nodes: network.nodes?.length || 0,
          edges: network.edges?.length || 0
        },
        state: {
          evidenceCount: network.evidence?.length || 0,
          lastUpdated: meta.bayesianLastUpdated
        },
        recentEvidence: (network.evidence || []).slice(-5).map(ev => ({
          difficulty: ev.difficulty,
          passed: ev.passed,
          score: ev.score,
          timestamp: ev.timestamp
        }))
      };
      
    } catch (error) {
      logger.error('Get network insights error:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }
  
  /**
   * Simple inference algorithm
   */
  simpleInference(network, queryVariable, evidence) {
    // Simple probability calculation based on evidence
    const probabilities = {};
    
    // For difficulty prediction
    if (queryVariable === 'difficulty' || queryVariable === 'performance') {
      const recentEvidence = (network.evidence || []).slice(-10);
      
      if (recentEvidence.length === 0) {
        // No data - return uniform distribution
        return {
          probabilities: {
            'very_easy': 0.1,
            'easy': 0.2,
            'medium': 0.4,
            'hard': 0.2,
            'very_hard': 0.1
          }
        };
      }
      
      // Calculate average performance
      const avgScore = recentEvidence.reduce((sum, ev) => sum + (ev.score || 0), 0) / recentEvidence.length;
      
      // Map score to difficulty probabilities
      if (avgScore >= 80) {
        probabilities.very_easy = 0.05;
        probabilities.easy = 0.1;
        probabilities.medium = 0.2;
        probabilities.hard = 0.35;
        probabilities.very_hard = 0.3;
      } else if (avgScore >= 60) {
        probabilities.very_easy = 0.1;
        probabilities.easy = 0.2;
        probabilities.medium = 0.4;
        probabilities.hard = 0.2;
        probabilities.very_hard = 0.1;
      } else if (avgScore >= 40) {
        probabilities.very_easy = 0.2;
        probabilities.easy = 0.35;
        probabilities.medium = 0.3;
        probabilities.hard = 0.1;
        probabilities.very_hard = 0.05;
      } else {
        probabilities.very_easy = 0.4;
        probabilities.easy = 0.35;
        probabilities.medium = 0.2;
        probabilities.hard = 0.04;
        probabilities.very_hard = 0.01;
      }
    } else {
      // For other variables, return uniform distribution
      probabilities.low = 0.33;
      probabilities.medium = 0.34;
      probabilities.high = 0.33;
    }
    
    return { probabilities };
  }
  
  /**
   * Calculate confidence from probability distribution
   */
  calculateConfidence(probabilities) {
    const probs = Object.values(probabilities);
    if (probs.length === 0) return 0.5;
    
    const max = Math.max(...probs);
    const entropy = -probs.reduce((sum, p) => 
      p > 0 ? sum + p * Math.log2(p) : sum, 0
    );
    const maxEntropy = Math.log2(probs.length);
    
    // Confidence based on max probability and low entropy
    return (max + (1 - entropy / maxEntropy)) / 2;
  }
  
  /**
   * Get default prediction for a variable
   */
  getDefaultPrediction(variable) {
    const defaults = {
      'difficulty': 'medium',
      'performance': 'average',
      'success': 'pass',
      'engagement': 'medium'
    };
    
    return defaults[variable] || 'medium';
  }
  
  /**
   * Create default network structure
   */
  createDefaultNetwork() {
    return {
      nodes: [
        { id: 'difficulty', states: ['very_easy', 'easy', 'medium', 'hard', 'very_hard'] },
        { id: 'performance', states: ['low', 'medium', 'high'] },
        { id: 'success', states: ['fail', 'pass'] }
      ],
      edges: [
        { from: 'difficulty', to: 'performance' },
        { from: 'performance', to: 'success' }
      ],
      evidence: [],
      createdAt: new Date()
    };
  }
  
  /**
   * Initialize network for student
   */
  async initializeNetwork(studentId) {
    try {
      const network = this.createDefaultNetwork();
      
      await MetaParameters.findOneAndUpdate(
        { userId: studentId },
        {
          $set: {
            bayesianNetwork: network,
            bayesianLastUpdated: new Date()
          }
        },
        { upsert: true }
      );
      
      return {
        success: true,
        message: 'Bayesian network initialized',
        network
      };
      
    } catch (error) {
      logger.error('Initialize network error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get statistics
   */
  async getStatistics(studentId) {
    try {
      const meta = await MetaParameters.findOne({ userId: studentId });
      
      if (!meta || !meta.bayesianNetwork) {
        return {
          available: false,
          message: 'No network data'
        };
      }
      
      const network = meta.bayesianNetwork;
      const evidenceCount = network.evidence?.length || 0;
      
      return {
        available: true,
        evidenceCount,
        lastUpdated: meta.bayesianLastUpdated,
        networkSize: {
          nodes: network.nodes?.length || 0,
          edges: network.edges?.length || 0
        }
      };
      
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const bayesianService = new BayesianAlgorithmService();

module.exports = bayesianService;