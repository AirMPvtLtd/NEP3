// algorithms/attention.mechanism.js
/**
 * ATTENTION MECHANISM - COMPLETE PRODUCTION VERSION
 * Attention weights for personalized learning focus
 * 
 * @module algorithms/attention.mechanism
 */

const { MetaParameters, Challenge, Student } = require('../models');

// ============================================================================
// ATTENTION CONFIGURATION
// ============================================================================

const ATTENTION_DIMENSIONS = {
  SIMULATION_TYPE: 'simulation_type',
  DIFFICULTY: 'difficulty',
  COMPETENCY: 'competency',
  TIME_OF_DAY: 'time_of_day',
  SESSION_LENGTH: 'session_length',
  RECENT_PERFORMANCE: 'recent_performance'
};

const DEFAULT_CONFIG = {
  // Attention temperature (controls focus sharpness)
  temperature: 1.0,
  
  // Query dimension weights
  queryWeights: {
    [ATTENTION_DIMENSIONS.SIMULATION_TYPE]: 0.25,
    [ATTENTION_DIMENSIONS.DIFFICULTY]: 0.20,
    [ATTENTION_DIMENSIONS.COMPETENCY]: 0.30,
    [ATTENTION_DIMENSIONS.TIME_OF_DAY]: 0.10,
    [ATTENTION_DIMENSIONS.SESSION_LENGTH]: 0.05,
    [ATTENTION_DIMENSIONS.RECENT_PERFORMANCE]: 0.10
  },
  
  // Key/value embedding dimensions
  embeddingDim: 16,
  
  // History window
  historyWindow: 20,
  
  // Minimum attention threshold
  minAttention: 0.01
};

// ============================================================================
// ATTENTION MECHANISM CLASS
// ============================================================================

class AttentionMechanism {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Learned embeddings for each dimension
    this.embeddings = this.initializeEmbeddings();
    
    // Attention history
    this.attentionHistory = [];
    
