/**
 * SPI SERVICE
 * ------------------------------------------------------------
 * SPI = Student Performance Index
 * - Deterministic computation
 * - No DB writes
 * - No ledger / report logic
 * - Returns ONLY plain JS objects
 *
 * Uses:
 * - Kalman Filter (smoothing)
 * - HMM (learning state)
 * - Bayesian (concept mastery)
 */

const { Challenge } = require('../models');

const kalman = require('./algorithms/kalman.algorithm.service');
const hmm = require('./algorithms/hmm.algorithm.service');
const bayesian = require('./algorithms/bayesian.algorithm.service');

// ============================================================================
// MAIN ENTRY
// ============================================================================

async function calculateSPI(studentId, options = {}) {
  const { includeBreakdown = true } = options;

  // ------------------------------------------------------------
  // 1️⃣ Fetch evaluated challenges (LEAN OBJECTS)
  // ------------------------------------------------------------
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated'
  })
    .sort({ evaluatedAt: 1 })
    .lean();

  if (!challenges.length) {
    return {
      spi: 0,
      spi_raw: 0,
      kalman_estimate: 0,
      kalman_uncertainty: 100,
      grade: 'N/A',
      learning_state: 'no_data',
      concept_mastery: {},
      totalChallenges: 0,
      components: {}
    };
  }

  // ------------------------------------------------------------
  // 2️⃣ Extract REAL SCORES (🔥 FIXED)
  // ------------------------------------------------------------
  const scores = challenges.map(c => c.results?.totalScore || 0);

  // ------------------------------------------------------------
  // 3️⃣ Core Components
  // ------------------------------------------------------------
  const accuracy = calculateAccuracy(scores);
  const consistency = calculateConsistency(scores);
  const improvement = calculateImprovement(scores);

  const rawSPI = Math.round(
    accuracy * 0.35 +
    consistency * 0.25 +
    improvement * 0.15
  );

  // ------------------------------------------------------------
  // 4️⃣ Kalman Filter
  // ------------------------------------------------------------
  let kalmanEstimate = rawSPI;
  let kalmanUncertainty = 100;

  try {
    const kalmanState = await kalman.updateKalman(studentId, rawSPI);
    kalmanEstimate = Math.round(kalmanState.estimate);
    kalmanUncertainty = Math.round(kalmanState.uncertainty);
  } catch (err) {
    // fallback to raw SPI
  }

  // ------------------------------------------------------------
  // 5️⃣ HMM Learning State
  // ------------------------------------------------------------
  let learningState = 'learning';

  try {
    learningState = await hmm.updateLearningState(studentId, rawSPI);
  } catch (err) {}

  // ------------------------------------------------------------
  // 6️⃣ Bayesian Concept Mastery
  // ------------------------------------------------------------
  let conceptMastery = {};

  try {
    const mastery = await bayesian.getConceptMastery(studentId);
    conceptMastery = JSON.parse(JSON.stringify(mastery || {}));
  } catch (err) {
    conceptMastery = {};
  }

  // ------------------------------------------------------------
  // 7️⃣ Final Result
  // ------------------------------------------------------------
  const result = {
    spi: kalmanEstimate,
    spi_raw: rawSPI,
    kalman_estimate: kalmanEstimate,
    kalman_uncertainty: kalmanUncertainty,
    grade: getSPIGrade(kalmanEstimate),
    learning_state: learningState,
    concept_mastery: conceptMastery,
    totalChallenges: challenges.length
  };

  if (includeBreakdown) {
    result.components = {
      accuracy: roundComponent(accuracy, 0.35),
      consistency: roundComponent(consistency, 0.25),
      improvement: roundComponent(improvement, 0.15)
    };
  }

  return result;
}

// ============================================================================
// HELPER FUNCTIONS (PURE)
// ============================================================================

function calculateAccuracy(scores) {
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function calculateConsistency(scores) {
  if (scores.length < 2) return 100;

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;

  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
    scores.length;

  const stdDev = Math.sqrt(variance);

  return Math.max(0, 100 - (stdDev / 30) * 100);
}

function calculateImprovement(scores) {
  if (scores.length < 3) return 50;

  const first = scores[0];
  const last = scores[scores.length - 1];

  return Math.max(0, Math.min(100, 50 + (last - first)));
}

function roundComponent(score, weight) {
  return {
    score: Math.round(score),
    weight,
    contribution: Math.round(score * weight)
  };
}

function getSPIGrade(spi) {
  if (spi >= 90) return 'A+';
  if (spi >= 85) return 'A';
  if (spi >= 80) return 'A-';
  if (spi >= 75) return 'B+';
  if (spi >= 70) return 'B';
  if (spi >= 65) return 'B-';
  if (spi >= 60) return 'C+';
  if (spi >= 55) return 'C';
  if (spi >= 50) return 'C-';
  return 'F';
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  calculateSPI
};
