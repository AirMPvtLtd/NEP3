/**
 * BAYESIAN NETWORK MODEL (Enhanced with Algorithm)
 * Uses algorithms/bayesian.network.js for inference
 */

const mongoose = require('mongoose');
const BayesianNetworkAlgorithm = require('../algorithms/bayesian.network');

const bayesianNetworkSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
    index: true
  },
  
  // Network structure (kept from original model)
  network: {
    nodes: [{
      id: String,
      name: String,
      type: String,
      states: [String],
      cpt: Object
    }],
    edges: [{
      from: String,
      to: String,
      strength: Number
    }]
  },
  
  // Current beliefs
  beliefs: {
    type: Map,
    of: Object,
    default: new Map()
  },
  
  // Evidence
  evidence: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // ✅ NEW: Algorithm instance state
  algorithmState: {
    junctionTree: Object,
    cliques: [Object],
    separators: [Object],
    lastInference: Date
  },
  
  // Inference results
  inferences: [{
    query: String,
    result: Object,
    method: String, // 'variable_elimination', 'junction_tree', 'message_passing'
    confidence: Number,
    timestamp: Date
  }],
  
  // ... rest of schema ...
  
}, {
  timestamps: true
});

// ============================================================================
// METHODS (Enhanced with Algorithm)
// ============================================================================

/**
 * Initialize Bayesian network algorithm
 */
bayesianNetworkSchema.methods.initializeAlgorithm = function() {
  const network = new BayesianNetworkAlgorithm();
  
  // Add nodes
  this.network.nodes.forEach(node => {
    network.addNode(node.id, node.states, node.type);
    network.setCPT(node.id, node.cpt);
  });
  
  // Add edges
  this.network.edges.forEach(edge => {
    network.addEdge(edge.from, edge.to);
  });
  
  return network;
};

/**
 * Update evidence (enhanced)
 */
bayesianNetworkSchema.methods.updateEvidence = async function(variableName, value) {
  this.evidence.set(variableName, value);
  
  // ✅ NEW: Trigger inference after evidence update
  await this.infer(variableName);
  
  this.updatedAt = new Date();
  return this.save();
};

/**
 * Perform Bayesian inference (enhanced with algorithm)
 */
bayesianNetworkSchema.methods.infer = async function(queryVariable, method = 'auto') {
  try {
    // Initialize algorithm
    const network = this.initializeAlgorithm();
    
    // Set evidence
    for (const [variable, value] of this.evidence.entries()) {
      network.setEvidence(variable, value);
    }
    
    // Choose inference method
    let result;
    let inferenceMethod;
    
    if (method === 'auto') {
      // Choose based on network size
      const nodeCount = this.network.nodes.length;
      inferenceMethod = nodeCount < 10 ? 'variable_elimination' : 'junction_tree';
    } else {
      inferenceMethod = method;
    }
    
    // Perform inference
    switch (inferenceMethod) {
      case 'variable_elimination':
        result = network.variableElimination(queryVariable);
        break;
      
      case 'junction_tree':
        // Build junction tree if not exists
        if (!this.algorithmState?.junctionTree) {
          const junctionTree = network.buildJunctionTree();
          this.algorithmState = {
            junctionTree: junctionTree.serialize(),
            cliques: junctionTree.cliques,
            separators: junctionTree.separators,
            lastInference: new Date()
          };
        }
        result = network.junctionTreeInference(queryVariable);
        break;
      
      case 'message_passing':
        result = network.messagePassingInference(queryVariable);
        break;
      
      default:
        result = network.variableElimination(queryVariable);
    }
    
    // Store inference result
    this.inferences.push({
      query: queryVariable,
      result: result.probabilities,
      method: inferenceMethod,
      confidence: result.confidence || this.calculateConfidence(result.probabilities),
      timestamp: new Date()
    });
    
    // Limit inference history
    if (this.inferences.length > 100) {
      this.inferences = this.inferences.slice(-100);
    }
    
    await this.save();
    
    return result;
    
  } catch (error) {
    console.error('Bayesian inference error:', error);
    throw error;
  }
};

/**
 * Predict using Bayesian network (enhanced)
 */
bayesianNetworkSchema.methods.predict = async function(targetVariable) {
  const inference = await this.infer(targetVariable);
  
  // Get most likely state
  const probabilities = inference.probabilities;
  const mostLikely = Object.entries(probabilities)
    .reduce((max, [state, prob]) => 
      prob > max.probability ? { state, probability: prob } : max,
      { state: null, probability: 0 }
    );
  
  return {
    prediction: mostLikely.state,
    confidence: mostLikely.probability,
    distribution: probabilities,
    method: inference.method || 'variable_elimination'
  };
};

/**
 * Calculate confidence from probability distribution
 */
bayesianNetworkSchema.methods.calculateConfidence = function(probabilities) {
  const probs = Object.values(probabilities);
  const max = Math.max(...probs);
  const entropy = -probs.reduce((sum, p) => 
    p > 0 ? sum + p * Math.log2(p) : sum, 0
  );
  const maxEntropy = Math.log2(probs.length);
  
  // Confidence based on max probability and low entropy
  return (max + (1 - entropy / maxEntropy)) / 2;
};

/**
 * Learn network structure from data
 */
bayesianNetworkSchema.methods.learnStructure = async function(data) {
  const network = this.initializeAlgorithm();
  
  // Use K2 algorithm or hill climbing
  const learnedStructure = network.learnStructure(data, {
    algorithm: 'K2',
    maxParents: 3
  });
  
  // Update network structure
  this.network.edges = learnedStructure.edges;
  
  await this.save();
  
  return learnedStructure;
};

/**
 * Update CPTs from data
 */
bayesianNetworkSchema.methods.updateFromData = async function(data) {
  const network = this.initializeAlgorithm();
  
  // Learn CPTs using maximum likelihood
  const updatedCPTs = network.learnParameters(data);
  
  // Update CPTs in model
  this.network.nodes.forEach(node => {
    if (updatedCPTs[node.id]) {
      node.cpt = updatedCPTs[node.id];
    }
  });
  
  await this.save();
  
  return updatedCPTs;
};

// ============================================================================
// STATIC METHODS (Enhanced)
// ============================================================================

/**
 * Create network for student (with algorithm)
 */
bayesianNetworkSchema.statics.createForStudent = async function(studentId) {
  // Use existing createForStudent logic...
  const defaultNetwork = {
    nodes: [
      {
        id: 'prior_knowledge',
        name: 'Prior Knowledge',
        type: 'observable',
        states: ['low', 'medium', 'high'],
        cpt: { low: 0.3, medium: 0.5, high: 0.2 }
      },
      // ... other nodes ...
    ],
    edges: [
      { from: 'prior_knowledge', to: 'performance', strength: 0.6 },
      // ... other edges ...
    ]
  };
  
  const bayesianNetwork = await this.create({
    studentId,
    network: defaultNetwork,
    beliefs: new Map(),
    evidence: new Map(),
    algorithmState: {}
  });
  
  // Initialize algorithm and build junction tree
  const network = bayesianNetwork.initializeAlgorithm();
  const junctionTree = network.buildJunctionTree();
  
  bayesianNetwork.algorithmState = {
    junctionTree: junctionTree.serialize(),
    cliques: junctionTree.cliques,
    separators: junctionTree.separators,
    lastInference: new Date()
  };
  
  await bayesianNetwork.save();
  
  return bayesianNetwork;
};

module.exports = mongoose.model('BayesianNetwork', bayesianNetworkSchema);