// /**
//  * CHALLENGE EVALUATION SERVICE
//  * ----------------------------------
//  * Pure evaluation engine.
//  * - NO HTTP
//  * - NO Ledger writes
//  * - NO side effects beyond Challenge + Student
//  *
//  * Responsibility:
//  * - Evaluate submitted challenge automatically
//  * - Compute scores + competencies
//  * - Update Challenge + Student models
//  *
//  * Ledger anchoring happens OUTSIDE this service.
//  */

// const logger = require('../utils/logger');
// const mistralService = require('./mistral.service');
// const { Student } = require('../models');
// const { NEP_COMPETENCIES } = require('../config/constants');

// /**
//  * Auto-evaluate a submitted challenge
//  * @param {Object} challenge - Challenge mongoose document
//  * @returns {Object|null} evaluation summary
//  */
// async function evaluateChallenge(challenge) {
//   if (!challenge) {
//     throw new Error('Challenge is required for evaluation');
//   }

//   if (challenge.status !== 'submitted') {
//     logger.warn('Evaluation skipped: challenge not in submitted state', {
//       challengeId: challenge.challengeId,
//       status: challenge.status
//     });
//     return null;
//   }

//   logger.info(`🧠 Auto-evaluating challenge ${challenge.challengeId}`);

//   const evaluatedAnswers = [];
//   let totalScore = 0;
//   let correctAnswers = 0;

//   // ==================================================
//   // Per-question evaluation (AI)
//   // ==================================================
//   for (const question of challenge.questions) {
//     const answer = challenge.answers.find(
//       a => a.questionId === question.questionId
//     );

//     if (!answer) {
//       evaluatedAnswers.push({
//         questionId: question.questionId,
//         finalScore: 0,
//         aiEvaluation: {
//           feedback: 'No answer submitted',
//           correct: false
//         },
//         evaluatedAt: new Date()
//       });
//       continue;
//     }

//     const studentAnswer =
//       answer.studentAnswer ?? answer.answer ?? '';

//     const aiEvaluation = await mistralService.evaluateResponse({
//       question: question.question,
//       questionType: question.type,
//       correctAnswer: question.correctAnswer,
//       studentAnswer,
//       expectedExplanation: question.explanation
//     });

//     const finalScore = Math.max(
//       0,
//       Math.min(question.points || 100, aiEvaluation.score || 0)
//     );

//     if (aiEvaluation.correct === true) {
//       correctAnswers++;
//     }

//     totalScore += finalScore;

//     evaluatedAnswers.push({
//       questionId: question.questionId,
//       studentAnswer,
//       aiEvaluation,
//       finalScore,
//       evaluatedAt: new Date()
//     });
//   }

//   // ==================================================
//   // Aggregate results
//   // ==================================================
//   const averageScore = Number(
//     (totalScore / challenge.questions.length).toFixed(2)
//   );

//   const passed = averageScore >= challenge.passingScore;

//   // ==================================================
//   // Competency mapping (NEP)
//   // ==================================================
//   const competencyBuckets = {};

//   challenge.questions.forEach((q, index) => {
//     if (!Array.isArray(q.competencies)) return;

//     q.competencies.forEach(comp => {
//       if (!NEP_COMPETENCIES.includes(comp)) return;
//       if (!competencyBuckets[comp]) competencyBuckets[comp] = [];
//       competencyBuckets[comp].push(
//         evaluatedAnswers[index]?.finalScore || 0
//       );
//     });
//   });

//   const competenciesAssessed = Object.entries(competencyBuckets).map(
//     ([competency, scores]) => ({
//       competency,
//       score: Number(
//         (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
//       )
//     })
//   );

//   // ==================================================
//   // Persist Challenge
//   // ==================================================
//   challenge.answers = evaluatedAnswers;
//   challenge.results = {
//     totalScore: averageScore,
//     percentage: averageScore,
//     passed,
//     correctAnswers,
//     totalQuestions: challenge.questions.length,
//     competenciesAssessed
//   };

//   challenge.status = 'evaluated';
//   challenge.evaluatedAt = new Date();

//   await challenge.save();
//   await student.save();

//   await writeChallengeEvaluationEvent({
//     studentId: challenge.studentId,
//     teacherId: challenge.teacherId,
//     schoolId: challenge.schoolId,
//     challenge,
//     ipAddress: 'system',
//     userAgent: 'auto-evaluator'
//   });


//   // ==================================================
//   // Update Student stats
//   // ==================================================
//   const student = await Student.findOne({
//     studentId: challenge.studentId
//   });

//   if (student) {
//     await student.addChallengeResult(
//       challenge.challengeId,
//       averageScore,
//       challenge.simulationType
//     );

//     for (const comp of competenciesAssessed) {
//       await student.updateCompetency(comp.competency, comp.score);
//     }

//     await student.save();
//   }

