/**
 * LEDGER WRITER SERVICE
 * -------------------------------------------------
 * The ONLY service allowed to write immutable events
 * into the Ledger collection.
 *
 * Responsibilities:
 * - Convert evaluated domain events → ledger events
 * - Enforce immutability + schema correctness
 * - Never compute scores (already computed upstream)
 *
 * Called AFTER:
 * - Challenge evaluation
 * - Competency updates
 * - Report generation
 */

const Ledger = require('../models/Ledger');
const logger = require('../utils/logger');

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map numeric score → NEP competency level
 */
function mapScoreToLevel(score) {
  if (score >= 85) return 'advanced';
  if (score >= 70) return 'proficient';
  if (score >= 50) return 'developing';
  return 'emerging';
}

/**
 * Normalize competency for Ledger schema
 */
function normalizeCompetency(comp) {
  const score = Number(comp.score);

  return {
    competency: comp.competency,
    score,
    level: mapScoreToLevel(score),
    assessedBy: 'system' // REQUIRED by Ledger schema
  };
}

// ============================================================================
// CHALLENGE EVALUATION → LEDGER
// ============================================================================

/**
 * Write CHALLENGE_EVALUATED event
 */
async function writeChallengeEvaluationEvent(params) {
  const {
    studentId,
    teacherId = 'SYSTEM',
    schoolId,
    challenge,
    ipAddress = 'system',
    userAgent = 'auto-evaluator'
  } = params;

  if (!challenge || challenge.status !== 'evaluated') {
    throw new Error('Challenge must be evaluated before ledger write');
  }

  if (
    !challenge.results ||
    !Array.isArray(challenge.results.competenciesAssessed)
  ) {
    throw new Error('Invalid challenge results for ledger write');
  }

  logger.info('📒 Writing CHALLENGE_EVALUATED event to ledger', {
    studentId,
    challengeId: challenge.challengeId
  });

  return Ledger.createChallengeEvaluation({
    studentId,
    teacherId,
    schoolId,

    challengeId: challenge.challengeId,
    simulationType: challenge.simulationType,
    difficulty: challenge.difficulty,
    totalScore: challenge.results.totalScore,
    passed: challenge.results.passed,
    timeTaken: challenge.results.timeSpent || null,

    competenciesAssessed: challenge.results.competenciesAssessed.map(
      normalizeCompetency
    ),

    createdBy: 'SYSTEM-AUTO-EVALUATOR',
    createdByRole: 'system',
    ipAddress,
    userAgent
  });
}

// ============================================================================
// DIRECT COMPETENCY ASSESSMENT → LEDGER
// ============================================================================

/**
 * Write COMPETENCY_ASSESSED event
 */
async function writeCompetencyAssessmentEvent(params) {
  const {
    studentId,
    teacherId,
    schoolId,
    competency,
    score,
    evidence = '',
    assessedBy,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  } = params;

  logger.info('📒 Writing COMPETENCY_ASSESSED event', {
    studentId,
    competency,
    score
  });

  return Ledger.createCompetencyAssessment({
    studentId,
    teacherId,
    schoolId,
    competency,
    score,
    level: mapScoreToLevel(score),
    evidence,
    assessedBy,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  });
}

// ============================================================================
// REPORT GENERATION → LEDGER
// ============================================================================

/**
 * Write REPORT_GENERATED / REPORT_VERIFIED / REPORT_SHARED event
 */
async function writeReportGeneratedEvent(params) {
  const {
    studentId,
    teacherId,
    schoolId,
    reportId,
    reportType,
    cpi,
    reportHash,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  } = params;

  logger.info('📒 Writing REPORT_GENERATED event', {
    studentId,
    reportId,
    cpi
  });

  return Ledger.createReportEvent({
    studentId,
    teacherId,
    schoolId,
    reportId,
    reportType,
    cpi,
    hash: reportHash,
    createdBy,
    createdByRole,
    ipAddress,
    userAgent
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  writeChallengeEvaluationEvent,
  writeCompetencyAssessmentEvent,
  writeReportGeneratedEvent
};
