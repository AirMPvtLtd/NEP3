/**
 * Kalman Algorithm Service
 * ------------------------------------------------------------
 * PURPOSE:
 * - Smooth student performance signal over time
 * - Reduce noise from single evaluations
 * - Persist longitudinal ability estimate
 *
 * DESIGN:
 * - Stateless service API
 * - State persisted in KalmanState model
 * - studentId is STRING (domain ID, not ObjectId)
 *
 * CONTRACT:
 * - update(studentId, observation, meta?) -> KalmanState
 */

const KalmanState = require('../../models/KalmanState');
const HMMState = require('../../models/HMMState');
const BayesianState = require('../../models/BayesianNetwork');

// -----------------------------------------------------------------------------
// Configuration (can later move to MetaParameters)
// -----------------------------------------------------------------------------
const DEFAULT_UNCERTAINTY = 100;
const MIN_UNCERTAINTY = 10;
const PROCESS_NOISE = 5;   // Q
const MEASUREMENT_NOISE = 15; // R

// -----------------------------------------------------------------------------
// Update Kalman state with new observation
// -----------------------------------------------------------------------------
async function update(studentId, observation, meta = {}) {
  if (!studentId) {
    throw new Error('Kalman update requires studentId');
  }

  const z = Number(observation) || 0; // measurement

  // ---------------------------------------------------------------------------
  // 1. Load previous state (if any)
  // ---------------------------------------------------------------------------
  let prev = await KalmanState.findOne({ studentId });

  // If no previous state, initialize
  if (!prev) {
    const initial = await KalmanState.create({
      studentId,
      estimatedAbility: z,
      uncertainty: DEFAULT_UNCERTAINTY,
      lastObservation: z,
      meta,
      updatedAt: new Date()
    });

    return initial;
  }

  // ---------------------------------------------------------------------------
  // 2. Prediction step
  // ---------------------------------------------------------------------------
  const x_prior = prev.estimatedAbility;
  const p_prior = prev.uncertainty + PROCESS_NOISE;

  // ---------------------------------------------------------------------------
  // 3. Update step
  // ---------------------------------------------------------------------------
  const kalmanGain = p_prior / (p_prior + MEASUREMENT_NOISE);
  const x_post = x_prior + kalmanGain * (z - x_prior);
  const p_post = Math.max(
    MIN_UNCERTAINTY,
    (1 - kalmanGain) * p_prior
  );

  // ---------------------------------------------------------------------------
  // 4. Persist updated state
  // ---------------------------------------------------------------------------
  const updated = await KalmanState.findOneAndUpdate(
    { studentId },
    {
      studentId,
      estimatedAbility: Number(x_post.toFixed(2)),
      uncertainty: Number(p_post.toFixed(2)),
      lastObservation: z,
      meta,
      updatedAt: new Date()
    },
    { new: true }
  );

  return updated;
}

// -----------------------------------------------------------------------------
// Optional: Read-only helper (used by analytics/reporting)
// -----------------------------------------------------------------------------
async function getState(studentId) {
  if (!studentId) return null;
  return KalmanState.findOne({ studentId });
}

// -----------------------------------------------------------------------------
// Optional: Reset Kalman state (admin / testing only)
// -----------------------------------------------------------------------------
async function reset(studentId) {
  if (!studentId) return;
  await KalmanState.deleteOne({ studentId });
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------
module.exports = {
  update,
  getState,
  reset
};
