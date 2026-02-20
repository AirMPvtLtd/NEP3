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
const { callMistralAPI } = require('../services/mistral.service');

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
    
    // Validate school capacity against the full batch size
    const remaining = school.limits.maxStudents - school.stats.totalStudents;
    if (remaining <= 0) {
      return res.status(403).json({
        success: false,
        code: 'STUDENT_LIMIT_REACHED',
        message: `Student limit of ${school.limits.maxStudents} reached for your current plan.`,
        currentStudents: school.stats.totalStudents,
        maxStudents: school.limits.maxStudents,
        upgradeUrl: '/contact',
        upgradeMessage: 'Contact us to upgrade your plan and add more students.',
      });
    }

    // If the batch is larger than remaining capacity, truncate it
    const batchSize = students.length;
    const canAdd = Math.min(batchSize, remaining);
    const studentsToProcess = students.slice(0, canAdd);
    const truncated = batchSize > canAdd
      ? students.slice(canAdd).map(s => ({
          data: s,
          reason: `Plan limit reached — only ${remaining} slot(s) available. Contact us to upgrade.`,
        }))
      : [];
    
    const results = {
      successful: [],
      failed: [...truncated]
    };

    for (const studentData of studentsToProcess) {
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
        attempted: studentsToProcess.length,
        successful: results.successful.length,
        failed: results.failed.length,
        truncatedByLimit: truncated.length,
      },
      ipAddress: req.ip,
      success: true
    });

    const limitWarning = truncated.length > 0
      ? ` ${truncated.length} record(s) rejected — plan limit reached. Upgrade to add more.`
      : '';

    res.json({
      success: true,
      message: `Uploaded ${results.successful.length} students. ${results.failed.length} failed.${limitWarning}`,
      data: {
        successful: results.successful.length,
        failed: results.failed.length,
        failedRecords: results.failed,
        limitReached: truncated.length > 0,
        upgradeUrl: truncated.length > 0 ? '/contact' : undefined,
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

    const schoolId  = school.schoolId;
    const startDate = new Date(periodStart);
    const endDate   = new Date(periodEnd);

    // Normalise 'institutional' (UI label) → 'quarterly' (model enum)
    const validTypes = ['weekly', 'monthly', 'quarterly', 'annual'];
    const safeType   = validTypes.includes(reportType) ? reportType : 'quarterly';

    // ── Real stats from DB ──────────────────────────────────────────────
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      classSections,
      totalChallenges,
      periodChallenges
    ] = await Promise.all([
      Student.countDocuments({ schoolId }),
      Student.countDocuments({ schoolId, isActive: true }),
      Teacher.countDocuments({ schoolId }),
      ClassSection.find({ schoolId }).select('class section').lean(),
      Challenge.countDocuments({ schoolId }),
      Challenge.find({
        schoolId,
        status: 'evaluated',
        createdAt: { $gte: startDate, $lte: endDate }
      }).select('results.totalScore studentId').lean()
    ]);

    // Average score from challenges in period (real field: results.totalScore)
    const scores = periodChallenges.map(c => c.results?.totalScore).filter(s => typeof s === 'number');
    const averageSPI = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    // Performance distribution (grade bands based on results.totalScore 0–100)
    const dist = { aPlus: 0, a: 0, b: 0, c: 0, d: 0, f: 0 };
    scores.forEach(s => {
      if (s >= 90)      dist.aPlus++;
      else if (s >= 80) dist.a++;
      else if (s >= 70) dist.b++;
      else if (s >= 60) dist.c++;
      else if (s >= 50) dist.d++;
      else              dist.f++;
    });

    // Class-wise performance (studentId in Challenge is a String)
    const classwisePerformance = await Promise.all(
      classSections.map(async cs => {
        const students = await Student.find({
          schoolId, class: cs.class, section: cs.section
        }).select('studentId').lean();
        const studentIds = students.map(s => s.studentId);
        const classChallenges = await Challenge.find({
          schoolId,
          status: 'evaluated',
          studentId: { $in: studentIds },
          createdAt: { $gte: startDate, $lte: endDate }
        }).select('results.totalScore').lean();
        const cScores = classChallenges.map(c => c.results?.totalScore).filter(s => typeof s === 'number');
        const avg = cScores.length
          ? Math.round((cScores.reduce((a, b) => a + b, 0) / cScores.length) * 10) / 10
          : null;
        return {
          class: cs.class,
          section: cs.section,
          totalStudents: students.length,
          averageSPI: avg,
          averageChallengeScore: avg
        };
      })
    );

    // Top performers — sort by results.totalScore
    const topChallenges = await Challenge.find({
      schoolId,
      status: 'evaluated',
      createdAt: { $gte: startDate, $lte: endDate },
      'results.totalScore': { $exists: true, $ne: null }
    }).sort({ 'results.totalScore': -1 }).limit(5).select('studentId results.totalScore').lean();

    const topStudentIds = topChallenges.map(c => c.studentId);
    const topStudents   = await Student.find({ studentId: { $in: topStudentIds } })
      .select('studentId name class').lean();
    const studentMap    = Object.fromEntries(topStudents.map(s => [s.studentId, s]));

    const topPerformers = topChallenges.map((c, i) => {
      const s = studentMap[c.studentId] || {};
      return {
        studentId: c.studentId || '',
        name: s.name || 'Unknown',
        class: s.class || 0,
        spi: c.results?.totalScore ?? 0,
        rank: i + 1
      };
    });

    const report = await InstitutionalReport.create({
      schoolId,
      reportType: safeType,
      periodStart: startDate,
      periodEnd: endDate,
      generatedBy: req.user.userId,
      generatedByRole: 'admin',
      overview: {
        totalStudents,
        activeStudents,
        totalTeachers,
        totalClasses: classSections.length,
        totalChallenges,
        averageSPI
      },
      performanceDistribution: dist,
      classwisePerformance,
      topPerformers
    });

    await Activity.log({
      userId: req.user.userId,
      userType: 'admin',
      schoolId,
      activityType: 'report_generated',
      action: `${reportType} institutional report generated`,
      metadata: { reportId: report.reportId, reportType },
      ipAddress: req.ip,
      success: true
    });

    res.status(201).json({
      success: true,
      message: `${reportType} report generated successfully`,
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
 * @desc    Generate AI narration for an institutional report
 * @route   POST /api/admin/reports/:reportId/narrate
 * @access  Private (Admin)
 */
exports.narrateInstitutionalReport = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const report = await InstitutionalReport.findOne({
      reportId: req.params.reportId,
      schoolId: school.schoolId
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Return cached narration if already generated
    if (report.narration) {
      return res.json({ success: true, data: { narration: report.narration, cached: true } });
    }

    const ov   = report.overview || {};
    const dist = report.performanceDistribution || {};
    const typeLabel = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };
    const fmt  = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const systemPrompt = `You are an official NEP 2020 institutional audit narrator for the Government of India. Generate formal, audit-safe narration for school institutional reports. Use ONLY the provided data. Write plain formal English with no markdown, no bullets, no symbols. Maintain CBSE/Government inspection tone.`;

    const userPrompt = `Generate a formal NEP 2020 institutional performance narration for the following report data:

School: ${school.name || school.schoolId}
Report Type: ${typeLabel[report.reportType] || report.reportType}
Report ID: ${report.reportId}
Assessment Period: ${fmt(report.periodStart)} to ${fmt(report.periodEnd)}
Generated On: ${fmt(report.generatedAt)}

Overview Metrics:
- Total Students: ${ov.totalStudents || 0}
- Active Students: ${ov.activeStudents || 0}
- Total Teachers: ${ov.totalTeachers || 0}
- Total Classes: ${ov.totalClasses || 0}
- Total Challenges Attempted: ${ov.totalChallenges || 0}
- Average SPI Score: ${ov.averageSPI != null ? ov.averageSPI : 'Not available'}

Performance Distribution:
- A+ Grade (90 and above): ${dist.aPlus || 0} students
- A Grade (80-89): ${dist.a || 0} students
- B Grade (70-79): ${dist.b || 0} students
- C Grade (60-69): ${dist.c || 0} students
- D Grade (50-59): ${dist.d || 0} students
- F Grade (below 50): ${dist.f || 0} students

Write a formal institutional narration in exactly these four sections:
1. Institution and Assessment Overview
2. Student Performance and Achievement Analysis
3. NEP 2020 Compliance and Alignment Summary
4. Concluding Administrative Statement`;

    const response = await callMistralAPI({
      operation: 'institutional_narration',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.25,
      maxTokens: 800
    });

    if (!response?.content) {
      throw new Error('Empty narration received from AI');
    }

    const narration = response.content.trim();
    report.narration = narration;
    await report.save();

    return res.json({ success: true, data: { narration, cached: false } });

  } catch (error) {
    logger.error('Narrate institutional report error:', error);
    res.status(500).json({ success: false, message: 'Error generating narration', error: error.message });
  }
};

/**
 * @desc    Download institutional report as NEP-formatted HTML (print-to-PDF)
 * @route   GET /api/admin/reports/:reportId/download
 * @access  Private (Admin)
 */
exports.downloadReport = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    const report = await InstitutionalReport.findOne({
      reportId: req.params.reportId,
      schoolId: school.schoolId
    }).lean();

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    const ov   = report.overview || {};
    const dist = report.performanceDistribution || {};
    const fmt  = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const pct  = (n, total) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';
    const totalScored = (dist.aPlus||0)+(dist.a||0)+(dist.b||0)+(dist.c||0)+(dist.d||0)+(dist.f||0);

    const classwiseRows = (report.classwisePerformance || []).map(c => `
      <tr>
        <td>Class ${c.class} – ${c.section}</td>
        <td>${c.totalStudents}</td>
        <td>${c.averageSPI != null ? c.averageSPI : '—'}</td>
        <td>${c.averageChallengeScore != null ? c.averageChallengeScore : '—'}</td>
      </tr>`).join('');

    const topRows = (report.topPerformers || []).map(p => `
      <tr>
        <td>${p.rank}</td>
        <td>${p.name}</td>
        <td>${p.class || '—'}</td>
        <td><strong>${p.spi}</strong></td>
      </tr>`).join('');

    const typeLabel = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };

    // Chart data for the HTML report
    const chartDistLabels = ['A+ (90-100)', 'A (80-89)', 'B (70-79)', 'C (60-69)', 'D (50-59)', 'F (<50)'];
    const chartDistData   = [dist.aPlus||0, dist.a||0, dist.b||0, dist.c||0, dist.d||0, dist.f||0];
    const chartDistColors = ['#1a6e3c','#27ae60','#2980b9','#f39c12','#e67e22','#e74c3c'];
    const chartClassLabels = (report.classwisePerformance||[]).map(c => `Class ${c.class}-${c.section}`);
    const chartClassData   = (report.classwisePerformance||[]).map(c => c.averageSPI != null ? c.averageSPI : 0);
    const chartClassColors = chartClassData.map(v => v >= 70 ? '#27ae60' : v >= 50 ? '#f39c12' : '#e74c3c');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>NEP 2020 Institutional Report – ${school.name || 'School'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px; }

  /* Header */
  .report-header { border-bottom: 3px solid #1a3c6e; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
  .school-name { font-size: 22px; font-weight: 700; color: #1a3c6e; }
  .report-title { font-size: 15px; color: #444; margin-top: 4px; }
  .report-meta { text-align: right; font-size: 12px; color: #666; }
  .nep-badge { background: #1a3c6e; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-top: 6px; display: inline-block; }

  /* Section headings */
  h2 { font-size: 14px; font-weight: 700; color: #1a3c6e; text-transform: uppercase; letter-spacing: 0.5px; border-left: 4px solid #1a3c6e; padding-left: 10px; margin: 28px 0 14px; }

  /* Summary tiles */
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 10px; }
  .tile { border: 1px solid #d0d8e8; border-radius: 6px; padding: 16px; text-align: center; }
  .tile-value { font-size: 28px; font-weight: 700; color: #1a3c6e; }
  .tile-label { font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.4px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #1a3c6e; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e8ecf3; font-size: 12px; }
  tr:nth-child(even) td { background: #f5f7fb; }

  /* Grade distribution bar */
  .grade-row { display: flex; gap: 8px; margin: 10px 0; align-items: center; }
  .grade-label { width: 32px; font-weight: 600; color: #1a3c6e; font-size: 12px; }
  .grade-bar-wrap { flex: 1; background: #e8ecf3; border-radius: 3px; height: 18px; overflow: hidden; }
  .grade-bar { height: 100%; border-radius: 3px; }
  .grade-count { width: 60px; text-align: right; font-size: 12px; color: #444; }

  /* Footer */
  .report-footer { border-top: 1px solid #ccc; margin-top: 40px; padding-top: 14px; font-size: 11px; color: #888; display: flex; justify-content: space-between; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
    .page { padding: 20px; }
  }
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
<div class="page">

  <!-- Print button -->
  <div class="no-print" style="text-align:right;margin-bottom:20px;">
    <button onclick="window.print()" style="background:#1a3c6e;color:#fff;border:none;padding:10px 22px;border-radius:5px;font-size:13px;cursor:pointer;">
      ⬇ Download / Print as PDF
    </button>
  </div>

  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="school-name">${school.name || 'School'}</div>
      <div class="report-title">${typeLabel[report.reportType] || report.reportType} Institutional Report</div>
      <div class="report-title" style="margin-top:6px;color:#888;">Period: ${fmt(report.periodStart)} – ${fmt(report.periodEnd)}</div>
    </div>
    <div class="report-meta">
      <div>Report ID: <strong>${report.reportId}</strong></div>
      <div>Generated: ${fmt(report.generatedAt)}</div>
      <div class="nep-badge">NEP 2020 Compliant</div>
    </div>
  </div>

  <!-- Executive Summary -->
  <h2>Executive Summary</h2>
  <div class="tiles">
    <div class="tile"><div class="tile-value">${ov.totalStudents ?? 0}</div><div class="tile-label">Total Students</div></div>
    <div class="tile"><div class="tile-value">${ov.activeStudents ?? 0}</div><div class="tile-label">Active Students</div></div>
    <div class="tile"><div class="tile-value">${ov.totalTeachers ?? 0}</div><div class="tile-label">Teachers</div></div>
    <div class="tile"><div class="tile-value">${ov.totalClasses ?? 0}</div><div class="tile-label">Classes</div></div>
    <div class="tile"><div class="tile-value">${ov.totalChallenges ?? 0}</div><div class="tile-label">Challenges</div></div>
    <div class="tile"><div class="tile-value">${ov.averageSPI != null ? ov.averageSPI : '—'}</div><div class="tile-label">Avg Score</div></div>
  </div>

  <!-- Performance Distribution -->
  <h2>Performance Distribution</h2>
  ${[
    { grade: 'A+', key: 'aPlus', color: '#1a6e3c' },
    { grade: 'A',  key: 'a',    color: '#27ae60' },
    { grade: 'B',  key: 'b',    color: '#2980b9' },
    { grade: 'C',  key: 'c',    color: '#f39c12' },
    { grade: 'D',  key: 'd',    color: '#e67e22' },
    { grade: 'F',  key: 'f',    color: '#e74c3c' }
  ].map(g => {
    const n = dist[g.key] || 0;
    const w = totalScored > 0 ? ((n / totalScored) * 100).toFixed(1) : 0;
    return `<div class="grade-row">
      <div class="grade-label">${g.grade}</div>
      <div class="grade-bar-wrap"><div class="grade-bar" style="width:${w}%;background:${g.color};"></div></div>
      <div class="grade-count">${n} (${pct(n, totalScored)})</div>
    </div>`;
  }).join('')}

  <!-- Charts: Grade Distribution + Class-wise SPI -->
  <div style="display:flex;gap:24px;margin:24px 0;flex-wrap:wrap;align-items:flex-start;">
    <div style="background:#f5f7fb;border:1px solid #d0d8e8;border-radius:6px;padding:16px;flex:0 0 260px;">
      <div style="font-size:12px;font-weight:700;color:#1a3c6e;text-align:center;margin-bottom:10px;">Grade Distribution</div>
      <canvas id="gradeChart" width="220" height="220"></canvas>
    </div>
    ${chartClassLabels.length ? `<div style="background:#f5f7fb;border:1px solid #d0d8e8;border-radius:6px;padding:16px;flex:1;min-width:280px;">
      <div style="font-size:12px;font-weight:700;color:#1a3c6e;text-align:center;margin-bottom:10px;">Class-wise Average SPI</div>
      <canvas id="classChart" height="${Math.max(100, chartClassLabels.length * 32)}"></canvas>
    </div>` : ''}
  </div>

  <!-- Class-wise Performance -->
  ${classwiseRows ? `<h2>Class-wise Performance</h2>
  <table>
    <thead><tr><th>Class / Section</th><th>Students</th><th>Avg SPI</th><th>Avg Challenge Score</th></tr></thead>
    <tbody>${classwiseRows}</tbody>
  </table>` : ''}

  <!-- Top Performers -->
  ${topRows ? `<h2>Top Performers</h2>
  <table>
    <thead><tr><th>Rank</th><th>Student Name</th><th>Class</th><th>Score</th></tr></thead>
    <tbody>${topRows}</tbody>
  </table>` : ''}

  <!-- NEP 2020 Alignment Note -->
  <h2>NEP 2020 Alignment</h2>
  <table>
    <thead><tr><th>NEP 2020 Principle</th><th>Metric Addressed</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td>Holistic & Multidisciplinary Education</td><td>Challenge diversity across subjects</td><td>✓ Tracked</td></tr>
      <tr><td>Competency-Based Learning</td><td>Average Challenge Score</td><td>✓ Tracked</td></tr>
      <tr><td>Equitable & Inclusive Education</td><td>Active student participation rate</td><td>✓ Tracked</td></tr>
      <tr><td>Technology Integration</td><td>AI-evaluated challenge count</td><td>✓ Tracked</td></tr>
      <tr><td>Teacher Empowerment</td><td>Teacher-to-student ratio</td><td>✓ Tracked</td></tr>
    </tbody>
  </table>

  ${report.narration ? `
  <!-- AI Narration -->
  <h2>Official Narration</h2>
  <div style="background:#f8faff;border:1px solid #d0d8e8;border-radius:6px;padding:18px 20px;font-size:13px;line-height:1.8;color:#2c3e50;white-space:pre-line;">${report.narration}</div>` : ''}

  <!-- Footer -->
  <div class="report-footer">
    <div>Generated by NEP Workbench Platform · Report ID: ${report.reportId}</div>
    <div>© ${new Date().getFullYear()} NEP Workbench · Confidential</div>
  </div>

</div>
<script>
window.onload = function() {
  var gEl = document.getElementById('gradeChart');
  if (gEl) {
    new Chart(gEl, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(chartDistLabels)},
        datasets: [{ data: ${JSON.stringify(chartDistData)}, backgroundColor: ${JSON.stringify(chartDistColors)}, borderWidth: 2 }]
      },
      options: { responsive: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } } }
    });
  }
  var cEl = document.getElementById('classChart');
  if (cEl) {
    new Chart(cEl, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(chartClassLabels)},
        datasets: [{ label: 'Avg SPI', data: ${JSON.stringify(chartClassData)}, backgroundColor: ${JSON.stringify(chartClassColors)}, borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, scales: { x: { min: 0, max: 100, ticks: { callback: function(v){ return v; } } } }, plugins: { legend: { display: false } } }
    });
  }
};
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="NEP-Report-${report.reportId}.html"`);
    return res.send(html);

  } catch (error) {
    logger.error('Download report error:', error);
    res.status(500).json({ success: false, message: 'Error generating report download', error: error.message });
  }
};

/**
 * @desc    Get combined analytics for admin dashboard charts
 * @route   GET /api/admin/analytics
 * @access  Private (Admin)
 */
exports.getAnalytics = async (req, res) => {
  try {
    const school = await School.findById(req.user.userId);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const { period = 30 } = req.query;
    const periodDays = parseInt(period) || 30;
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const prevSince = new Date(Date.now() - 2 * periodDays * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      totalTeachers,
      totalChallenges,
      recentChallenges,
      prevChallenges,
      simAgg,
      gradeAgg,
      difficultyAgg,
      activityRaw
    ] = await Promise.all([
      Student.countDocuments({ schoolId: school.schoolId, active: true }),
      Teacher.countDocuments({ schoolId: school.schoolId, active: true }),
      Challenge.countDocuments({ schoolId: school.schoolId }),
      Challenge.countDocuments({ schoolId: school.schoolId, generatedAt: { $gte: since } }),
      Challenge.countDocuments({ schoolId: school.schoolId, generatedAt: { $gte: prevSince, $lt: since } }),
      Challenge.aggregate([
        { $match: { schoolId: school.schoolId } },
        { $group: { _id: '$simulationType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      Student.aggregate([
        { $match: { schoolId: school.schoolId, active: true } },
        { $group: { _id: '$class', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Challenge.aggregate([
        { $match: { schoolId: school.schoolId } },
        {
          $group: {
            _id: '$difficulty',
            total: { $sum: 1 },
            evaluated: { $sum: { $cond: [{ $eq: ['$status', 'evaluated'] }, 1, 0] } }
          }
        }
      ]),
      Activity.getDailyCount(school.schoolId, 7)
    ]);

    const activeUsers = totalStudents + totalTeachers;
    const growthRate = prevChallenges > 0
      ? Math.round(((recentChallenges - prevChallenges) / prevChallenges) * 100)
      : 0;

    const activityTrend = activityRaw.map(d => ({ date: d._id, users: d.count }));
    const topSimulations = simAgg.map(s => ({ name: s._id || 'General', count: s.count }));

    const subjectDistribution = {};
    simAgg.forEach(s => { subjectDistribution[s._id || 'Other'] = s.count; });

    const gradeDistribution = {};
    gradeAgg.forEach(g => { gradeDistribution[`Grade ${g._id}`] = g.count; });

    const totalEvaluated = difficultyAgg.reduce((sum, d) => sum + d.evaluated, 0);
    const successRate = totalChallenges > 0
      ? Math.round((totalEvaluated / totalChallenges) * 1000) / 10
      : 0;

    return res.json({
      success: true,
      data: {
        analytics: {
          activeUsers,
          simUsage: totalChallenges,
          avgSessionTime: 0,
          growthRate: Math.max(0, growthRate),
          activityTrend,
          topSimulations,
          subjectDistribution,
          gradeDistribution,
          performance: {
            avgResponseTime: 0,
            successRate,
            errorRate: Math.round((100 - successRate) * 10) / 10,
            uptime: 99.9
          },
          peakHours: []
        }
      }
    });

  } catch (error) {
    logger.error('Get analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
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