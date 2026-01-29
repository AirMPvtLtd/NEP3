const express = require('express');
const router = express.Router();

// Middleware - CORRECTED IMPORTS
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Controller
const reportController = require('../controllers/report.controller');

// Validation - CORRECTED IMPORTS
const {
  validateReportGeneration,
  validatePagination,
  validateReportVerification,
  validateReportSharing
} = require('../middleware/validation.middleware');

// ============================================================================
// NEP REPORTS (LEDGER-ANCHORED)
// ============================================================================
console.log('REPORT CONTROLLER KEYS:', Object.keys(reportController));

/**
 * @route   POST /api/reports/nep/generate
 * @desc    Generate NEP report for student with ledger anchoring
 * @access  Private (Student, Teacher, Parent, Admin)
 */
router.post(
  '/nep/generate',
  authenticate,
  validateReportGeneration,
  reportController.generateNEPReport
);

/**
 * @route   GET /api/reports/nep/verify/:reportId
 * @desc    Verify NEP report integrity (public verification)
 * @access  Public (no auth required for verification)
 */
router.get(
  '/nep/verify/:reportId',
  validateReportVerification,
  reportController.verifyNEPReport
);

/**
 * @route   GET /api/reports/nep/:reportId
 * @desc    Get NEP report by ID
 * @access  Private
 */
router.get(
  '/nep/:reportId',
  authenticate,
  reportController.getNEPReport
);

router.post(
  '/nep/:reportId/narration',
  authenticate,
  reportController.generateNEPReportNarration
);


/**
 * @route   GET /api/reports/nep/student/:studentId
 * @desc    Get student's NEP reports
 * @access  Private
 */
router.get(
  '/nep/student/:studentId',
  authenticate,
  validatePagination,
  reportController.getStudentNEPReports
);

/**
 * @route   GET /api/reports/nep/:reportId/download
 * @desc    Download NEP report (PDF)
 * @access  Private
 */
router.get(
  '/nep/:reportId/download',
  authenticate,
  reportController.downloadNEPReport
);

/**
 * @route   GET /api/reports/nep/:reportId/qrcode
 * @desc    Get QR code for report verification
 * @access  Public
 */
router.get(
  '/nep/:reportId/qrcode',
  reportController.getReportQRCode
);

/**
 * @route   POST /api/reports/nep/:reportId/share
 * @desc    Share NEP report via email with verification link
 * @access  Private
 */
router.post(
  '/nep/:reportId/share',
  authenticate,
  validateReportSharing,
  reportController.shareNEPReport
);

/**
 * @route   GET /api/reports/nep/:reportId/ledger
 * @desc    Get ledger events used in report generation
 * @access  Private (Admin, Teacher, Student owning report)
 */
router.get(
  '/nep/:reportId/ledger',
  authenticate,
  reportController.getReportLedgerEvents
);

// ============================================================================
// ANALYTICS REPORTS (NON-LEDGER - KEEP AS IS)
// ============================================================================

/**
 * @route   POST /api/reports/institutional/generate
 * @desc    Generate institutional report (analytics only)
 * @access  Private (Admin, Teacher)
 */
router.post(
  '/institutional/generate',
  authenticate,
  authorize('admin', 'teacher'),
  validateReportGeneration,
  reportController.generateInstitutionalReport
);

/**
 * @route   GET /api/reports/institutional/:reportId
 * @desc    Get institutional report by ID
 * @access  Private (Admin, Teacher)
 */
router.get(
  '/institutional/:reportId',
  authenticate,
  authorize('admin', 'teacher'),
  reportController.getInstitutionalReport
);

/**
 * @route   GET /api/reports/institutional/school/:schoolId
 * @desc    Get school's institutional reports
 * @access  Private (Admin, Teacher)
 */
router.get(
  '/institutional/school/:schoolId',
  authenticate,
  authorize('admin', 'teacher'),
  validatePagination,
  reportController.getSchoolInstitutionalReports
);

