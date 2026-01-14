// routes/parent.routes.js
/**
 * PARENT ROUTES
 * Parent/guardian routes for monitoring child
 * 
 * @module routes/parent
 */

const express = require('express');
const router = express.Router();

const parentController = require('../controllers/parent.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// All parent routes require authentication and parent role
router.use(authenticate);
router.use(authorize('parent'));

// ============================================================================
// PARENT PROFILE
// ============================================================================

/**
 * @route   GET /api/parent/profile
 * @desc    Get parent profile
 * @access  Private (Parent)
 */
router.get('/profile', parentController.getProfile);

/**
 * @route   PUT /api/parent/profile
 * @desc    Update parent profile
 * @access  Private (Parent)
 */
router.put(
  '/profile',
  validateRequest('updateParentProfile'),
  parentController.updateProfile
);

/**
 * @route   GET /api/parent/dashboard
 * @desc    Get parent dashboard
 * @access  Private (Parent)
 */
router.get('/dashboard', parentController.getDashboard);

// ============================================================================
// CHILD INFORMATION
// ============================================================================

/**
 * @route   GET /api/parent/child
 * @desc    Get child details
 * @access  Private (Parent)
 */
router.get('/child', parentController.getChildDetails);

/**
 * @route   GET /api/parent/child/performance
 * @desc    Get child performance overview
 * @access  Private (Parent)
 */
router.get('/child/performance', parentController.getChildPerformance);

/**
 * @route   GET /api/parent/child/competencies
 * @desc    Get child NEP competencies
 * @access  Private (Parent)
 */
router.get('/child/competencies', parentController.getChildCompetencies);

/**
 * @route   GET /api/parent/child/progress
 * @desc    Get child progress over time
 * @access  Private (Parent)
 */
router.get('/child/progress', parentController.getChildProgress);

// ============================================================================
// CHALLENGES & ACTIVITIES
// ============================================================================

/**
 * @route   GET /api/parent/child/challenges
 * @desc    Get child's challenges
 * @access  Private (Parent)
 */
router.get('/child/challenges', parentController.getChildChallenges);

/**
 * @route   GET /api/parent/child/challenges/:challengeId
 * @desc    Get specific challenge details
 * @access  Private (Parent)
 */
router.get('/child/challenges/:challengeId', parentController.getChallengeDetails);

/**
 * @route   GET /api/parent/child/challenges/recent
 * @desc    Get recent challenges
 * @access  Private (Parent)
 */
router.get('/child/challenges/recent', parentController.getRecentChallenges);

/**
 * @route   GET /api/parent/child/activity
 * @desc    Get child's activity log
 * @access  Private (Parent)
 */
router.get('/child/activity', parentController.getChildActivity);

// ============================================================================
// REPORTS
// ============================================================================

/**
 * @route   GET /api/parent/reports/nep
 * @desc    Get child's NEP reports
 * @access  Private (Parent)
 */
router.get('/reports/nep', parentController.getNEPReports);

/**
 * @route   GET /api/parent/reports/nep/:reportId
 * @desc    Get specific NEP report
 * @access  Private (Parent)
 */
router.get('/reports/nep/:reportId', parentController.getNEPReportDetails);

/**
 * @route   GET /api/parent/reports/weekly
 * @desc    Get weekly performance report
 * @access  Private (Parent)
 */
router.get('/reports/weekly', parentController.getWeeklyReport);

/**
 * @route   GET /api/parent/reports/monthly
 * @desc    Get monthly performance report
 * @access  Private (Parent)
 */
router.get('/reports/monthly', parentController.getMonthlyReport);

// ============================================================================
// SETTINGS & PREFERENCES
// ============================================================================

/**
 * @route   PUT /api/parent/preferences
 * @desc    Update notification preferences
 * @access  Private (Parent)
 */
router.put(
  '/preferences',
  validateRequest('updatePreferences'),
  parentController.updatePreferences
);

/**
 * @route   GET /api/parent/preferences
 * @desc    Get notification preferences
 * @access  Private (Parent)
 */
router.get('/preferences', parentController.getPreferences);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * @route   GET /api/parent/notifications
 * @desc    Get notifications
 * @access  Private (Parent)
 */
router.get('/notifications', parentController.getNotifications);

/**
 * @route   PUT /api/parent/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private (Parent)
 */
router.put('/notifications/:notificationId/read', parentController.markNotificationRead);

// ============================================================================
// COMMUNICATION
// ============================================================================

/**
 * @route   GET /api/parent/teacher
 * @desc    Get child's teacher information
 * @access  Private (Parent)
 */
router.get('/teacher', parentController.getTeacherInfo);

/**
 * @route   POST /api/parent/messages
 * @desc    Send message to teacher
 * @access  Private (Parent)
 */
router.post(
  '/messages',
  validateRequest('sendMessage'),
  parentController.sendMessageToTeacher
);

/**
 * @route   GET /api/parent/messages
 * @desc    Get messages
 * @access  Private (Parent)
 */
router.get('/messages', parentController.getMessages);

module.exports = router;