    // Context memory
    this.contextMemory = [];
  }
  
  /**
   * Initialize random embeddings
   * @returns {Object} Embeddings
   */
  initializeEmbeddings() {
    const embeddings = {};
    
    Object.values(ATTENTION_DIMENSIONS).forEach(dim => {
      embeddings[dim] = this.randomVector(this.config.embeddingDim);
    });
    
    return embeddings;
  }
  
  /**
   * Generate random vector
   * @param {Number} dim - Dimension
   * @returns {Array} Random vector
   */
  randomVector(dim) {
    return Array(dim).fill(0).map(() => (Math.random() - 0.5) * 0.1);
  }
  
  /**
   * Calculate attention weights
   * @param {Object} query - Current context/query
   * @param {Array} keys - Historical keys
   * @param {Array} values - Historical values
   * @returns {Object} Attention output
   */
  calculateAttention(query, keys, values) {
    if (keys.length === 0) {
      return {
        output: query,
        weights: [],
        totalAttention: 0
      };
    }
    
    // Encode query
    const queryVector = this.encode(query);
    
    // Calculate attention scores
    const scores = keys.map(key => {
      const keyVector = this.encode(key);
      return this.dotProduct(queryVector, keyVector);
    });
    
    // Apply temperature and softmax
    const weights = this.softmax(scores, this.config.temperature);
    
    // Filter by minimum threshold
    const filteredWeights = weights.map(w => 
      w >= this.config.minAttention ? w : 0
    );
    
    // Renormalize
    const normalizedWeights = this.normalize(filteredWeights);
    
    // Calculate weighted sum of values
    const output = this.weightedSum(values, normalizedWeights);
    
    return {
      output,
      weights: normalizedWeights,
      totalAttention: normalizedWeights.reduce((sum, w) => sum + w, 0),
      topK: this.getTopK(normalizedWeights, keys, 3)
    };
  }
  
  /**
   * Multi-head attention
   * @param {Object} query - Query
   * @param {Array} keys - Keys
   * @param {Array} values - Values
   * @param {Number} numHeads - Number of heads
   * @returns {Object} Multi-head output
   */
  multiHeadAttention(query, keys, values, numHeads = 4) {
    const heads = [];
    
    for (let i = 0; i < numHeads; i++) {
      // Each head has different temperature
      const headTemp = this.config.temperature * (1 + i * 0.2);
      const originalTemp = this.config.temperature;
      
      this.config.temperature = headTemp;
      const headOutput = this.calculateAttention(query, keys, values);
      this.config.temperature = originalTemp;
      
      heads.push(headOutput);
    }
    
    // Concatenate and aggregate heads
    const aggregatedWeights = this.aggregateHeads(heads.map(h => h.weights));
    const aggregatedOutput = this.weightedSum(values, aggregatedWeights);
    
    return {
      output: aggregatedOutput,
      weights: aggregatedWeights,
      heads: heads.map(h => ({
        weights: h.weights,
        topK: h.topK
      }))
    };
  }
  
  /**
   * Encode context into vector
   * @param {Object} context - Context object
   * @returns {Array} Encoded vector
   */
  encode(context) {
    const vector = Array(this.config.embeddingDim).fill(0);
    
    Object.entries(context).forEach(([key, value]) => {
      if (this.embeddings[key]) {
        const weight = this.config.queryWeights[key] || 0.1;
        const embedding = this.embeddings[key];
        
        // Weighted addition
        for (let i = 0; i < this.config.embeddingDim; i++) {
          vector[i] += embedding[i] * weight * this.normalizeValue(value);
        }
      }
    });
    
    return this.normalizeVector(vector);
  }
  
  /**
   * Normalize value to [0, 1]
   * @param {*} value - Value
   * @returns {Number} Normalized value
   */
  normalizeValue(value) {
    if (typeof value === 'number') {
      return Math.min(1, Math.max(0, value / 100));
    }
    if (typeof value === 'string') {
      return value.length / 20;
    }
    return 0.5;
  }
  
  /**
   * Normalize vector to unit length
   * @param {Array} vector - Vector
   * @returns {Array} Normalized vector
   */
  normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }
  
  /**
   * Dot product of two vectors
   * @param {Array} a - Vector a
   * @param {Array} b - Vector b
   * @returns {Number} Dot product
   */
  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
  
  /**
   * Softmax function
   * @param {Array} scores - Scores
   * @param {Number} temperature - Temperature
   * @returns {Array} Probabilities
   */
  softmax(scores, temperature = 1.0) {
    const scaledScores = scores.map(s => s / temperature);
    const maxScore = Math.max(...scaledScores);
    const expScores = scaledScores.map(s => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((sum, exp) => sum + exp, 0);
    return expScores.map(exp => exp / sumExp);
  }
  
  /**
   * Normalize array to sum to 1
   * @param {Array} values - Values
   * @returns {Array} Normalized values
   */
  normalize(values) {
    const sum = values.reduce((s, v) => s + v, 0);
    return sum > 0 ? values.map(v => v / sum) : values;
  }
  
  /**
   * Weighted sum of values
   * @param {Array} values - Values
   * @param {Array} weights - Weights
   * @returns {Object} Weighted sum
   */
  weightedSum(values, weights) {
    if (values.length === 0) return {};
    
    const result = {};
    
    // Assume values are objects
    values.forEach((value, i) => {
      const weight = weights[i] || 0;
      
      Object.entries(value).forEach(([key, val]) => {
        if (typeof val === 'number') {
          result[key] = (result[key] || 0) + val * weight;
        }
      });
    });
    
    return result;
  }
  
  /**
   * Get top-K attention weights
   * @param {Array} weights - Weights
   * @param {Array} keys - Keys
   * @param {Number} k - Number of top items
   * @returns {Array} Top-K items
   */
  getTopK(weights, keys, k) {
    const indexed = weights.map((weight, index) => ({
      weight,
      key: keys[index],
      index
    }));
    
    indexed.sort((a, b) => b.weight - a.weight);
    
    return indexed.slice(0, k).map(item => ({
      weight: Math.round(item.weight * 1000) / 1000,
      key: item.key,
      index: item.index
    }));
  }
  
  /**
   * Aggregate attention heads
   * @param {Array} headWeights - Array of weight arrays
   * @returns {Array} Aggregated weights
   */
  aggregateHeads(headWeights) {
    if (headWeights.length === 0) return [];
    
    const numItems = headWeights[0].length;
    const aggregated = Array(numItems).fill(0);
    
    headWeights.forEach(weights => {
      weights.forEach((weight, i) => {
        aggregated[i] += weight;
      });
    });
    
    return this.normalize(aggregated);
  }
  
  /**
   * Self-attention (query = key = value)
   * @param {Array} sequence - Sequence of items
   * @returns {Object} Self-attention output
   */
  selfAttention(sequence) {
    return this.calculateAttention(
      sequence[sequence.length - 1],
      sequence,
      sequence
    );
  }
  
  /**
   * Cross-attention (different queries and keys)
   * @param {Object} query - Query
   * @param {Array} context - Context
   * @returns {Object} Cross-attention output
   */
  crossAttention(query, context) {
    return this.calculateAttention(
      query,
      context.map(c => c.key),
      context.map(c => c.value)
    );
  }
  
  /**
   * Update embeddings (simple gradient-like update)
   * @param {Object} query - Query
   * @param {Number} reward - Reward/feedback
   */
  updateEmbeddings(query, reward) {
    const learningRate = 0.01;
    
    Object.entries(query).forEach(([key, value]) => {
      if (this.embeddings[key]) {
        const normalizedValue = this.normalizeValue(value);
        const gradient = reward * normalizedValue * learningRate;
        
        this.embeddings[key] = this.embeddings[key].map(v => 
          v + gradient * (Math.random() - 0.5) * 0.1
        );
      }
    });
  }
  
  /**
   * Get attention visualization
   * @param {Array} weights - Weights
   * @param {Array} keys - Keys
   * @returns {Array} Visualization data
   */
  getVisualization(weights, keys) {
    return weights.map((weight, i) => ({
      index: i,
      weight: Math.round(weight * 100),
      key: keys[i],
      bar: '█'.repeat(Math.round(weight * 50))
    }));
  }
  
  /**
   * Get state
   * @returns {Object} State
   */
  getState() {
    return {
      embeddings: this.embeddings,
      temperature: this.config.temperature,
      attentionHistoryLength: this.attentionHistory.length
    };
  }
  
  /**
   * Set state
   * @param {Object} state - State
   */
  setState(state) {
    if (state.embeddings) {
      this.embeddings = state.embeddings;
    }
    if (state.temperature) {
      this.config.temperature = state.temperature;
    }
  }
}

