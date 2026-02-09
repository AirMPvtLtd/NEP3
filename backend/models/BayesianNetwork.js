/**
 * BAYESIAN NETWORK MODEL (SPI + ADVANCED INFERENCE)
 * ------------------------------------------------------------
 * FIXES:
 * - studentId switched to STRING (domain ID)
 * - beliefs normalized for SPI usage
 * - advanced inference retained but isolated
 */

const mongoose = require('mongoose');
const BayesianNetworkAlgorithm = require('../algorithms/bayesian.network');

const bayesianNetworkSchema = new mongoose.Schema(
  {
    // =========================================================
    // IDENTIFIER (FIXED)
    // =========================================================
    studentId: {
      type: String,              // ✅ FIXED (was ObjectId)
      required: true,
      unique: true,
      index: true
    },

    // =========================================================
    // NETWORK STRUCTURE (ADVANCED / OPTIONAL)
    // =========================================================
    network: {
      nodes: [
        {
          id: String,
          name: String,
          type: String,
          states: [String],
          cpt: Object
        }
      ],
      edges: [
        {
          from: String,
          to: String,
          strength: Number
        }
      ]
    },

    // =========================================================
    // BELIEFS (SPI USES THIS)
    // Map<concept, probability>
    // =========================================================
    beliefs: {
      type: Object,     // ✅ NOT Map
      default: {}
    },


    // =========================================================
    // EVIDENCE (ADVANCED ONLY)
    // =========================================================
    evidence: {
      type: Map,
      of: String,
      default: {}
    },

    // =========================================================
    // ALGORITHM STATE (ADVANCED ONLY)
    // =========================================================
    algorithmState: {
      junctionTree: Object,
      cliques: [Object],
      separators: [Object],
      lastInference: Date
    },

    // =========================================================
    // INFERENCE HISTORY (ADVANCED ONLY)
    // =========================================================
    inferences: [
      {
        query: String,
        result: Object,
        method: String,
        confidence: Number,
        timestamp: Date
      }
    ]
  },
  { timestamps: true }
);

// ============================================================================
// ====================== ADVANCED INFERENCE METHODS ==========================
// (SPI DOES NOT CALL THESE)
// ============================================================================

bayesianNetworkSchema.methods.initializeAlgorithm = function () {
  const network = new BayesianNetworkAlgorithm();

  if (this.network?.nodes) {
    this.network.nodes.forEach(node => {
      network.addNode(node.id, node.states, node.type);
      network.setCPT(node.id, node.cpt);
    });
  }

  if (this.network?.edges) {
    this.network.edges.forEach(edge => {
      network.addEdge(edge.from, edge.to);
    });
  }

  return network;
};

bayesianNetworkSchema.methods.infer = async function (queryVariable, method = 'auto') {
  const network = this.initializeAlgorithm();

  for (const [variable, value] of this.evidence.entries()) {
    network.setEvidence(variable, value);
  }

  let result;
  if (method === 'junction_tree') {
    result = network.junctionTreeInference(queryVariable);
  } else {
    result = network.variableElimination(queryVariable);
  }

  this.inferences.push({
    query: queryVariable,
    result: result.probabilities,
    method,
    confidence: result.confidence || 0.5,
    timestamp: new Date()
  });

  if (this.inferences.length > 100) {
    this.inferences = this.inferences.slice(-100);
  }

  await this.save();
  return result;
};

// ============================================================================
// ======================== SPI SAFE STATIC HELPERS ============================
// ============================================================================

/**
 * Ensure SPI-safe document exists
 */
bayesianNetworkSchema.statics.ensureForStudent = async function (studentId) {
  let doc = await this.findOne({ studentId });
  if (!doc) {
    doc = await this.create({
      studentId,
      beliefs: {}
    });
  }
  return doc;
};

// ============================================================================
// EXPORT
// ============================================================================
module.exports = mongoose.model('BayesianNetwork', bayesianNetworkSchema);
