// // routes/analytics.routes.js
// /**
//  * ANALYTICS ROUTES
//  * Analytics, reports, and statistics
//  * 
//  * @module routes/analytics
//  */

// const express = require('express');
// const router = express.Router();

// // Correct import - make sure the path is correct
// const analyticsController = require('../controllers/analytics.controller');
// const { authenticate, authorize } = require('../middleware/auth.middleware');
// const { validateRequest } = require('../middleware/validation.middleware');

// // All routes require authentication
// router.use(authenticate);

// // ============================================================================
// // STUDENT ANALYTICS
// // ============================================================================

// /**
//  * @route   GET /api/analytics/student/:studentId/overview
//  * @desc    Get student analytics overview
//  * @access  Private (Student/Teacher/Parent)
//  */
// router.get('/student/:studentId/overview', analyticsController.getStudentAnalytics);

// /**
//  * @route   GET /api/analytics/student/:studentId/trend
//  * @desc    Get student performance trend
//  * @access  Private
//  */
// router.get('/student/:studentId/trend', analyticsController.getStudentPerformanceTrend);

// /**
//  * @route   GET /api/analytics/student/:studentId/competencies
//  * @desc    Get student competency analysis
//  * @access  Private
//  */
 //router.get('/student/:studentId/competencies', analyticsController.getStudentCompetencyAnalysis);

// /**
//  * @route   GET /api/analytics/student/:studentId/compare
//  * @desc    Compare student with class
//  * @access  Private
//  */
// router.get('/student/:studentId/compare', analyticsController.compareStudentWithClass);

// // ============================================================================
// // CLASS ANALYTICS
// // ============================================================================

// /**
//  * @route   GET /api/analytics/class/:classNum/:section
//  * @desc    Get class analytics
//  * @access  Private (Teacher/Admin)
//  */
// router.get(
//   '/class/:classNum/:section',
//   authorize('teacher', 'admin'),
//   analyticsController.getClassAnalytics
// );

// /**
//  * @route   GET /api/analytics/class/:classNum/:section/trend
//  * @desc    Get class performance trend
//  * @access  Private (Teacher/Admin)
//  */
// router.get(
//   '/class/:classNum/:section/trend',
//   authorize('teacher', 'admin'),
//   analyticsController.getClassPerformanceTrend
// );

// /**
//  * @route   GET /api/analytics/class/compare
//  * @desc    Compare classes
//  * @access  Private (Admin)
//  */
// router.get(
//   '/class/compare',
//   authorize('admin'),
//   analyticsController.compareClasses
// );

// // ============================================================================
// // SCHOOL ANALYTICS
// // ============================================================================

// /**
//  * @route   GET /api/analytics/school/:schoolId/overview
//  * @desc    Get school analytics overview
//  * @access  Private (Admin)
//  */
// router.get(
//   '/school/:schoolId/overview',
//   authorize('admin'),
//   analyticsController.getSchoolAnalytics
// );

// *
//  * @route   GET /api/analytics/school/:schoolId/trend
//  * @desc    Get school performance trend
//  * @access  Private (Admin)
 
// router.get(
//   '/school/:schoolId/trend',
//   authorize('admin'),
//   analyticsController.getSchoolPerformanceTrend
// );

// /**
//  * @route   GET /api/analytics/school/:schoolId/competencies
//  * @desc    Get school competency analysis
//  * @access  Private (Admin)
//  */
// router.get(
//   '/school/:schoolId/competencies',
//   authorize('admin'),
//   analyticsController.getSchoolCompetencyAnalysis
// );

// /**
//  * @route   GET /api/analytics/school/:schoolId/engagement
//  * @desc    Get engagement metrics
//  * @access  Private (Admin)
//  */
// router.get(
//   '/school/:schoolId/engagement',
//   authorize('admin'),
//   analyticsController.getEngagementMetrics
// );

// // ============================================================================
// // SIMULATION ANALYTICS
// // ============================================================================

// /**
//  * @route   GET /api/analytics/simulations
//  * @desc    Get simulation analytics
//  * @access  Private
//  */
// router.get('/simulations', analyticsController.getSimulationAnalytics);

// /**
//  * @route   GET /api/analytics/simulations/difficulty
//  * @desc    Get simulation performance by difficulty
//  * @access  Private
//  */
// router.get('/simulations/difficulty', analyticsController.getSimulationPerformanceByDifficulty);

// // ============================================================================
// // AI USAGE ANALYTICS
// // ============================================================================

// /**
//  * @route   GET /api/analytics/ai-usage
//  * @desc    Get AI usage statistics
//  * @access  Private (Admin)
//  */
// router.get(
//   '/ai-usage',
//   authorize('admin'),
//   analyticsController.getAIUsageStatistics
// );

// /**
//  * @route   GET /api/analytics/ai-usage/projection
//  * @desc    Get AI cost projection
//  * @access  Private (Admin)
//  */
// router.get(
//   '/ai-usage/projection',
//   authorize('admin'),
//   analyticsController.getAICostProjection
// );

// // ============================================================================
// // REPORTS
// // ============================================================================

// /**
//  * @route   POST /api/analytics/custom-report
//  * @desc    Get custom report
//  * @access  Private (Admin)
//  */
// router.post(
//   '/custom-report',
//   authorize('admin'),
//   validateRequest('getCustomReport'),
//   analyticsController.getCustomReport
// );

// /**
//  * @route   GET /api/analytics/export
//  * @desc    Export analytics to CSV
//  * @access  Private (Admin)
//  */
// router.get(
//   '/export',
//   authorize('admin'),
//   analyticsController.exportAnalytics
// );

// router.get('/attention/:studentId', 
//   authorize(['teacher', 'admin']), 
//   analyticsController.getAttentionStatistics
// );

// router.post('/attention/:studentId/analyze', 
//   authorize(['teacher', 'admin']), 
//   analyticsController.analyzeAttention
// );

// // routes/analytics.routes.js
// router.get('/pid/:studentId', 
//   authorize(['teacher', 'admin', 'student']), 
//   analyticsController.getPIDStatistics
// );

// router.post('/pid/:studentId/auto-tune', 
//   authorize(['admin']), 
//   analyticsController.autoTunePID
// );

// router.post('/pid/:studentId/reset', 
//   authorize(['admin']), 
//   analyticsController.resetPID
// );

// module.exports = router;



const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

// ================= STUDENT =================

router.get(
  '/student/:studentId/overview',
  authenticate,
  analyticsController.getStudentAnalytics
);
//router.get('/student/:studentId/competencies', analyticsController.getStudentCompetencyAnalysis);
router.get(
  '/student/:studentId/trends',
  authenticate,
  analyticsController.getStudentTrends
);

router.get(
  '/student/:studentId/cpi',
  authenticate,
  analyticsController.getStudentCPI
);

// ================= CLASS =================

router.get(
  '/class/:classNum/:section',
  authenticate,
  analyticsController.getClassAnalytics
);

// ================= SCHOOL =================

router.get(
  '/school/:schoolId/overview',
  authenticate,
  analyticsController.getSchoolAnalytics
);

// ================= AI =================

router.get(
  '/ai-usage',
  authenticate,
  analyticsController.getAIUsageStatistics
);

module.exports = router;
