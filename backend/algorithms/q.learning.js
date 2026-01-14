// algorithms/q.learning.js
/**
 * Q-LEARNING - COMPLETE PRODUCTION VERSION
 * Reinforcement Learning for optimal challenge sequencing
 * 
 * @module algorithms/q.learning
 */

const { MetaParameters, Challenge, Student } = require('../models');

// ============================================================================
// Q-LEARNING CONFIGURATION
// ============================================================================

const ACTIONS = {
  DECREASE_DIFFICULTY: 'decrease_difficulty',
  MAINTAIN_DIFFICULTY: 'maintain_difficulty',
  INCREASE_DIFFICULTY: 'increase_difficulty',
  CHANGE_SIMULATION_TYPE: 'change_simulation_type',
  REPEAT_SIMILAR: 'repeat_similar',
  TAKE_BREAK: 'take_break'
};

const STATES = {
  STRUGGLING: 'struggling',           // Score < 40
  LEARNING: 'learning',               // Score 40-60
  PROFICIENT: 'proficient',           // Score 60-80
  MASTERY: 'mastery',                 // Score > 80
  FATIGUED: 'fatigued',              // Long session
  IMPROVING: 'improving',             // Positive trend
  DECLINING: 'declining'              // Negative trend
};

const DEFAULT_CONFIG = {
  // Q-learning parameters
  learningRate: 0.1,        // Alpha (α)
  discountFactor: 0.9,      // Gamma (γ)
  explorationRate: 0.2,     // Epsilon (ε) for ε-greedy
  
  // Exploration decay
  explorationDecay: 0.995,
  minExplorationRate: 0.05,
  
  // Reward shaping
  rewards: {
    scoreImprovement: 1.0,
    scoreDecline: -0.5,
    passChallenge: 0.5,
    failChallenge: -0.3,
    longStreak: 0.2,
    breakStreak: -0.2,
    fastCompletion: 0.3,
    slowCompletion: -0.1,
    optimalDifficulty: 0.5
  },
  
  // State encoding
  stateFeatures: [
    'recentScore',
    'scoreHistory',
    'difficulty',
    'simulationType',
    'timeOfDay',
    'sessionLength',
    'streakLength'
  ],
  
  // Update frequency
  updateFrequency: 1,
  batchSize: 10
};

// ============================================================================
// Q-LEARNING AGENT CLASS
// ============================================================================

class QLearningAgent {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Q-table: Q(state, action) -> value
    this.qTable = new Map();
    
    // Learning parameters
    this.alpha = this.config.learningRate;
    this.gamma = this.config.discountFactor;
    this.epsilon = this.config.explorationRate;
    
    // Experience replay buffer
    this.experienceBuffer = [];
    this.maxBufferSize = 1000;
    
