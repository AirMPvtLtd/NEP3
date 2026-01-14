// controllers/admin.controller.js
/**
 * ADMIN CONTROLLER - COMPLETE PRODUCTION VERSION
 * School admin management - fully integrated with all models
 * 
 * @module controllers/adminController
 */

const {
  School,
  Teacher,
  Student,
  ClassSection,
  Activity,
  Challenge,
  InstitutionalReport,
  NEPReport
} = require('../models');
const logger = require('../utils/logger');

// ============================================================================
// SCHOOL MANAGEMENT
// ============================================================================

/**
 * @desc    Get school details
 * @route   GET /api/admin/school
 * @access  Private (Admin)
 */
exports.getSchool = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    // Get additional statistics
    const totalTeachers = await Teacher.countDocuments({ schoolId: school.schoolId, active: true });
    const totalStudents = await Student.countDocuments({ schoolId: school.schoolId, active: true });
    const totalClasses = await ClassSection.countDocuments({ schoolId: school.schoolId, active: true });
    const totalChallenges = await Challenge.countDocuments({ schoolId: school.schoolId });
    
    const schoolData = school.toJSON();
    schoolData.currentStats = {
      totalTeachers,
      totalStudents,
      totalClasses,
      totalChallenges
    };
    
    res.json({
      success: true,
      data: { school: schoolData }
    });
    
  } catch (error) {
    logger.error('Get school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school details',
      error: error.message
    });
  }
};

/**
 * @desc    Update school details
 * @route   PUT /api/admin/school
 * @access  Private (Admin)
 */
exports.updateSchool = async (req, res) => {
  try {
    const allowedFields = [
      'schoolName',
      'address',
      'city',
      'state',
      'pincode',
      'phone',
      'website',
      'description'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    const school = await School.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'School details updated',
      metadata: { fields: Object.keys(updates) },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'School details updated successfully',
      data: { school }
    });
    
  } catch (error) {
    logger.error('Update school error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating school',
      error: error.message
    });
  }
};

/**
 * @desc    Get school statistics
 * @route   GET /api/admin/school/statistics
 * @access  Private (Admin)
 */
exports.getSchoolStatistics = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    // Teacher statistics
    const teacherStats = await Teacher.getSchoolStatistics(school.schoolId);
    
    // Student statistics
    const totalStudents = await Student.countDocuments({ schoolId: school.schoolId, active: true });
    const studentsByClass = await Student.aggregate([
      { $match: { schoolId: school.schoolId, active: true } },
      {
        $group: {
          _id: { class: '$class', section: '$section' },
          count: { $sum: 1 },
          averageSPI: { $avg: '$performanceIndex' }
        }
      },
      { $sort: { '_id.class': 1, '_id.section': 1 } }
    ]);
    
    // Challenge statistics
    const challengeStats = await Challenge.getSchoolStatistics(school.schoolId);
    
    // Class statistics
    const classStats = await ClassSection.getSchoolStatistics(school.schoolId);
    
    // Activity statistics (last 30 days)
    const activityStats = await Activity.getStatistics(school.schoolId, 30);
    
    // Top performers
    const topStudents = await Student.getTopPerformers(school.schoolId, 10);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalTeachers: teacherStats.total || 0,
          approvedTeachers: teacherStats.approved || 0,
          pendingTeachers: teacherStats.pending || 0,
          totalStudents,
          totalClasses: classStats.totalSections || 0,
          totalChallenges: challengeStats.totalChallenges || 0,
          averageScore: challengeStats.averageScore || 0,
          passRate: challengeStats.passRate || 0
        },
        teachers: teacherStats,
        students: {
          total: totalStudents,
          byClass: studentsByClass
        },
        challenges: challengeStats,
        classes: classStats,
        activity: activityStats,
        topPerformers: topStudents.map(s => ({
          studentId: s.studentId,
          name: s.name,
          class: s.class,
          section: s.section,
          performanceIndex: s.performanceIndex,
          grade: s.grade
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get school statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Update school settings
 * @route   PUT /api/admin/school/settings
 * @access  Private (Admin)
 */
exports.updateSettings = async (req, res) => {
  try {
    const allowedSettings = [
      'enableEmailNotifications',
      'enableParentAccess',
      'enableAIEvaluation',
      'challengeDailyLimit',
      'challengePerSimLimit'
    ];
    
    const settings = {};
    Object.keys(req.body).forEach(key => {
      if (allowedSettings.includes(key)) {
        settings[key] = req.body[key];
      }
    });
    
    if (Object.keys(settings).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid settings to update'
      });
    }
    
    const school = await School.findById(req.user.userId);
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    // Update settings
    school.settings = { ...school.settings.toObject(), ...settings };
    await school.save();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'settings_changed',
      action: 'School settings updated',
      metadata: { settings: Object.keys(settings) },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings: school.settings }
    });
    
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
};

