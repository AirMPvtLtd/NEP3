/**
 * CHALLENGE ROUTES
 * Full lifecycle: generation → attempt → evaluation → analytics
 *
 * Base path: /api/challenges
 */

const express = require('express');
const router = express.Router();

const challengeController = require('../controllers/challenge.controller');

// Middleware
const { authenticate, authorize } = require('../middleware/auth.middleware');

const { validateRequest } = require('../middleware/validation.middleware');

// ============================================================================
// CHALLENGE GENERATION (STUDENT)
// ============================================================================

router.post(
  '/generate',
  authenticate,
  authorize('student'),
  validateRequest('generateChallenge'),
  challengeController.generateChallenge
);



// router.get(
//   '/preview',
//   authenticate,
//   authorize('student'),
//   challengeController.previewChallenge
// );

// ============================================================================
// CHALLENGE LIFECYCLE
// ============================================================================

// router.get(
//   '/statistics',
//   authenticate,
//   authorize('student'),
//   challengeController.getChallengeStatistics
// );

router.get(
  '/recent',
  authenticate,
  authorize('student'),
  challengeController.getRecentChallenges
);

router.get(
  '/recommended',
  authenticate,
  authorize('student'),
  challengeController.getRecommendedChallenges
);

router.get(
  '/:challengeId',
  authenticate,
  challengeController.getChallengeDetails
);

router.post(
  '/:challengeId/start',
  authenticate,
  authorize('student'),
  challengeController.startChallenge
);

router.post(
  '/:challengeId/submit',
  authenticate,
  authorize('student'),
  validateRequest('submitChallenge'),
  challengeController.submitChallenge
);

// router.get(
//   '/:challengeId/results',
//   authenticate,
//   challengeController.getChallengeResults
// );

// ============================================================================
// EVALUATION (TEACHER / ADMIN)
// ============================================================================

// router.post(
//   '/:challengeId/evaluate',
//   authenticate,
//   authorize('teacher', 'admin'),
//   challengeController.evaluateChallenge
// );

//If you need consistent scores, lower temperature to 0.1 or add more strict scoring rubrics in the prompt. 
// router.post(
//   '/:challengeId/re-evaluate',
//   authenticate,
//   authorize('admin'),
//   challengeController.reEvaluateChallenge
// );

// router.put(
//   '/:challengeId/override',
//   authenticate,
//   authorize('teacher'),
//   validateRequest('overrideScore'),
//   challengeController.overrideChallengeScore
// );

// =================================== (checked)=========================================
// STUDENT HISTORY & STATISTICS
// ============================================================================

router.get(
  '/student/:studentId',
  authenticate,
  challengeController.getStudentChallenges
);


// router.get(
//   '/by-simulation/:simulationType',
//   authenticate,
//   authorize('student'),
//   challengeController.getChallengesBySimulation
// );

// ============================================================================
// LIMITS & AVAILABILITY (STUDENT)
// ============================================================================

router.get(
  '/limits',
  authenticate,
  authorize('student'),
  challengeController.getChallengeLimits
);

router.get(
  '/limits/check',
  authenticate,
  authorize('student'),
  challengeController.checkChallengeLimit
);

// router.get(
//   '/available-simulations',
//   authenticate,
//   authorize('student'),
//   challengeController.getAvailableSimulations
// );

// ============================================================================
// RECOMMENDATIONS
// ============================================================================



// ============================================================================
// BULK & CLASS OPERATIONS
// ============================================================================

router.get(
  '/class/:classId',
  authenticate,
  authorize('teacher'),
  challengeController.getClassChallenges
);

router.get(
  '/school/:schoolId',
  authenticate,
  authorize('admin'),
  challengeController.getSchoolChallenges
);

// router.post(
//   '/bulk-evaluate',
//   authenticate,
//   authorize('admin'),
//   validateRequest('bulkEvaluate'),
//   challengeController.bulkEvaluateChallenges
// );

// ============================================================================
// ANALYTICS
// ============================================================================

router.get(
  '/analytics/overview',
  authenticate,
  authorize('admin'),
  challengeController.getAnalyticsOverview
);

// router.get(
//   '/analytics/by-simulation',
//   authenticate,
//   authorize('teacher', 'admin'),
//   challengeController.getAnalyticsBySimulation
// );

router.get(
  '/analytics/by-difficulty',
  authenticate,
  authorize('teacher', 'admin'),
  challengeController.getAnalyticsByDifficulty
);

// ============================================================================
// ADMIN CONTROLS
// ============================================================================

router.post(
  '/adjust-difficulty',
  authenticate,
  authorize('admin'),
  challengeController.adjustDifficulty
);

module.exports = router;
