// routes/teacher.routes.js
/**
 * TEACHER ROUTES
 * Teacher-specific routes
 * 
 * @module routes/teacher
 */

const express = require('express');
const router = express.Router();

const teacherController = require('../controllers/teacher.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validation.middleware');

// All teacher routes require authentication and teacher role
router.use(authenticate);
router.use(authorize('teacher'));

// ============================================================================
// TEACHER PROFILE
// ============================================================================

/**
 * @route   GET /api/teacher/profile
 * @desc    Get teacher profile
 * @access  Private (Teacher)
 */
router.get('/profile', teacherController.getProfile);

/**
 * @route   PUT /api/teacher/profile
 * @desc    Update teacher profile
 * @access  Private (Teacher)
 */
router.put(
  '/profile',
  validateRequest('updateTeacherProfile'),
  teacherController.updateProfile
);

/**
 * @route   GET /api/teacher/dashboard
 * @desc    Get teacher dashboard data
 * @access  Private (Teacher)
 */
router.get('/dashboard', teacherController.getDashboard);

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/teacher/classes
 * @desc    Get teacher's classes
 * @access  Private (Teacher)
 */
router.get('/classes', teacherController.getClasses);

/**
 * @route   GET /api/teacher/classes/:classSectionId
 * @desc    Get class details
 * @access  Private (Teacher)
 */
router.get('/classes/:classSectionId', teacherController.getClassDetails);

/**
 * @route   GET /api/teacher/classes/:classSectionId/students
 * @desc    Get students in class
 * @access  Private (Teacher)
 */
router.get('/classes/:classSectionId/students', teacherController.getClassStudents);

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/teacher/students
 * @desc    Get all students under teacher
 * @access  Private (Teacher)
 */
router.get('/students', teacherController.getAllStudents);

/**
 * @route   GET /api/teacher/students/:studentId
 * @desc    Get student details
 * @access  Private (Teacher)
 */
router.get('/students/:studentId', teacherController.getStudentDetails);

/**
 * @route   POST /api/teacher/students
 * @desc    Add new student
 * @access  Private (Teacher)
 */
router.post(
  '/students',
  validateRequest('createStudent'),
  teacherController.addStudent
);

/**
 * @route   PUT /api/teacher/students/:studentId
 * @desc    Update student details
 * @access  Private (Teacher)
 */
router.put(
  '/students/:studentId',
  validateRequest('updateStudent'),
  teacherController.updateStudent
);

/**
 * @route   GET /api/teacher/students/:studentId/performance
 * @desc    Get student performance details
 * @access  Private (Teacher)
 */
router.get('/students/:studentId/performance', teacherController.getStudentPerformance);

/**
 * @route   GET /api/teacher/students/:studentId/challenges
 * @desc    Get student's challenges
 * @access  Private (Teacher)
 */
router.get('/students/:studentId/challenges', teacherController.getStudentChallenges);

// ============================================================================
// CHALLENGE MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/teacher/challenges
 * @desc    Get all challenges (created by students)
 * @access  Private (Teacher)
 */
router.get('/challenges', teacherController.getAllChallenges);

/**
 * @route   GET /api/teacher/challenges/:challengeId
 * @desc    Get challenge details
 * @access  Private (Teacher)
 */
router.get('/challenges/:challengeId', teacherController.getChallengeDetails);

/**
 * @route   PUT /api/teacher/challenges/:challengeId/override
 * @desc    Override challenge score
 * @access  Private (Teacher)
 */
router.put(
  '/challenges/:challengeId/override',
  validateRequest('overrideScore'),
  teacherController.overrideChallengeScore
);

/**
 * @route   GET /api/teacher/challenges/pending-review
 * @desc    Get challenges pending review
 * @access  Private (Teacher)
 */
router.get('/challenges/pending-review', teacherController.getPendingReviewChallenges);

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

/**
 * @route   GET /api/teacher/reports/class-performance
 * @desc    Get class performance report
 * @access  Private (Teacher)
 */
router.get('/reports/class-performance', teacherController.getClassPerformanceReport);

/**
 * @route   GET /api/teacher/reports/student/:studentId
 * @desc    Get individual student report
 * @access  Private (Teacher)
 */
router.get('/reports/student/:studentId', teacherController.getStudentReport);

/**
 * @route   GET /api/teacher/analytics/overview
 * @desc    Get teacher analytics overview
 * @access  Private (Teacher)
 */
router.get('/analytics/overview', teacherController.getAnalyticsOverview);

/**
 * @route   GET /api/teacher/analytics/competencies
 * @desc    Get competency analytics
 * @access  Private (Teacher)
 */
router.get('/analytics/competencies', teacherController.getCompetencyAnalytics);

// ============================================================================
// HELP TICKETS
// ============================================================================

/**
 * @route   GET /api/teacher/help-tickets
 * @desc    Get help tickets from students
 * @access  Private (Teacher)
 */
router.get('/help-tickets', teacherController.getHelpTickets);

/**
 * @route   PUT /api/teacher/help-tickets/:ticketId/respond
 * @desc    Respond to help ticket
 * @access  Private (Teacher)
 */
router.put(
  '/help-tickets/:ticketId/respond',
  validateRequest('respondToTicket'),
  teacherController.respondToTicket
);

/**
 * @route   PUT /api/teacher/help-tickets/:ticketId/resolve
 * @desc    Resolve help ticket
 * @access  Private (Teacher)
 */
router.put('/help-tickets/:ticketId/resolve', teacherController.resolveTicket);

// ============================================================================
// TEACHING STUDIO
// ============================================================================

router.post('/studio/notes', teacherController.generateSmartNotes);
router.post('/studio/scenario', teacherController.generateIndustryScenario);
router.post('/studio/questions/generate', teacherController.generateQuestion);
router.post('/studio/questions/save', teacherController.saveQuestion);
router.get('/studio/questions', teacherController.getQuestions);
router.post('/studio/simulator', teacherController.generateSimulator);

module.exports = router;