// ============================================================================
// STUDENT ATTENTION MANAGEMENT
// ============================================================================

/**
 * Get or create attention mechanism for student
 * @param {String} studentId - Student ID
 * @returns {Promise<AttentionMechanism>}
 */
const getStudentAttention = async (studentId) => {
  let metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.attentionEmbeddings) {
    const attention = new AttentionMechanism();
    return attention;
  }
  
  const attention = new AttentionMechanism();
  attention.setState({
    embeddings: metaParams.attentionEmbeddings,
    temperature: metaParams.attentionTemperature || DEFAULT_CONFIG.temperature
  });
  
  return attention;
};

/**
 * Save attention state
 * @param {String} studentId - Student ID
 * @param {AttentionMechanism} attention - Attention mechanism
 * @returns {Promise}
 */
const saveStudentAttention = async (studentId, attention) => {
  const state = attention.getState();
  
  await MetaParameters.findOneAndUpdate(
    { studentId },
    {
      attentionEmbeddings: state.embeddings,
      attentionTemperature: state.temperature,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
};

/**
 * Calculate learning focus
 * @param {String} studentId - Student ID
 * @param {Object} currentContext - Current context
 * @returns {Promise<Object>}
 */
const calculateLearningFocus = async (studentId, currentContext) => {
  const attention = await getStudentAttention(studentId);
  
  // Get historical challenges as context
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated'
  })
    .sort({ createdAt: -1 })
    .limit(attention.config.historyWindow);
  
  const keys = challenges.map(c => ({
    simulation_type: c.simulationType,
    difficulty: c.difficulty,
    competency: c.competencies?.[0] || 'general',
    recent_performance: c.evaluation?.score || 0
  }));
  
  const values = challenges.map(c => ({
    score: c.evaluation?.score || 0,
    timeTaken: c.metadata?.timeTaken || 15,
    success: (c.evaluation?.score || 0) >= 60 ? 1 : 0
  }));
  
  const result = attention.calculateAttention(currentContext, keys, values);
  
  return {
    focusAreas: result.topK,
    attentionWeights: result.weights,
    totalAttention: result.totalAttention,
    recommendations: generateRecommendations(result.topK)
  };
};