// ============================================================================
// TEACHER MANAGEMENT
// ============================================================================

/**
 * @desc    Get all teachers
 * @route   GET /api/admin/teachers
 * @access  Private (Admin)
 */
exports.getAllTeachers = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const { status, subject, page = 1, limit = 50 } = req.query;
    
    const query = { schoolId: school.schoolId };
    
    if (status) {
      query.status = status.toLowerCase();
    }
    
    if (subject) {
      query.subjects = subject;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const teachers = await Teacher.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Teacher.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        teachers,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get all teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message
    });
  }
};

/**
 * @desc    Get pending teacher approvals
 * @route   GET /api/admin/teachers/pending
 * @access  Private (Admin)
 */
exports.getPendingTeachers = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const pendingTeachers = await Teacher.getPendingForSchool(school.schoolId);
    
    res.json({
      success: true,
      data: {
        teachers: pendingTeachers,
        count: pendingTeachers.length
      }
    });
    
  } catch (error) {
    logger.error('Get pending teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending teachers',
      error: error.message
    });
  }
};

/**
 * @desc    Add new teacher
 * @route   POST /api/admin/teachers
 * @access  Private (Admin)
 */
exports.addTeacher = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    // Check if school can add more teachers
    if (!school.canAddTeacher()) {
      return res.status(403).json({
        success: false,
        message: 'School has reached maximum teacher limit. Please upgrade your plan.'
      });
    }
    
    // Check if teacher email already exists
    const existingTeacher = await Teacher.findByEmail(req.body.email);
    if (existingTeacher) {
      return res.status(409).json({
        success: false,
        message: 'A teacher with this email already exists'
      });
    }
    
    // Create teacher
    const teacher = await Teacher.create({
      ...req.body,
      schoolId: school.schoolId,
      status: 'approved' // Admin-created teachers are auto-approved
    });
    
    // Increment school teacher count
    await school.incrementTeacherCount();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Teacher added',
      metadata: { teacherId: teacher.teacherId, teacherName: teacher.name },
      ipAddress: req.ip,
      success: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Teacher added successfully',
      data: { teacher }
    });
    
  } catch (error) {
    logger.error('Add teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Approve teacher
 * @route   PUT /api/admin/teachers/:teacherId/approve
 * @access  Private (Admin)
 */
exports.approveTeacher = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const teacher = await Teacher.findOne({ teacherId: req.params.teacherId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve teachers from your school'
      });
    }
    
    // ✅ FIX: Change APPROVED to approved (lowercase)
    if (teacher.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Teacher is already approved'
      });
    }
    
    await teacher.approve(school.schoolId);
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'teacher_approved',
      action: 'Teacher approved',
      metadata: { teacherId: teacher.teacherId, teacherName: teacher.name },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Teacher approved successfully',
      data: { teacher }
    });
    
  } catch (error) {
    logger.error('Approve teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Reject teacher
 * @route   PUT /api/admin/teachers/:teacherId/reject
 * @access  Private (Admin)
 */
exports.rejectTeacher = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const school = await School.findById(req.user.userId);
    const teacher = await Teacher.findOne({ teacherId: req.params.teacherId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject teachers from your school'
      });
    }
    
    await teacher.reject(reason);
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'teacher_rejected',
      action: 'Teacher rejected',
      metadata: { teacherId: teacher.teacherId, reason },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Teacher rejected',
      data: { teacher }
    });
    
  } catch (error) {
    logger.error('Reject teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Suspend teacher
 * @route   PUT /api/admin/teachers/:teacherId/suspend
 * @access  Private (Admin)
 */
exports.suspendTeacher = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const teacher = await Teacher.findOne({ teacherId: req.params.teacherId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only suspend teachers from your school'
      });
    }
    
    if (teacher.status === 'SUSPENDED') {
      return res.status(400).json({
        success: false,
        message: 'Teacher is already suspended'
      });
    }
    
    await teacher.suspend();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Teacher suspended',
      metadata: { teacherId: teacher.teacherId, teacherName: teacher.name },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Teacher suspended successfully',
      data: { teacher }
    });
    
  } catch (error) {
    logger.error('Suspend teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Reactivate teacher
 * @route   PUT /api/admin/teachers/:teacherId/reactivate
 * @access  Private (Admin)
 */
exports.reactivateTeacher = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const teacher = await Teacher.findOne({ teacherId: req.params.teacherId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only reactivate teachers from your school'
      });
    }
    
    if (teacher.status === 'APPROVED' && teacher.active) {
      return res.status(400).json({
        success: false,
        message: 'Teacher is already active'
      });
    }
    
    await teacher.reactivate();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Teacher reactivated',
      metadata: { teacherId: teacher.teacherId, teacherName: teacher.name },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Teacher reactivated successfully',
      data: { teacher }
    });
    
  } catch (error) {
    logger.error('Reactivate teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reactivating teacher',
      error: error.message
    });
  }
};