//   logger.info(`✅ Challenge ${challenge.challengeId} evaluated`, {
//     score: averageScore,
//     passed
//   });

//   // ==================================================
//   // Return summary (for caller / ledger writer)
//   // ==================================================
//   return {
//     challengeId: challenge.challengeId,
//     score: averageScore,
//     passed,
//     competenciesAssessed,
//     evaluatedAt: challenge.evaluatedAt
//   };
// }

// module.exports = {
//   evaluateChallenge
// };

/**
 * CHALLENGE EVALUATION SERVICE
 * ----------------------------------
 * Pure evaluation engine.
 * - NO HTTP
 * - NO Ledger writes
 * - NO side effects beyond Challenge + Student
 */

const logger = require('../utils/logger');
const mistralService = require('./mistral.service');
const { Student } = require('../models');
const { NEP_COMPETENCIES } = require('../config/constants');
const { calculateStudentSPI } = require('../controllers/spi.controller');


/**
 * Auto-evaluate a submitted challenge
 * @param {Object} challenge - Challenge mongoose document
 * @returns {Object|null} evaluation summary
 */
async function evaluateChallenge(challenge) {
  if (!challenge) {
    throw new Error('Challenge is required for evaluation');
  }

  if (challenge.status !== 'submitted') {
    logger.warn('Evaluation skipped: challenge not in submitted state', {
      challengeId: challenge.challengeId,
      status: challenge.status
    });
    return null;
  }

  logger.info(`🧠 Auto-evaluating challenge ${challenge.challengeId}`);

  const evaluatedAnswers = [];
  let totalScore = 0;
  let correctAnswers = 0;

  // ==================================================
  // Per-question evaluation (AI)
  // ==================================================
  for (const question of challenge.questions) {
    const answer = challenge.answers.find(
      a => a.questionId === question.questionId
    );

    if (!answer) {
      evaluatedAnswers.push({
        questionId: question.questionId,
        finalScore: 0,
        aiEvaluation: {
          feedback: 'No answer submitted',
          correct: false
        },
        evaluatedAt: new Date()
      });
      continue;
    }

    const studentAnswer =
      answer.studentAnswer ?? answer.answer ?? '';

    const aiEvaluation = await mistralService.evaluateResponse({
      question: question.question,
      questionType: question.type,
      correctAnswer: question.correctAnswer,
      studentAnswer,
      expectedExplanation: question.explanation
    });

    const finalScore = Math.max(
      0,
      Math.min(question.points || 100, aiEvaluation.score || 0)
    );

    if (aiEvaluation.correct === true) {
      correctAnswers++;
    }

    totalScore += finalScore;

    evaluatedAnswers.push({
      questionId: question.questionId,
      studentAnswer,
      aiEvaluation,
      finalScore,
      evaluatedAt: new Date()
    });
  }

  // ==================================================
  // Aggregate results
  // ==================================================
  const averageScore = Number(
    (totalScore / challenge.questions.length).toFixed(2)
  );

  const passed = averageScore >= challenge.passingScore;

  // ==================================================
  // Competency mapping (NEP)
  // ==================================================
  const competencyBuckets = {};

  challenge.questions.forEach((q, index) => {
    if (!Array.isArray(q.competencies)) return;

    q.competencies.forEach(comp => {
      if (!NEP_COMPETENCIES.includes(comp)) return;
      if (!competencyBuckets[comp]) competencyBuckets[comp] = [];
      competencyBuckets[comp].push(
        evaluatedAnswers[index]?.finalScore || 0
      );
    });
  });

  const competenciesAssessed = Object.entries(competencyBuckets).map(
    ([competency, scores]) => ({
      competency,
      score: Number(
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
      )
    })
  );

  // ==================================================
  // Persist Challenge
  // ==================================================
  challenge.answers = evaluatedAnswers;
  challenge.results = {
    totalScore: averageScore,
    percentage: averageScore,
    passed,
    correctAnswers,
    totalQuestions: challenge.questions.length,
    competenciesAssessed
  };

  challenge.status = 'evaluated';
  challenge.evaluatedAt = new Date();

  await challenge.save();

  // ==================================================
  // Update Student stats
  // ==================================================
  const student = await Student.findOne({
    studentId: challenge.studentId
  });

  if (student) {
    await student.addChallengeResult(
      challenge.challengeId,
      averageScore,
      challenge.simulationType
    );

    for (const comp of competenciesAssessed) {
      await student.updateCompetency(comp.competency, comp.score);
    }

    await student.save();
  }

  logger.info(`✅ Challenge ${challenge.challengeId} evaluated`, {
    score: averageScore,
    passed
  });

  // ==================================================
  // Return summary (for controller / ledger writer)
  // ==================================================
  return {
    challengeId: challenge.challengeId,
    score: averageScore,
    passed,
    competenciesAssessed,
    evaluatedAt: challenge.evaluatedAt
  };
}

module.exports = {
  evaluateChallenge
};

