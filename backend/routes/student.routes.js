// routes/student.routes.js
/**
 * STUDENT ROUTES
 * Student-specific routes
 * 
 * @module routes/student
 */

const express = require('express');
const router = express.Router();

const studentController = require('../controllers/student.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');
const { challengeRateLimit } = require('../middleware/rateLimiter');

// All student routes require authentication and student role
router.use(authenticate);
router.use(authorize('student'));

// ============================================================================
// STUDENT PROFILE
// ============================================================================

/**
 * @route   GET /api/student/profile
 * @desc    Get student profile
 * @access  Private (Student)
 */
router.get('/profile', studentController.getProfile);

/**
 * @route   PUT /api/student/profile
 * @desc    Update student profile
 * @access  Private (Student)
 */
router.put(
  '/profile',
  validateRequest('updateStudentProfile'),
  studentController.updateProfile
);

/**
 * @route   GET /api/student/dashboard
 * @desc    Get student dashboard
 * @access  Private (Student)
 */
router.get('/dashboard', studentController.getDashboard);

// ============================================================================
// SIMULATIONS
// ============================================================================

/**
 * @route   GET /api/student/simulations
 * @desc    Get available simulations
 * @access  Private (Student)
 */
router.get('/simulations', studentController.getAvailableSimulations);

/**
 * @route   GET /api/student/simulations/recommended
 * @desc    Get recommended simulations
 * @access  Private (Student)
 */
router.get('/simulations/recommended', studentController.getRecommendedSimulations);

/**
 * @route   GET /api/student/simulations/:simulationType
 * @desc    Get simulation details
 * @access  Private (Student)
 */
router.get('/simulations/:simulationType', studentController.getSimulationDetails);

// ============================================================================
// CHALLENGE GENERATION & SUBMISSION
// ============================================================================

/**
 * @route   POST /api/student/challenges/generate
 * @desc    Generate AI challenge
 * @access  Private (Student)
 */
router.post(
  '/challenges/generate',
  challengeRateLimit,
  validateRequest('generateChallenge'),
  studentController.generateChallenge
);

/**
 * @route   GET /api/student/challenges/limits
 * @desc    Get challenge generation limits
 * @access  Private (Student)
 */
router.get('/challenges/limits', studentController.getChallengeLimits);

/**
 * @route   GET /api/student/challenges/:challengeId
 * @desc    Get challenge details
 * @access  Private (Student)
 */
router.get('/challenges/:challengeId', studentController.getChallengeDetails);

/**
 * @route   POST /api/student/challenges/:challengeId/start
 * @desc    Start challenge (marks as in-progress)
 * @access  Private (Student)
 */
router.post('/challenges/:challengeId/start', studentController.startChallenge);

/**
 * @route   GET /api/student/challenges/:challengeId/attempt
 * @desc    Get challenge for attempting (without correct answers)
 * @access  Private (Student)
 */
router.get('/challenges/:challengeId/attempt', studentController.getChallengeForAttempt);

/**
 * @route   POST /api/student/challenges/:challengeId/save-draft
 * @desc    Save draft answers
 * @access  Private (Student)
 */
router.post(
  '/challenges/:challengeId/save-draft',
  validateRequest('saveDraftAnswers'),
  studentController.saveDraft
);

/**
 * @route   POST /api/student/challenges/:challengeId/submit
 * @desc    Submit challenge answers for evaluation
 * @access  Private (Student)
 */
router.post(
  '/challenges/:challengeId/submit',
  validateRequest('submitChallenge'),
  studentController.submitChallenge
);

/**
 * @route   GET /api/student/challenges/:challengeId/results
 * @desc    Get challenge results
 * @access  Private (Student)
 */
router.get('/challenges/:challengeId/results', studentController.getChallengeResults);

/**
 * @route   GET /api/student/challenges
 * @desc    Get all student challenges
 * @access  Private (Student)
 */
router.get('/challenges', studentController.getAllChallenges);

/**
 * @route   GET /api/student/challenges/recent
 * @desc    Get recent challenges
 * @access  Private (Student)
 */
router.get('/challenges/recent', studentController.getRecentChallenges);

// ============================================================================
// PERFORMANCE & ANALYTICS
// ============================================================================

/**
 * @route   GET /api/student/performance
 * @desc    Get student performance metrics
 * @access  Private (Student)
 */
router.get('/performance', studentController.getPerformance);

/**
 * @route   GET /api/student/performance/index
 * @desc    Get Student Performance Index (SPI)
 * @access  Private (Student)
 */
router.get('/performance/index', studentController.getPerformanceIndex);

/**
 * @route   GET /api/student/performance/competencies
 * @desc    Get NEP competency scores
 * @access  Private (Student)
 */
router.get('/performance/competencies', studentController.getCompetencies);

/**
 * @route   GET /api/student/performance/progress
 * @desc    Get progress over time
 * @access  Private (Student)
 */
router.get('/performance/progress', studentController.getProgress);

/**
 * @route   GET /api/student/performance/streak
 * @desc    Get daily streak info
 * @access  Private (Student)
 */
router.get('/performance/streak', studentController.getStreak);

// ============================================================================
// REPORTS
// ============================================================================

/**
 * @route   GET /api/student/reports/nep
 * @desc    Get NEP competency reports
 * @access  Private (Student)
 */
router.get('/reports/nep', studentController.getNEPReports);

/**
 * @route   GET /api/student/reports/nep/:reportId
 * @desc    Get specific NEP report
 * @access  Private (Student)
 */
router.get('/reports/nep/:reportId', studentController.getNEPReportDetails);

/**
 * @route   POST /api/student/reports/generate
 * @desc    Generate new report
 * @access  Private (Student)
 */
router.post(
  '/reports/generate',
  validateRequest('generateStudentReport'),
  studentController.generateReport
);

// ============================================================================
// HELP & SUPPORT
// ============================================================================

/**
 * @route   POST /api/student/help-tickets
 * @desc    Create help ticket
 * @access  Private (Student)
 */
router.post(
  '/help-tickets',
  validateRequest('createHelpTicket'),
  studentController.createHelpTicket
);

/**
 * @route   GET /api/student/help-tickets
 * @desc    Get student's help tickets
 * @access  Private (Student)
 */
router.get('/help-tickets', studentController.getHelpTickets);

/**
 * @route   GET /api/student/help-tickets/:ticketId
 * @desc    Get help ticket details
 * @access  Private (Student)
 */
router.get('/help-tickets/:ticketId', studentController.getHelpTicketDetails);

/**
 * @route   PUT /api/student/help-tickets/:ticketId/close
 * @desc    Close help ticket
 * @access  Private (Student)
 */
router.put('/help-tickets/:ticketId/close', studentController.closeHelpTicket);

// ============================================================================
// LEADERBOARD
// ============================================================================

/**
 * @route   GET /api/student/leaderboard/class
 * @desc    Get class leaderboard
 * @access  Private (Student)
 */
router.get('/leaderboard/class', studentController.getClassLeaderboard);

/**
 * @route   GET /api/student/leaderboard/school
 * @desc    Get school leaderboard
 * @access  Private (Student)
 */
router.get('/leaderboard/school', studentController.getSchoolLeaderboard);

module.exports = router;