/**
 * @desc    Delete teacher
 * @route   DELETE /api/admin/teachers/:teacherId
 * @access  Private (Admin)
 */
exports.deleteTeacher = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const teacher = await Teacher.findOne({ teacherId: req.params.teacherId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete teachers from your school'
      });
    }
    
    // Check if teacher has students
    const studentCount = await Student.countDocuments({ teacherId: teacher.teacherId });
    
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete teacher. ${studentCount} students are assigned to this teacher. Please reassign students first.`
      });
    }
    
    await Teacher.deleteOne({ teacherId: req.params.teacherId });
    await school.decrementTeacherCount();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Teacher deleted',
      metadata: { teacherId: teacher.teacherId, teacherName: teacher.name },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
      error: error.message
    });
  }
};

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * @desc    Get all students
 * @route   GET /api/admin/students
 * @access  Private (Admin)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const { class: classNum, section, search, page = 1, limit = 50 } = req.query;
    
    const query = { schoolId: school.schoolId, active: true };
    
    if (classNum) {
      query.class = parseInt(classNum);
    }
    
    if (section) {
      query.section = section.toUpperCase();
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const students = await Student.find(query)
      .select('studentId name class section rollNumber performanceIndex stats')
      .sort({ class: 1, section: 1, rollNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Student.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        students,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

/**
 * @desc    Get students by class and section
 * @route   GET /api/admin/students/class/:class/section/:section
 * @access  Private (Admin)
 */
exports.getStudentsByClass = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const { class: classNum, section } = req.params;
    
    const students = await Student.getByClass(
      school.schoolId,
      parseInt(classNum),
      section.toUpperCase()
    );
    
    res.json({
      success: true,
      data: {
        students,
        count: students.length,
        class: parseInt(classNum),
        section: section.toUpperCase()
      }
    });
    
  } catch (error) {
    logger.error('Get students by class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk upload students from CSV
 * @route   POST /api/admin/students/bulk-upload
 * @access  Private (Admin)
 */
exports.bulkUploadStudents = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const { students } = req.body; // Array of student objects
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student data provided'
      });
    }
    
    // Validate school capacity
    if (!school.canAddStudent()) {
      return res.status(403).json({
        success: false,
        message: 'School has reached maximum student limit'
      });
    }
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (const studentData of students) {
      try {
        // Validate required fields
        if (!studentData.name || !studentData.class || !studentData.section || !studentData.teacherId) {
          results.failed.push({
            data: studentData,
            reason: 'Missing required fields (name, class, section, teacherId)'
          });
          continue;
        }
        
        // Check if teacher exists
        const teacher = await Teacher.findOne({ teacherId: studentData.teacherId });
        if (!teacher) {
          results.failed.push({
            data: studentData,
            reason: 'Teacher not found'
          });
          continue;
        }
        
        // Create student
        const student = await Student.create({
          ...studentData,
          schoolId: school.schoolId,
          password: studentData.password || 'student123' // Default password
        });
        
        results.successful.push(student);
        
        // Update counts
        await school.incrementStudentCount();
        await teacher.incrementStudentCount();
        
      } catch (err) {
        results.failed.push({
          data: studentData,
          reason: err.message
        });
      }
    }
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Bulk student upload',
      metadata: {
        total: students.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: `Uploaded ${results.successful.length} students. ${results.failed.length} failed.`,
      data: {
        successful: results.successful.length,
        failed: results.failed.length,
        failedRecords: results.failed
      }
    });
    
  } catch (error) {
    logger.error('Bulk upload students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading students',
      error: error.message
    });
  }
};

/**
 * @desc    Delete student
 * @route   DELETE /api/admin/students/:studentId
 * @access  Private (Admin)
 */
exports.deleteStudent = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const student = await Student.findOne({ studentId: req.params.studentId });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete students from your school'
      });
    }
    
    // Delete student
    await Student.deleteOne({ studentId: req.params.studentId });
    
    // Update counts
    await school.decrementStudentCount();
    
    const teacher = await Teacher.findOne({ teacherId: student.teacherId });
    if (teacher) {
      await teacher.decrementStudentCount();
    }
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Student deleted',
      metadata: { studentId: student.studentId, studentName: student.name },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message
    });
  }
};

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

/**
 * @desc    Get all class sections
 * @route   GET /api/admin/classes
 * @access  Private (Admin)
 */
exports.getAllClasses = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const classes = await ClassSection.getBySchool(school.schoolId);
    
    res.json({
      success: true,
      data: {
        classes,
        count: classes.length
      }
    });
    
  } catch (error) {
    logger.error('Get all classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
};

/**
 * @desc    Create class section
 * @route   POST /api/admin/classes
 * @access  Private (Admin)
 */
exports.createClass = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    // Validate teacher exists
    const teacher = await Teacher.findOne({ teacherId: req.body.teacherId });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Teacher does not belong to your school'
      });
    }
    
    // Create class section
    const classSection = await ClassSection.create({
      ...req.body,
      schoolId: school.schoolId
    });
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Class section created',
      metadata: {
        classSectionId: classSection.classSectionId,
        class: classSection.class,
        section: classSection.section,
        subject: classSection.subject
      },
      ipAddress: req.ip,
      success: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Class section created successfully',
      data: { class: classSection }
    });
    
  } catch (error) {
    logger.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating class section',
      error: error.message
    });
  }
};

/**
 * @desc    Update class section
 * @route   PUT /api/admin/classes/:classSectionId
 * @access  Private (Admin)
 */
exports.updateClass = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const classSection = await ClassSection.findOne({
      classSectionId: req.params.classSectionId
    });
    
    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class section not found'
      });
    }
    
    if (classSection.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update classes from your school'
      });
    }
    
    const allowedFields = ['className', 'roomNumber', 'capacity', 'description', 'schedule'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    Object.assign(classSection, updates);
    await classSection.save();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Class section updated',
      metadata: { classSectionId: classSection.classSectionId },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Class section updated successfully',
      data: { class: classSection }
    });
    
  } catch (error) {
    logger.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class section',
      error: error.message
    });
  }
};

/**
 * @desc    Delete class section
 * @route   DELETE /api/admin/classes/:classSectionId
 * @access  Private (Admin)
 */
exports.deleteClass = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const classSection = await ClassSection.findOne({
      classSectionId: req.params.classSectionId
    });
    
    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class section not found'
      });
    }
    
    if (classSection.schoolId !== school.schoolId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete classes from your school'
      });
    }
    
    // Check if class has students
    const studentCount = await Student.countDocuments({
      classSectionId: classSection.classSectionId
    });
    
    if (studentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete class section. ${studentCount} students are enrolled. Please reassign students first.`
      });
    }
    
    await ClassSection.deleteOne({ classSectionId: req.params.classSectionId });
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'other',
      action: 'Class section deleted',
      metadata: { classSectionId: classSection.classSectionId },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Class section deleted successfully'
    });
    
  } catch (error) {
    logger.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class section',
      error: error.message
    });
  }
};

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

