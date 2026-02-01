/**
 * CPI ENGINE (READ-ONLY)
 * ----------------------
 * - No DB writes
 * - No ledger mutation
 * - Deterministic
 * - Recomputable anytime
 */

const { normalizeScore } = require('./normalization.util');

exports.computeCPI = async ({ ledgerEvents }) => {
  if (!ledgerEvents || ledgerEvents.length < 3) {
    return {
      cpi: null,
      reason: 'INSUFFICIENT_DATA'
    };
  }

  let weightedSum = 0;
  let weightTotal = 0;

  for (const event of ledgerEvents) {
    const assessed = event.challenge?.competenciesAssessed || [];

    for (const c of assessed) {
      const normalized = normalizeScore(c.score); // 0–1
      const weight = c.weight || 1;

      weightedSum += normalized * weight;
      weightTotal += weight;
    }
  }

  if (!weightTotal) {
    return {
      cpi: null,
      reason: 'NO_VALID_COMPETENCY_SIGNAL'
    };
  }

  return {
    cpi: Number((weightedSum / weightTotal).toFixed(3)),
    computedFromEvents: ledgerEvents.length,
    model: 'FIELD-CPI-v1'
  };
};