    // Episode tracking
    this.episode = 0;
    this.totalReward = 0;
    this.updateCount = 0;
  }
  
  /**
   * Get Q-value for state-action pair
   * @param {String} state - State identifier
   * @param {String} action - Action identifier
   * @returns {Number} Q-value
   */
  getQValue(state, action) {
    const key = `${state}|${action}`;
    return this.qTable.get(key) || 0;
  }
  
  /**
   * Set Q-value for state-action pair
   * @param {String} state - State identifier
   * @param {String} action - Action identifier
   * @param {Number} value - Q-value
   */
  setQValue(state, action, value) {
    const key = `${state}|${action}`;
    this.qTable.set(key, value);
  }
  
  /**
   * Select action using ε-greedy policy
   * @param {String} state - Current state
   * @param {Array} validActions - Valid actions
   * @returns {String} Selected action
   */
  selectAction(state, validActions = Object.values(ACTIONS)) {
    // Exploration: random action
    if (Math.random() < this.epsilon) {
      const randomIndex = Math.floor(Math.random() * validActions.length);
      return {
        action: validActions[randomIndex],
        strategy: 'exploration',
        epsilon: this.epsilon
      };
    }
    
    // Exploitation: best action
    let maxQ = -Infinity;
    let bestAction = validActions[0];
    
    validActions.forEach(action => {
      const qValue = this.getQValue(state, action);
      if (qValue > maxQ) {
        maxQ = qValue;
        bestAction = action;
      }
    });
    
    return {
      action: bestAction,
      strategy: 'exploitation',
      qValue: maxQ
    };
  }
  
  /**
   * Update Q-value using Q-learning update rule
   * @param {String} state - Current state
   * @param {String} action - Action taken
   * @param {Number} reward - Reward received
   * @param {String} nextState - Next state
   * @returns {Number} TD error
   */
  updateQValue(state, action, reward, nextState) {
    // Current Q-value
    const currentQ = this.getQValue(state, action);
    
    // Find max Q-value for next state
    let maxNextQ = -Infinity;
    Object.values(ACTIONS).forEach(nextAction => {
      const nextQ = this.getQValue(nextState, nextAction);
      if (nextQ > maxNextQ) {
        maxNextQ = nextQ;
      }
    });
    
    // Q-learning update: Q(s,a) ← Q(s,a) + α[r + γ max Q(s',a') - Q(s,a)]
    const tdTarget = reward + this.gamma * maxNextQ;
    const tdError = tdTarget - currentQ;
    const newQ = currentQ + this.alpha * tdError;
    
    this.setQValue(state, action, newQ);
    
    this.updateCount++;
    this.totalReward += reward;
    
    return tdError;
  }
  
  /**
   * Store experience in replay buffer
   * @param {Object} experience - Experience tuple
   */
  storeExperience(experience) {
    this.experienceBuffer.push(experience);
    
    // Remove oldest if buffer full
    if (this.experienceBuffer.length > this.maxBufferSize) {
      this.experienceBuffer.shift();
    }
  }
  
  /**
   * Sample batch from experience buffer
   * @param {Number} batchSize - Batch size
   * @returns {Array} Batch of experiences
   */
  sampleBatch(batchSize) {
    if (this.experienceBuffer.length < batchSize) {
      return this.experienceBuffer;
    }
    
    const batch = [];
    const used = new Set();
    
    while (batch.length < batchSize) {
      const index = Math.floor(Math.random() * this.experienceBuffer.length);
      if (!used.has(index)) {
        batch.push(this.experienceBuffer[index]);
        used.add(index);
      }
    }
    
    return batch;
  }
  
  /**
   * Train on batch of experiences
   * @param {Number} batchSize - Batch size
   * @returns {Object} Training metrics
   */
  trainOnBatch(batchSize = null) {
    const batch = this.sampleBatch(batchSize || this.config.batchSize);
    
    if (batch.length === 0) {
      return { trained: false, batchSize: 0 };
    }
    
    let totalError = 0;
    
    batch.forEach(experience => {
      const { state, action, reward, nextState } = experience;
      const tdError = this.updateQValue(state, action, reward, nextState);
      totalError += Math.abs(tdError);
    });
    
    return {
      trained: true,
      batchSize: batch.length,
      averageError: totalError / batch.length
    };
  }
  
  /**
   * Decay exploration rate
   */
  decayExploration() {
    this.epsilon = Math.max(
      this.config.minExplorationRate,
      this.epsilon * this.config.explorationDecay
    );
  }
  
  /**
   * Get policy (best action for each state)
   * @returns {Map} Policy map
   */
  getPolicy() {
    const policy = new Map();
    const states = new Set();
    
    // Extract unique states from Q-table
    this.qTable.forEach((value, key) => {
      const [state] = key.split('|');
      states.add(state);
    });
    
    // Find best action for each state
    states.forEach(state => {
      let maxQ = -Infinity;
      let bestAction = null;
      
      Object.values(ACTIONS).forEach(action => {
        const qValue = this.getQValue(state, action);
        if (qValue > maxQ) {
          maxQ = qValue;
          bestAction = action;
        }
      });
      
      policy.set(state, { action: bestAction, qValue: maxQ });
    });
    
    return policy;
  }
  
  /**
   * Get value function (max Q-value for each state)
   * @returns {Map} Value map
   */
  getValueFunction() {
    const values = new Map();
    const states = new Set();
    
    this.qTable.forEach((value, key) => {
      const [state] = key.split('|');
      states.add(state);
    });
    
    states.forEach(state => {
      let maxQ = -Infinity;
      
      Object.values(ACTIONS).forEach(action => {
        const qValue = this.getQValue(state, action);
        if (qValue > maxQ) {
          maxQ = qValue;
        }
      });
      
      values.set(state, maxQ);
    });
    
    return values;
  }
  
  /**
   * Get state from features
   * @param {Object} features - State features
   * @returns {String} State identifier
   */
  encodeState(features) {
    const components = [];
    
    // Recent score
    if (features.recentScore !== undefined) {
      if (features.recentScore < 40) components.push('struggling');
      else if (features.recentScore < 60) components.push('learning');
      else if (features.recentScore < 80) components.push('proficient');
      else components.push('mastery');
    }
    
    // Difficulty
    if (features.difficulty) {
      components.push(`diff_${features.difficulty}`);
    }
    
    // Session length
    if (features.sessionLength !== undefined) {
      if (features.sessionLength > 30) components.push('fatigued');
      else components.push('fresh');
    }
    
    // Trend
    if (features.trend) {
      components.push(`trend_${features.trend}`);
    }
    
    return components.join('_') || 'default';
  }
  
  /**
   * Calculate reward from outcome
   * @param {Object} outcome - Challenge outcome
   * @returns {Number} Reward
   */
  calculateReward(outcome) {
    let reward = 0;
    const rewards = this.config.rewards;
    
    const currentScore = outcome.currentScore || 0;
    const previousScore = outcome.previousScore || 0;
    
    // Score change reward
    if (currentScore > previousScore) {
      reward += rewards.scoreImprovement * ((currentScore - previousScore) / 100);
    } else if (currentScore < previousScore) {
      reward += rewards.scoreDecline * ((previousScore - currentScore) / 100);
    }
    
    // Pass/fail reward
    if (currentScore >= 60) {
      reward += rewards.passChallenge;
    } else {
      reward += rewards.failChallenge;
    }
    
    // Streak rewards
    if (outcome.streakLength && outcome.streakLength > 3) {
      reward += rewards.longStreak;
    }
    
    if (outcome.streakBroken) {
      reward += rewards.breakStreak;
    }
    
    // Time rewards
    if (outcome.completionTime) {
      const expectedTime = outcome.estimatedTime || 15;
      if (outcome.completionTime < expectedTime * 0.8) {
        reward += rewards.fastCompletion;
      } else if (outcome.completionTime > expectedTime * 1.5) {
        reward += rewards.slowCompletion;
      }
    }
    
    // Optimal difficulty reward (score in target range 60-80)
    if (currentScore >= 60 && currentScore <= 80) {
      reward += rewards.optimalDifficulty;
    }
    
    return reward;
  }
  
  /**
   * Get learning statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      qTableSize: this.qTable.size,
      experienceBufferSize: this.experienceBuffer.length,
      epsilon: Math.round(this.epsilon * 1000) / 1000,
      alpha: this.alpha,
      gamma: this.gamma,
      updateCount: this.updateCount,
      totalReward: Math.round(this.totalReward * 100) / 100,
      averageReward: this.updateCount > 0 
        ? Math.round((this.totalReward / this.updateCount) * 100) / 100
        : 0
    };
  }
  
  /**
   * Get state
   * @returns {Object} State
   */
  getState() {
    return {
      qTable: Array.from(this.qTable.entries()),
      epsilon: this.epsilon,
      updateCount: this.updateCount,
      totalReward: this.totalReward
    };
  }
  
  /**
   * Set state
   * @param {Object} state - State
   */
  setState(state) {
    if (state.qTable) {
      this.qTable = new Map(state.qTable);
    }
    if (state.epsilon !== undefined) {
      this.epsilon = state.epsilon;
    }
    if (state.updateCount !== undefined) {
      this.updateCount = state.updateCount;
    }
    if (state.totalReward !== undefined) {
      this.totalReward = state.totalReward;
    }
  }
  
  /**
   * Reset agent
   */
  reset() {
    this.qTable.clear();
    this.experienceBuffer = [];
    this.epsilon = this.config.explorationRate;
    this.updateCount = 0;
    this.totalReward = 0;
  }
}