/**
 * Multi-head learning focus
 * @param {String} studentId - Student ID
 * @param {Object} currentContext - Current context
 * @param {Number} numHeads - Number of attention heads
 * @returns {Promise<Object>}
 */
const multiHeadLearningFocus = async (studentId, currentContext, numHeads = 4) => {
  const attention = await getStudentAttention(studentId);
  
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated'
  })
    .sort({ createdAt: -1 })
    .limit(attention.config.historyWindow);
  
  const keys = challenges.map(c => ({
    simulation_type: c.simulationType,
    difficulty: c.difficulty,
    competency: c.competencies?.[0] || 'general'
  }));
  
  const values = challenges.map(c => ({
    score: c.evaluation?.score || 0,
    success: (c.evaluation?.score || 0) >= 60 ? 1 : 0
  }));
  
  const result = attention.multiHeadAttention(currentContext, keys, values, numHeads);
  
  return {
    aggregatedFocus: result.output,
    attentionWeights: result.weights,
    heads: result.heads,
    recommendations: generateRecommendations(
      attention.getTopK(result.weights, keys, 5)
    )
  };
};

/**
 * Update attention from feedback
 * @param {String} studentId - Student ID
 * @param {Object} context - Context
 * @param {Number} score - Score/reward
 * @returns {Promise}
 */
const updateAttentionFromFeedback = async (studentId, context, score) => {
  const attention = await getStudentAttention(studentId);
  
  // Normalize score to [-1, 1] reward
  const reward = (score - 50) / 50;
  
  attention.updateEmbeddings(context, reward);
  
  await saveStudentAttention(studentId, attention);
  
  return {
    updated: true,
    reward,
    newState: attention.getState()
  };
};

/**
 * Get attention visualization
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getAttentionVisualization = async (studentId) => {
  const attention = await getStudentAttention(studentId);
  
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated'
  })
    .sort({ createdAt: -1 })
    .limit(10);
  
  if (challenges.length === 0) {
    return {
      visualization: [],
      message: 'No data available'
    };
  }
  
  const currentContext = {
    simulation_type: challenges[0].simulationType,
    difficulty: challenges[0].difficulty,
    recent_performance: challenges[0].evaluation?.score || 0
  };
  
  const keys = challenges.map(c => ({
    type: c.simulationType,
    diff: c.difficulty,
    date: c.createdAt.toISOString().split('T')[0]
  }));
  
  const values = challenges.map(c => ({
    score: c.evaluation?.score || 0
  }));
  
  const result = attention.calculateAttention(currentContext, keys, values);
  const visualization = attention.getVisualization(result.weights, keys);
  
  return {
    visualization,
    topFocus: result.topK
  };
};

/**
 * Generate recommendations from top-K
 * @param {Array} topK - Top-K attention items
 * @returns {Array} Recommendations
 */
const generateRecommendations = (topK) => {
  const recommendations = [];
  
  topK.forEach((item, index) => {
    if (item.weight > 0.1) {
      const key = item.key;
      recommendations.push({
        priority: index + 1,
        simulationType: key.simulation_type || key.type,
        difficulty: key.difficulty || key.diff,
        reason: `High attention weight (${Math.round(item.weight * 100)}%)`,
        weight: item.weight
      });
    }
  });
  
  return recommendations;
};

/**
 * Get attention statistics
 * @param {String} studentId - Student ID
 * @returns {Promise<Object>}
 */
const getAttentionStatistics = async (studentId) => {
  const metaParams = await MetaParameters.findOne({ studentId });
  
  if (!metaParams || !metaParams.attentionEmbeddings) {
    return {
      initialized: false,
      message: 'No attention mechanism data found'
    };
  }
  
  return {
    initialized: true,
    temperature: metaParams.attentionTemperature,
    embeddingDimensions: Object.keys(metaParams.attentionEmbeddings).length,
    lastUpdated: metaParams.lastUpdated
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Class
  AttentionMechanism,
  
  // Constants
  ATTENTION_DIMENSIONS,
  
  // Student management
  getStudentAttention,
  saveStudentAttention,
  
  // Focus calculation
  calculateLearningFocus,
  multiHeadLearningFocus,
  
  // Updates
  updateAttentionFromFeedback,
  
  // Visualization
  getAttentionVisualization,
  getAttentionStatistics,
  
  // Configuration
  DEFAULT_CONFIG
};