/**
 * HMM Algorithm Service
 * ------------------------------------------------------------
 * PURPOSE:
 * - Track student learning phase over time
 * - Model discrete cognitive states (STRUGGLING → LEARNING → MASTERING → EXPERT)
 * - Persist authoritative learning state
 *
 * DESIGN:
 * - Service-based (NO class, NO constructor)
 * - Uses string studentId
 * - Deterministic, auditable transitions
 *
 * CONTRACT:
 * - getCurrentState(studentId) -> state
 * - transition(studentId, signals) -> newState
 */


const HMM_STATES = require('../../config/constants');
const HMMState = require('../../models/HMMState');
// -----------------------------------------------------------------------------
// Transition thresholds (can later move to MetaParameters)
// -----------------------------------------------------------------------------
const THRESHOLDS = {
  STRUGGLING_TO_LEARNING: 65,
  LEARNING_TO_MASTERING: 80,
  MASTERING_TO_EXPERT: 90,

  EXPERT_FALLBACK: 75,
  MASTERING_FALLBACK: 60,
  LEARNING_FALLBACK: 45
};

// -----------------------------------------------------------------------------
// Get current learning state (authoritative)
// -----------------------------------------------------------------------------
async function getCurrentState(studentId) {
  if (!studentId) {
    throw new Error('HMM getCurrentState requires studentId');
  }

  const state = await HMMState.findOne({ studentId });

  if (!state) {
    // Default initial state
    const initial = await HMMState.create({
      studentId,
      currentState: HMM_STATES.STRUGGLING,
      updatedAt: new Date()
    });
    return initial.currentState;
  }

  return state.currentState;
}

// -----------------------------------------------------------------------------
// Determine next state based on performance signals
// -----------------------------------------------------------------------------
function decideNextState(currentState, signals) {
  const { performance = 0, consistency = 0, improvement = false } = signals;

  switch (currentState) {
    case HMM_STATES.STRUGGLING:
      if (performance >= THRESHOLDS.STRUGGLING_TO_LEARNING) {
        return HMM_STATES.LEARNING;
      }
      return HMM_STATES.STRUGGLING;

    case HMM_STATES.LEARNING:
      if (performance >= THRESHOLDS.LEARNING_TO_MASTERING && improvement) {
        return HMM_STATES.MASTERING;
      }
      if (performance < THRESHOLDS.LEARNING_FALLBACK) {
        return HMM_STATES.STRUGGLING;
      }
      return HMM_STATES.LEARNING;

    case HMM_STATES.MASTERING:
      if (performance >= THRESHOLDS.MASTERING_TO_EXPERT && consistency >= 70) {
        return HMM_STATES.EXPERT;
      }
      if (performance < THRESHOLDS.MASTERING_FALLBACK) {
        return HMM_STATES.LEARNING;
      }
      return HMM_STATES.MASTERING;

    case HMM_STATES.EXPERT:
      if (performance < THRESHOLDS.EXPERT_FALLBACK) {
        return HMM_STATES.MASTERING;
      }
      return HMM_STATES.EXPERT;

    default:
      return HMM_STATES.STRUGGLING;
  }
}

// -----------------------------------------------------------------------------
// Transition state if needed
// -----------------------------------------------------------------------------
async function transition(studentId, signals = {}) {
  if (!studentId) {
    throw new Error('HMM transition requires studentId');
  }

  const current = await getCurrentState(studentId);
  const next = decideNextState(current, signals);

  // No transition → just return current
  if (current === next) {
    return current;
  }

  // Persist transition
  const updated = await HMMState.findOneAndUpdate(
    { studentId },
    {
      studentId,
      currentState: next,
      lastState: current,
      transitionSignals: signals,
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  return updated.currentState;
}

// -----------------------------------------------------------------------------
// Optional: Reset HMM state (admin / testing only)
// -----------------------------------------------------------------------------
async function reset(studentId) {
  if (!studentId) return;
  await HMMState.deleteOne({ studentId });
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------
module.exports = {
  getCurrentState,
  transition,
  reset
};