// ============================================================================
// STUDENT Q-LEARNING MANAGEMENT
// ============================================================================

/**
 * Get or create Q-learning agent for student
 * @param {String} studentId - Student ID
 * @returns {Promise<QLearningAgent>}
 */
const getStudentAgent = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  const agent = new QLearningAgent();
  
  if (metaParams && metaParams.qLearningState) {
    agent.setState(metaParams.qLearningState);
  }
  
  return agent;
};

/**
 * Save agent state
 * @param {String} studentId - Student ID
 * @param {QLearningAgent} agent - Q-learning agent
 * @returns {Promise}
 */
const saveStudentAgent = async (studentId, agent) => {
  const state = agent.getState();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      qLearningState: state,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Recommend next action
 * @param {String} studentId - Student ID
 * @param {Object} currentContext - Current context
 * @returns {Promise<Object>}
 */
const recommendNextAction = async (studentId, currentContext) => {
  const agent = await getStudentAgent(studentId);
  
  // Encode current state
  const state = agent.encodeState(currentContext);
  
  // Select action
  const selection = agent.selectAction(state);
  
  return {
    recommendedAction: selection.action,
    strategy: selection.strategy,
    qValue: selection.qValue,
    epsilon: selection.epsilon,
    state,
    explanation: explainAction(selection.action, currentContext)
  };
};

/**
 * Learn from challenge outcome
 * @param {String} studentId - Student ID
 * @param {Object} previousContext - Previous context
 * @param {String} action - Action taken
 * @param {Object} outcome - Challenge outcome
 * @param {Object} newContext - New context
 * @returns {Promise<Object>}
 */
const learnFromOutcome = async (studentId, previousContext, action, outcome, newContext) => {
  const agent = await getStudentAgent(studentId);
  
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
  let trainingResult = null;
  if (agent.updateCount % agent.config.updateFrequency === 0) {
    trainingResult = agent.trainOnBatch();
  }
  
  // Decay exploration
  agent.decayExploration();
  
  // Save agent
  await saveStudentAgent(studentId, agent);
  
  return {
    reward: Math.round(reward * 100) / 100,
    tdError: Math.round(tdError * 100) / 100,
    qValue: agent.getQValue(state, action),
    epsilon: agent.epsilon,
    training: trainingResult
  };
};

/**
 * Get optimal policy
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getOptimalPolicy = async (studentId) => {
  const agent = await getStudentAgent(studentId);
  
  const policy = agent.getPolicy();
  const policyArray = Array.from(policy.entries()).map(([state, data]) => ({
    state,
    action: data.action,
    qValue: Math.round(data.qValue * 100) / 100,
    explanation: explainAction(data.action, { state })
  }));
  
  return {
    policy: policyArray,
    totalStates: policy.size
  };
};

/**
 * Get value function
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getValueFunction = async (studentId) => {
  const agent = await getStudentAgent(studentId);
  
  const values = agent.getValueFunction();
  const valuesArray = Array.from(values.entries()).map(([state, value]) => ({
    state,
    value: Math.round(value * 100) / 100
  }));
  
  return {
    values: valuesArray,
    totalStates: values.size
  };
};

/**
 * Explain action
 * @param {String} action - Action
 * @param {Object} context - Context
 * @returns {String} Explanation
 */
const explainAction = (action, context) => {
  const explanations = {
    [ACTIONS.DECREASE_DIFFICULTY]: 'Lower difficulty to build confidence and reduce frustration',
    [ACTIONS.MAINTAIN_DIFFICULTY]: 'Current difficulty is appropriate for learning',
    [ACTIONS.INCREASE_DIFFICULTY]: 'Challenge yourself with harder problems for growth',
    [ACTIONS.CHANGE_SIMULATION_TYPE]: 'Try a different simulation type for variety',
    [ACTIONS.REPEAT_SIMILAR]: 'Practice similar challenges to reinforce learning',
    [ACTIONS.TAKE_BREAK]: 'Take a break to avoid fatigue and maintain effectiveness'
  };
  
  return explanations[action] || 'Continue learning';
};

/**
 * Get Q-learning statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getQLearningStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.qLearningState) {
    return {
      initialized: false,
      message: 'No Q-learning data found'
    };
  }
  
  const agent = new QLearningAgent();
  agent.setState(metaParams.qLearningState);
  
  return {
    initialized: true,
    ...agent.getStatistics(),
    lastUpdated: metaParams.lastUpdated
  };
};

/**
 * Reset student agent
 * @param {String} studentId - Student ID
 * @returns {Promise}
 */
const resetStudentAgent = async (studentId) => {
  const agent = new QLearningAgent();
  agent.reset();
  
  await saveStudentAgent(studentId, agent);
  
  return agent.getStatistics();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  QLearningAgent,
  
  // Constants
  ACTIONS,
  STATES,
  
  // Student management
  getStudentAgent,
  saveStudentAgent,
  resetStudentAgent,
  
  // Recommendations
  recommendNextAction,
  learnFromOutcome,
  
  // Policy & value
  getOptimalPolicy,
  getValueFunction,
  
  // Statistics
  getQLearningStatistics,
  
  // Configuration
  DEFAULT_CONFIG
};