/**
 * @route   DELETE /api/reports/institutional/:reportId
 * @desc    Delete institutional report
 * @access  Private (Admin)
 */
router.delete(
  '/institutional/:reportId',
  authenticate,
  authorize('admin'),
  reportController.deleteInstitutionalReport
);

// ============================================================================
// PROGRESS REPORTS (ANALYTICS - KEEP AS IS)
// ============================================================================

/**
 * @route   POST /api/reports/progress/generate
 * @desc    Generate student progress report
 * @access  Private
 */
router.post(
  '/progress/generate',
  authenticate,
  validateReportGeneration,
  reportController.generateProgressReport
);

/**
 * @route   POST /api/reports/progress/class
 * @desc    Generate class progress report
 * @access  Private (Teacher, Admin)
 */
router.post(
  '/progress/class',
  authenticate,
  authorize('teacher', 'admin'),
  validateReportGeneration,
  reportController.generateClassProgressReport
);

// ============================================================================
// SCHEDULED REPORTS (KEEP AS IS)
// ============================================================================

/**
 * @route   POST /api/reports/schedule
 * @desc    Schedule report generation
 * @access  Private (Admin, Teacher)
 */
router.post(
  '/schedule',
  authenticate,
  authorize('admin', 'teacher'),
  reportController.scheduleReport
);

/**
 * @route   GET /api/reports/scheduled
 * @desc    Get all scheduled reports
 * @access  Private (Admin, Teacher)
 */
router.get(
  '/scheduled',
  authenticate,
  authorize('admin', 'teacher'),
  reportController.getScheduledReports
);

/**
 * @route   DELETE /api/reports/scheduled/:scheduleId
 * @desc    Cancel scheduled report
 * @access  Private (Admin, Teacher)
 */
router.delete(
  '/scheduled/:scheduleId',
  authenticate,
  authorize('admin', 'teacher'),
  reportController.cancelScheduledReport
);

// ============================================================================
// BATCH OPERATIONS (NEW)
// ============================================================================

/**
 * @route   POST /api/reports/batch/generate
 * @desc    Generate reports for multiple students
 * @access  Private (Admin, Teacher)
 */
router.post(
  '/batch/generate',
  authenticate,
  authorize('admin', 'teacher'),
  reportController.generateBatchReports
);

/**
 * @route   POST /api/reports/batch/verify
 * @desc    Verify multiple reports in batch
 * @access  Private (Admin)
 */
router.post(
  '/batch/verify',
  authenticate,
  authorize('admin'),
  reportController.verifyBatchReports
);

// ============================================================================
// STATISTICS (NEW)
// ============================================================================

/**
 * @route   GET /api/reports/stats/school/:schoolId
 * @desc    Get report generation statistics for school
 * @access  Private (Admin, Teacher)
 */
router.get(
  '/stats/school/:schoolId',
  authenticate,
  authorize('admin', 'teacher'),
  reportController.getSchoolReportStats
);

/**
 * @route   GET /api/reports/stats/student/:studentId
 * @desc    Get report statistics for student
 * @access  Private (Student, Teacher, Parent, Admin)
 */
router.get(
  '/stats/student/:studentId',
  authenticate,
  reportController.getStudentReportStats
);

// ============================================================================
// WEBHOOKS (FOR EXTERNAL VERIFICATION)
// ============================================================================

/**
 * @route   POST /api/reports/webhook/verification
 * @desc    Webhook for external verification services
 * @access  Public (with API key validation)
 */
router.post(
  '/webhook/verification',
  reportController.handleVerificationWebhook
);

// ============================================================================
// HEALTH CHECK (NEW)
// ============================================================================

/**
 * @route   GET /api/reports/health
 * @desc    Health check for report service
 * @access  Public
 */
router.get(
  '/health',
  reportController.healthCheck
);

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;