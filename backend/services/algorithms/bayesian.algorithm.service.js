/**
 * BAYESIAN ALGORITHM SERVICE (SPI VERSION – FINAL)
 * ------------------------------------------------------------
 * PURPOSE:
 * - Track concept / competency mastery probabilistically
 * - Incremental belief updates from evaluated challenges
 * - Deterministic, audit-safe, SPI-compatible
 *
 * IMPORTANT:
 * - NO MetaParameters
 * - NO prediction / inference
 * - NO classes
 * - studentId is STRING
 */

const BayesianNetwork = require('../../models/BayesianNetwork');

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------
const PRIOR = 0.5;
const ALPHA_SUCCESS = 0.12;
const ALPHA_FAILURE = 0.08;
const MIN = 0.05;
const MAX = 0.95;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function clamp(x) {
  return Math.max(MIN, Math.min(MAX, x));
}

// -----------------------------------------------------------------------------
// Get current concept mastery
// -----------------------------------------------------------------------------
async function getConceptMastery(studentId) {
  if (!studentId) throw new Error('getConceptMastery requires studentId');

  const doc = await BayesianNetwork.findOne({ studentId });
  if (!doc || !doc.beliefs) return {};

  const normalized = {};
  for (const [k, v] of Object.entries(doc.beliefs)) {
    normalized[k] = clamp(Number(v));
  }
  return normalized;
}

// -----------------------------------------------------------------------------
// Update belief for a single concept
// outcome: 'success' | 'failure'
// -----------------------------------------------------------------------------
async function updateBelief(studentId, concept, outcome) {
  if (!studentId || !concept) {
    throw new Error('updateBelief requires studentId and concept');
  }

  const doc =
    (await BayesianNetwork.findOne({ studentId })) ||
    new BayesianNetwork({
      studentId,
      beliefs: {},
      updatedAt: new Date()
    });

  const current = Number(doc.beliefs[concept] ?? PRIOR);
  const alpha = outcome === 'success' ? ALPHA_SUCCESS : ALPHA_FAILURE;

  const updated =
    outcome === 'success'
      ? current + alpha * (1 - current)
      : current - alpha * current;

  doc.beliefs[concept] = clamp(updated);
  doc.updatedAt = new Date();

  await doc.save();
  return getConceptMastery(studentId);
}

// -----------------------------------------------------------------------------
// Bulk update from competencyScores map
// score >= 70 → success, else failure
// -----------------------------------------------------------------------------
async function bulkUpdate(studentId, competencyScores = {}) {
  if (!studentId) throw new Error('bulkUpdate requires studentId');

  const entries = Object.entries(competencyScores);
  if (!entries.length) return getConceptMastery(studentId);

  const doc =
    (await BayesianNetwork.findOne({ studentId })) ||
    new BayesianNetwork({
      studentId,
      beliefs: {},
      updatedAt: new Date()
    });

  for (const [concept, score] of entries) {
    const current = Number(doc.beliefs[concept] ?? PRIOR);
    const isSuccess = Number(score) >= 70;
    const alpha = isSuccess ? ALPHA_SUCCESS : ALPHA_FAILURE;

    const updated = isSuccess
      ? current + alpha * (1 - current)
      : current - alpha * current;

    doc.beliefs[concept] = clamp(updated);
  }

  doc.updatedAt = new Date();
  await doc.save();

  return getConceptMastery(studentId);
}

// -----------------------------------------------------------------------------
// Reset beliefs (admin / testing only)
// -----------------------------------------------------------------------------
async function reset(studentId) {
  if (!studentId) return;
  await BayesianNetwork.deleteOne({ studentId });
}

// -----------------------------------------------------------------------------
// EXPORTS — THIS CONTRACT IS LOCKED
// -----------------------------------------------------------------------------
module.exports = {
  getConceptMastery,
  updateBelief,
  bulkUpdate,
  reset
};