/**
 * @desc    Get institutional reports
 * @route   GET /api/admin/reports/institutional
 * @access  Private (Admin)
 */
exports.getInstitutionalReports = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    const { type, limit = 10 } = req.query;
    
    const query = { schoolId: school.schoolId };
    
    if (type) {
      query.reportType = type;
    }
    
    const reports = await InstitutionalReport.find(query)
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        reports,
        count: reports.length
      }
    });
    
  } catch (error) {
    logger.error('Get institutional reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
};

/**
 * @desc    Generate institutional report
 * @route   POST /api/admin/reports/generate
 * @access  Private (Admin)
 */
exports.generateInstitutionalReport = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const { reportType, periodStart, periodEnd } = req.body;
    
    if (!reportType || !periodStart || !periodEnd) {
      return res.status(400).json({
        success: false,
        message: 'Report type, period start, and period end are required'
      });
    }
    
    // This would trigger a background job to generate the report
    // For now, we'll create a placeholder
    
    const report = await InstitutionalReport.create({
      schoolId: school.schoolId,
      reportType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      generatedBy: req.user.userId
    });
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId: school.schoolId,
      activityType: 'report_generated',
      action: 'Institutional report generated',
      metadata: { reportId: report.reportId, reportType },
      ipAddress: req.ip,
      success: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Report generation started',
      data: { report }
    });
    
  } catch (error) {
    logger.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

/**
 * @desc    Get analytics overview
 * @route   GET /api/admin/analytics/overview
 * @access  Private (Admin)
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    // Get various statistics
    const totalStudents = await Student.countDocuments({ schoolId: school.schoolId, active: true });
    const totalTeachers = await Teacher.countDocuments({ schoolId: school.schoolId, active: true });
    const totalChallenges = await Challenge.countDocuments({ schoolId: school.schoolId });
    
    // Get average performance
    const avgPerformance = await Student.aggregate([
      { $match: { schoolId: school.schoolId, active: true } },
      { $group: { _id: null, avgSPI: { $avg: '$performanceIndex' } } }
    ]);
    
    // Get recent activity (last 7 days)
    const dailyActivity = await Activity.getDailyCount(school.schoolId, 7);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalTeachers,
          totalChallenges,
          averagePerformance: avgPerformance[0]?.avgSPI || 0
        },
        recentActivity: dailyActivity
      }
    });
    
  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get performance analytics
 * @route   GET /api/admin/analytics/performance
 * @access  Private (Admin)
 */
exports.getPerformanceAnalytics = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    
    // Performance distribution
    const distribution = await Student.aggregate([
      { $match: { schoolId: school.schoolId, active: true } },
      {
        $bucket: {
          groupBy: '$performanceIndex',
          boundaries: [0, 50, 60, 70, 80, 90, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            students: { $push: { studentId: '$studentId', name: '$name' } }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        distribution
      }
    });
    
  } catch (error) {
    logger.error('Get performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performance analytics',
      error: error.message
    });
  }
};

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

/**
 * @desc    Get activity logs
 * @route   GET /api/admin/activity-logs
 * @access  Private (Admin)
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const { limit = 100 } = req.query;
    
    const logs = await Activity.getSchoolActivities(school.schoolId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
    
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
      error: error.message
    });
  }
};

/**
 * @desc    Get failed activities
 * @route   GET /api/admin/activity-logs/failed
 * @access  Private (Admin)
 */
exports.getFailedActivities = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const { limit = 50 } = req.query;
    
    const logs = await Activity.getFailedActivities(school.schoolId, parseInt(limit));
    
    res.json({
      success: true,
      data: {
        logs,
        count: logs.length
      }
    });
    
  } catch (error) {
    logger.error('Get failed activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching failed activities',
      error: error.message
    });
  }
};

module.exports = exports;