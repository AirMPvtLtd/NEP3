/**
 * Q-LEARNING ALGORITHM SERVICE
 * Reinforcement learning for optimal recommendations
 */

const QLearningAgent = require('../../algorithms/q.learning');
const { MetaParameters, Challenge } = require('../../models');
const logger = require('../../utils/logger');

class QLearningService {
  /**
   * Get or create Q-learning agent
   */
  async getAgent(studentId) {
    let metaParams = await MetaParameters.findOne({ studentId });
    
    const agent = new QLearningAgent();
    
    if (metaParams && metaParams.qLearningState) {
      agent.setState(metaParams.qLearningState);
    }
    
    return { agent, metaParams };
  }
  
  /**
   * Recommend next action
   */
  async recommendAction(studentId, currentContext) {
    try {
      const { agent } = await this.getAgent(studentId);
      
      // Encode state
      const state = agent.encodeState(currentContext);
      
      // Select action
      const selection = agent.selectAction(state);
      
      return {
        success: true,
        action: selection.action,
        strategy: selection.strategy,
        qValue: selection.qValue,
        epsilon: selection.epsilon,
        explanation: this.explainAction(selection.action)
      };
      
    } catch (error) {
      logger.error('Recommend action error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Learn from challenge outcome
   */
  async learnFromOutcome(studentId, previousContext, action, outcome, newContext) {
    try {
      const { agent, metaParams } = await this.getAgent(studentId);
      
      // Encode states
      const state = agent.encodeState(previousContext);
      const nextState = agent.encodeState(newContext);
      
      // Calculate reward
      const reward = agent.calculateReward(outcome);
      
      // Store experience
      agent.storeExperience({ state, action, reward, nextState });
      
      // Update Q-value
      const tdError = agent.updateQValue(state, action, reward, nextState);
      
      // Train on batch periodically
      if (agent.updateCount % 10 === 0) {
        agent.trainOnBatch();
      }
      
      // Decay exploration
      agent.decayExploration();
      
      // Save agent state
      if (!metaParams) {
        metaParams = new MetaParameters({ studentId });
      }
      
      metaParams.qLearningState = agent.getState();
      await metaParams.save();
      
      return {
        success: true,
        reward,
        tdError,
        epsilon: agent.epsilon
      };
      
    } catch (error) {
      logger.error('Learn from outcome error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get optimal policy
   */
  async getOptimalPolicy(studentId) {
    try {
      const { agent } = await this.getAgent(studentId);
      
      const policy = agent.getPolicy();
      
      return {
        success: true,
        policy: Array.from(policy.entries()).map(([state, data]) => ({
          state,
          action: data.action,
          qValue: data.qValue
        })),
        totalStates: policy.size
      };
      
    } catch (error) {
      logger.error('Get policy error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Explain action
   */
  explainAction(action) {
    const explanations = {
      'DECREASE_DIFFICULTY': 'Reduce difficulty to build confidence',
      'MAINTAIN_DIFFICULTY': 'Current difficulty is optimal',
      'INCREASE_DIFFICULTY': 'Challenge yourself for growth',
      'CHANGE_SIMULATION_TYPE': 'Try different simulation for variety',
      'REPEAT_SIMILAR': 'Practice similar challenges',
      'TAKE_BREAK': 'Take a break to avoid fatigue'
    };
    
    return explanations[action] || 'Continue learning';
  }
}

const qlearningService = new QLearningService();

module.exports = qlearningService;