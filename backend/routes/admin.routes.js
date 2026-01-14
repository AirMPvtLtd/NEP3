// routes/admin.routes.js
/**
 * ADMIN ROUTES
 * School admin management routes
 * 
 * @module routes/admin
 */

const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// ============================================================================
// SCHOOL MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/school
 * @desc    Get school details
 * @access  Private (Admin)
 */
router.get('/school', adminController.getSchool);

/**
 * @route   PUT /api/admin/school
 * @desc    Update school details
 * @access  Private (Admin)
 */
router.put(
  '/school',
  validateRequest('updateSchool'),
  adminController.updateSchool
);

/**
 * @route   GET /api/admin/school/statistics
 * @desc    Get school statistics
 * @access  Private (Admin)
 */
router.get('/school/statistics', adminController.getSchoolStatistics);

/**
 * @route   PUT /api/admin/school/settings
 * @desc    Update school settings
 * @access  Private (Admin)
 */
router.put(
  '/school/settings',
  validateRequest('updateSettings'),
  adminController.updateSettings
);

// ============================================================================
// TEACHER MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/teachers
 * @desc    Get all teachers
 * @access  Private (Admin)
 */
router.get('/teachers', adminController.getAllTeachers);

/**
 * @route   GET /api/admin/teachers/pending
 * @desc    Get pending teacher approvals
 * @access  Private (Admin)
 */
router.get('/teachers/pending', adminController.getPendingTeachers);

/**
 * @route   POST /api/admin/teachers
 * @desc    Add new teacher
 * @access  Private (Admin)
 */
router.post(
  '/teachers',
  validateRequest('createTeacher'),
  adminController.addTeacher
);

/**
 * @route   PUT /api/admin/teachers/:teacherId/approve
 * @desc    Approve teacher
 * @access  Private (Admin)
 */
router.put('/teachers/:teacherId/approve', adminController.approveTeacher);

/**
 * @route   PUT /api/admin/teachers/:teacherId/reject
 * @desc    Reject teacher
 * @access  Private (Admin)
 */
router.put(
  '/teachers/:teacherId/reject',
  validateRequest('rejectTeacher'),
  adminController.rejectTeacher
);

/**
 * @route   PUT /api/admin/teachers/:teacherId/suspend
 * @desc    Suspend teacher
 * @access  Private (Admin)
 */
router.put('/teachers/:teacherId/suspend', adminController.suspendTeacher);

/**
 * @route   PUT /api/admin/teachers/:teacherId/reactivate
 * @desc    Reactivate teacher
 * @access  Private (Admin)
 */
router.put('/teachers/:teacherId/reactivate', adminController.reactivateTeacher);

/**
 * @route   DELETE /api/admin/teachers/:teacherId
 * @desc    Delete teacher
 * @access  Private (Admin)
 */
router.delete('/teachers/:teacherId', adminController.deleteTeacher);

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/students
 * @desc    Get all students
 * @access  Private (Admin)
 */
router.get('/students', adminController.getAllStudents);

/**
 * @route   GET /api/admin/students/class/:class/section/:section
 * @desc    Get students by class
 * @access  Private (Admin)
 */
router.get('/students/class/:class/section/:section', adminController.getStudentsByClass);

/**
 * @route   POST /api/admin/students/bulk-upload
 * @desc    Bulk upload students (CSV)
 * @access  Private (Admin)
 */
router.post(
  '/students/bulk-upload',
  adminController.bulkUploadStudents
);

/**
 * @route   DELETE /api/admin/students/:studentId
 * @desc    Delete student
 * @access  Private (Admin)
 */
router.delete('/students/:studentId', adminController.deleteStudent);

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/classes
 * @desc    Get all class sections
 * @access  Private (Admin)
 */
router.get('/classes', adminController.getAllClasses);

/**
 * @route   POST /api/admin/classes
 * @desc    Create class section
 * @access  Private (Admin)
 */
router.post(
  '/classes',
  validateRequest('createClass'),
  adminController.createClass
);

/**
 * @route   PUT /api/admin/classes/:classSectionId
 * @desc    Update class section
 * @access  Private (Admin)
 */
router.put(
  '/classes/:classSectionId',
  validateRequest('updateClass'),
  adminController.updateClass
);

/**
 * @route   DELETE /api/admin/classes/:classSectionId
 * @desc    Delete class section
 * @access  Private (Admin)
 */
router.delete('/classes/:classSectionId', adminController.deleteClass);

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

/**
 * @route   GET /api/admin/reports/institutional
 * @desc    Get institutional reports
 * @access  Private (Admin)
 */
router.get('/reports/institutional', adminController.getInstitutionalReports);

/**
 * @route   POST /api/admin/reports/generate
 * @desc    Generate new institutional report
 * @access  Private (Admin)
 */
router.post(
  '/reports/generate',
  validateRequest('generateReport'),
  adminController.generateInstitutionalReport
);

/**
 * @route   GET /api/admin/analytics/overview
 * @desc    Get analytics overview
 * @access  Private (Admin)
 */
router.get('/analytics/overview', adminController.getAnalyticsOverview);

/**
 * @route   GET /api/admin/analytics/performance
 * @desc    Get performance analytics
 * @access  Private (Admin)
 */
router.get('/analytics/performance', adminController.getPerformanceAnalytics);

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

/**
 * @route   GET /api/admin/activity-logs
 * @desc    Get activity logs
 * @access  Private (Admin)
 */
router.get('/activity-logs', adminController.getActivityLogs);

/**
 * @route   GET /api/admin/activity-logs/failed
 * @desc    Get failed activities
 * @access  Private (Admin)
 */
router.get('/activity-logs/failed', adminController.getFailedActivities);

module.exports = router;