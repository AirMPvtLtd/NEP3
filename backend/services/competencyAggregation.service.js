/**
 * COMPETENCY AGGREGATION SERVICE
 * --------------------------------------------------
 * Source of truth: Ledger (challenge_evaluated only)
 * Purpose:
 * - Aggregate NEP competencies per student
 * - Update Student.competencyScores (derived cache)
 *
 * GUARANTEES:
 * - ❌ No ledger mutation
 * - ❌ No AI inference
 * - ✅ Deterministic
 * - ✅ Auditable
 */

const Ledger = require('../models/Ledger');
const Student = require('../models/Student');
const { NEP_COMPETENCIES } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * Recompute competencies for a single student
 */
async function recomputeStudentCompetencies(studentId) {
  logger.info('🔄 Recomputing competencies for student', { studentId });

  // --------------------------------------------------
  // 1. Fetch authoritative ledger events
  // --------------------------------------------------
  const ledgers = await Ledger.find({
    studentId,
    eventType: 'challenge_evaluated',
    status: 'confirmed'
  }).lean();

  if (!ledgers.length) {
    logger.warn('No ledger data found for student', { studentId });

    // Reset to zero safely
    const zeroed = {};
    NEP_COMPETENCIES.forEach(c => (zeroed[c] = 0));

    await Student.updateOne(
      { studentId },
      { competencyScores: zeroed }
    );

    return zeroed;
  }

  // --------------------------------------------------
  // 2. Accumulate scores
  // --------------------------------------------------
  const accumulator = {};
  NEP_COMPETENCIES.forEach(c => {
    accumulator[c] = { sum: 0, count: 0 };
  });

  for (const l of ledgers) {
    const assessed = l.challenge?.competenciesAssessed || [];
    for (const c of assessed) {
      if (!accumulator[c.competency]) continue;
      if (typeof c.score !== 'number') continue;

      accumulator[c.competency].sum += c.score;
      accumulator[c.competency].count += 1;
    }
  }

  // --------------------------------------------------
  // 3. Final normalized scores
  // --------------------------------------------------
  const competencyScores = {};
  for (const [name, v] of Object.entries(accumulator)) {
    competencyScores[name] =
      v.count > 0 ? Number((v.sum / v.count).toFixed(2)) : 0;
  }

  // --------------------------------------------------
  // 4. Persist (derived cache)
  // --------------------------------------------------
  await Student.updateOne(
    { studentId },
    {
      competencyScores,
      updatedAt: new Date()
    }
  );

  logger.info('✅ Competencies updated', {
    studentId,
    competencyScores
  });

  return competencyScores;
}

/**
 * Recompute competencies for ALL students of a school
 * (useful for migration / cron)
 */
async function recomputeSchoolCompetencies(schoolId) {
  const students = await Student.find({ schoolId }, { studentId: 1 }).lean();

  for (const s of students) {
    await recomputeStudentCompetencies(s.studentId);
  }

  return {
    schoolId,
    studentsProcessed: students.length
  };
}

module.exports = {
  recomputeStudentCompetencies,
  recomputeSchoolCompetencies
};
