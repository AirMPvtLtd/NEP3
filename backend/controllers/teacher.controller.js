// controllers/teacher.controller.js
/**
 * TEACHER CONTROLLER - COMPLETE PRODUCTION VERSION
 * Teacher operations - fully integrated with all models
 * 
 * @module controllers/teacherController
 */

const {
  Teacher,
  Student,
  Challenge,
  ClassSection,
  Activity,
  NEPReport,
  School,
  HelpTicket
} = require('../models');
const logger = require('../utils/logger');

// ============================================================================
// PROFILE & DASHBOARD
// ============================================================================

/**
 * @desc    Get teacher profile
 * @route   GET /api/teacher/profile
 * @access  Private (Teacher)
 */
exports.getProfile = async (req, res) => {
  try {
    // 1️⃣ Fetch teacher by Mongo _id (JWT se)
    const teacher = await Teacher.findById(req.user.userId).lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // 2️⃣ Fetch school using BUSINESS schoolId (string)
    const school = await School.findOne(
      { schoolId: teacher.schoolId },
      'schoolId schoolName address city state'
    ).lean();

    // 3️⃣ Return combined response
    return res.json({
      success: true,
      data: {
        teacher,
        school
      }
    });

  } catch (error) {
    logger.error('Get teacher profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

/**
 * @desc    Update teacher profile
 * @route   PUT /api/teacher/profile
 * @access  Private (Teacher)
 */
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'phone',
      'dateOfBirth',
      'qualification',
      'experience',
      'specialization',
      'subjects',
      'bio',
      'profilePicture'
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
    
    const teacher = await Teacher.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'teacher',
      schoolId: teacher.schoolId,
      activityType: 'profile_updated',
      action: 'Teacher profile updated',
      metadata: { fields: Object.keys(updates) },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { teacher }
    });
    
  } catch (error) {
    logger.error('Update teacher profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

/**
 * @desc    Get teacher dashboard
 * @route   GET /api/teacher/dashboard
 * @access  Private (Teacher)
 */
exports.getDashboard = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Get statistics
    const totalStudents = await Student.countDocuments({
      teacherId: teacher.teacherId,
      active: true
    });
    
    const totalClasses = await ClassSection.countDocuments({
      teacherId: teacher.teacherId,
      active: true
    });
    
    const totalChallenges = await Challenge.countDocuments({
      teacherId: teacher.teacherId
    });
    
    // Get pending reviews
    const pendingReviews = await Challenge.countDocuments({
      teacherId: teacher.teacherId,
      status: 'submitted'
    });
    
    // Get recent challenges (last 7 days)
    const recentChallenges = await Challenge.find({
      teacherId: teacher.teacherId,
      generatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ generatedAt: -1 })
      .limit(10)
      .select('challengeId studentId simulationType difficulty status generatedAt results');
    
    // Get students needing attention (low performance)
    const studentsNeedingAttention = await Student.find({
      teacherId: teacher.teacherId,
      active: true,
      performanceIndex: { $lt: 50 }
    })
      .sort({ performanceIndex: 1 })
      .limit(5)
      .select('studentId name class section performanceIndex');
    
    // Get top performers
    const topPerformers = await Student.find({
      teacherId: teacher.teacherId,
      active: true
    })
      .sort({ performanceIndex: -1 })
      .limit(5)
      .select('studentId name class section performanceIndex');
    
    // Get help tickets
    const openTickets = await HelpTicket.countDocuments({
      teacherId: teacher.teacherId,
      status: 'open'
    });
    
    res.json({
      success: true,
      data: {
        teacher: {
          name: teacher.name,
          teacherId: teacher.teacherId,
          subjects: teacher.subjects,
          status: teacher.status
        },
        statistics: {
          totalStudents,
          totalClasses,
          totalChallenges,
          pendingReviews,
          openTickets
        },
        recentChallenges,
        studentsNeedingAttention,
        topPerformers
      }
    });
    
  } catch (error) {
    logger.error('Get teacher dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
};

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

/**
 * @desc    Get teacher's classes
 * @route   GET /api/teacher/classes
 * @access  Private (Teacher)
 */
exports.getClasses = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const classes = await ClassSection.find({
      teacherId: teacher.teacherId,
      active: true
    }).sort({ class: 1, section: 1 });
    
    // Get student count for each class
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          class: cls.class,
          section: cls.section,
          schoolId: cls.schoolId,
          active: true
        });
        
        const classObj = cls.toObject();
        classObj.studentCount = studentCount;
        return classObj;
      })
    );
    
    res.json({
      success: true,
      data: {
        classes: classesWithCounts,
        count: classesWithCounts.length
      }
    });
    
  } catch (error) {
    logger.error('Get teacher classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message
    });
  }
};

/**
 * @desc    Get class details
 * @route   GET /api/teacher/classes/:classSectionId
 * @access  Private (Teacher)
 */
exports.getClassDetails = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const classSection = await ClassSection.findOne({
      classSectionId: req.params.classSectionId
    });
    
    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    if (classSection.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class'
      });
    }
    
    // Get students in this class
    const students = await Student.find({
      class: classSection.class,
      section: classSection.section,
      schoolId: classSection.schoolId,
      active: true
    }).select('studentId name rollNumber performanceIndex stats');
    
    // Get class statistics
    const avgPerformance = students.length > 0
      ? students.reduce((sum, s) => sum + s.performanceIndex, 0) / students.length
      : 0;
    
    res.json({
      success: true,
      data: {
        class: classSection,
        students,
        statistics: {
          totalStudents: students.length,
          averagePerformance: avgPerformance
        }
      }
    });
    
  } catch (error) {
    logger.error('Get class details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class details',
      error: error.message
    });
  }
};

/**
 * @desc    Get students in a class
 * @route   GET /api/teacher/classes/:classSectionId/students
 * @access  Private (Teacher)
 */
exports.getClassStudents = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const classSection = await ClassSection.findOne({
      classSectionId: req.params.classSectionId
    });
    
    if (!classSection) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    if (classSection.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class'
      });
    }
    
    const students = await Student.find({
      class: classSection.class,
      section: classSection.section,
      schoolId: classSection.schoolId,
      active: true
    })
      .sort({ rollNumber: 1 })
      .select('studentId name rollNumber email phone performanceIndex grade stats');
    
    res.json({
      success: true,
      data: {
        students,
        count: students.length
      }
    });
    
  } catch (error) {
    logger.error('Get class students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
};

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

/**
 * @desc    Get all students under teacher
 * @route   GET /api/teacher/students
 * @access  Private (Teacher)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const { search, class: classNum, section, page = 1, limit = 50 } = req.query;
    
    const query = {
      teacherId: teacher.teacherId,
      active: true
    };
    
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
      .sort({ class: 1, section: 1, rollNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('studentId name class section rollNumber performanceIndex grade stats');
    
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
 * @desc    Get student details
 * @route   GET /api/teacher/students/:studentId
 * @access  Private (Teacher)
 */
exports.getStudentDetails = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: req.params.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }
    
    // Get recent challenges
    const recentChallenges = await Challenge.find({
      studentId: student.studentId
    })
      .sort({ generatedAt: -1 })
      .limit(10)
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt');
    
    res.json({
      success: true,
      data: {
        student,
        recentChallenges
      }
    });
    
  } catch (error) {
    logger.error('Get student details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student details',
      error: error.message
    });
  }
};

/**
 * @desc    Add new student
 * @route   POST /api/teacher/students
 * @access  Private (Teacher)
 */
exports.addStudent = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    // Check if student email already exists
    const existingStudent = await Student.findOne({
      email: req.body.email
    });
    
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: 'A student with this email already exists'
      });
    }
    
    // Create student
    const student = await Student.create({
      ...req.body,
      schoolId: teacher.schoolId,
      teacherId: teacher.teacherId
    });
    
    // Increment teacher student count
    await teacher.incrementStudentCount();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'teacher',
      schoolId: teacher.schoolId,
      activityType: 'other',
      action: 'Student added',
      metadata: {
        studentId: student.studentId,
        studentName: student.name
      },
      ipAddress: req.ip,
      success: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: { student }
    });
    
  } catch (error) {
    logger.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding student',
      error: error.message
    });
  }
};

/**
 * @desc    Update student
 * @route   PUT /api/teacher/students/:studentId
 * @access  Private (Teacher)
 */
exports.updateStudent = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: req.params.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }
    
    const allowedFields = [
      'name',
      'phone',
      'dateOfBirth',
      'rollNumber',
      'section',
      'parentContact'
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
    
    Object.assign(student, updates);
    await student.save();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'teacher',
      schoolId: teacher.schoolId,
      activityType: 'other',
      action: 'Student updated',
      metadata: {
        studentId: student.studentId,
        fields: Object.keys(updates)
      },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Student updated successfully',
      data: { student }
    });
    
  } catch (error) {
    logger.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message
    });
  }
};

/**
 * @desc    Get student performance
 * @route   GET /api/teacher/students/:studentId/performance
 * @access  Private (Teacher)
 */
exports.getStudentPerformance = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: req.params.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }
    
    // Get challenge history
    const challenges = await Challenge.find({
      studentId: student.studentId,
      status: 'evaluated'
    }).sort({ evaluatedAt: -1 });
    
    // Calculate performance metrics
    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;
    const averageScore = totalChallenges > 0
      ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
      : 0;
    
    // Performance trend (last 10 challenges)
    const performanceTrend = challenges.slice(0, 10).reverse().map(c => ({
      challengeId: c.challengeId,
      date: c.evaluatedAt,
      score: c.results?.totalScore || 0,
      simulationType: c.simulationType
    }));
    
    res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: student.name,
          performanceIndex: student.performanceIndex,
          grade: student.grade
        },
        performance: {
          totalChallenges,
          passedChallenges,
          passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
          averageScore,
          currentStreak: student.stats.dailyStreak,
          competencyScores: student.competencyScores
        },
        trend: performanceTrend
      }
    });
    
  } catch (error) {
    logger.error('Get student performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student performance',
      error: error.message
    });
  }
};

/**
 * @desc    Get student challenges
 * @route   GET /api/teacher/students/:studentId/challenges
 * @access  Private (Teacher)
 */
exports.getStudentChallenges = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: req.params.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }
    
    const { status, simulationType, limit = 50 } = req.query;
    
    const query = { studentId: student.studentId };
    
    if (status) {
      query.status = status;
    }
    
    if (simulationType) {
      query.simulationType = simulationType;
    }
    
    const challenges = await Challenge.find(query)
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        challenges,
        count: challenges.length
      }
    });
    
  } catch (error) {
    logger.error('Get student challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenges',
      error: error.message
    });
  }
};

// ============================================================================
// CHALLENGE MANAGEMENT
// ============================================================================

/**
 * @desc    Get all challenges
 * @route   GET /api/teacher/challenges
 * @access  Private (Teacher)
 */
exports.getAllChallenges = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const { status, simulationType, studentId, page = 1, limit = 50 } = req.query;
    
    const query = { teacherId: teacher.teacherId };
    
    if (status) {
      query.status = status;
    }
    
    if (simulationType) {
      query.simulationType = simulationType;
    }
    
    if (studentId) {
      query.studentId = studentId;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const challenges = await Challenge.find(query)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('challengeId studentId simulationType difficulty status results generatedAt evaluatedAt');
    
    const total = await Challenge.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get all challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Get challenge details
 * @route   GET /api/teacher/challenges/:challengeId
 * @access  Private (Teacher)
 */
exports.getChallengeDetails = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this challenge'
      });
    }
    
    // Get student info
    const student = await Student.findOne({
      studentId: challenge.studentId
    }).select('studentId name class section');
    
    res.json({
      success: true,
      data: {
        challenge,
        student
      }
    });
    
  } catch (error) {
    logger.error('Get challenge details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge details',
      error: error.message
    });
  }
};

/**
 * @desc    Get pending review challenges
 * @route   GET /api/teacher/challenges/pending-review
 * @access  Private (Teacher)
 */
exports.getPendingReviewChallenges = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const challenges = await Challenge.find({
      teacherId: teacher.teacherId,
      status: 'submitted'
    })
      .sort({ submittedAt: 1 }) // Oldest first
      .limit(50);
    
    // Get student info for each challenge
    const challengesWithStudents = await Promise.all(
      challenges.map(async (challenge) => {
        const student = await Student.findOne({
          studentId: challenge.studentId
        }).select('studentId name class section');
        
        return {
          ...challenge.toObject(),
          student
        };
      })
    );
    
    res.json({
      success: true,
      data: {
        challenges: challengesWithStudents,
        count: challengesWithStudents.length
      }
    });
    
  } catch (error) {
    logger.error('Get pending review challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Override challenge score
 * @route   PUT /api/teacher/challenges/:challengeId/override-score
 * @access  Private (Teacher)
 */
exports.overrideChallengeScore = async (req, res) => {
  try {
    const { score, feedback } = req.body;
    
    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: 'Valid score (0-100) is required'
      });
    }
    
    const teacher = await Teacher.findById(req.user.userId);
    
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this challenge'
      });
    }
    
    if (challenge.status !== 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Can only override score for evaluated challenges'
      });
    }
    
    // Override score
    await challenge.overrideScore(req.user.userId, score, feedback);
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'teacher',
      schoolId: teacher.schoolId,
      activityType: 'score_override',
      action: 'Challenge score overridden',
      metadata: {
        challengeId: challenge.challengeId,
        originalScore: challenge.results.totalScore,
        newScore: score
      },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Score overridden successfully',
      data: {
        challenge: {
          challengeId: challenge.challengeId,
          results: challenge.results
        }
      }
    });
    
  } catch (error) {
    logger.error('Override challenge score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error overriding score',
      error: error.message
    });
  }
};

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

/**
 * @desc    Get class performance report
 * @route   GET /api/teacher/reports/class-performance
 * @access  Private (Teacher)
 */
exports.getClassPerformanceReport = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    const { class: classNum, section } = req.query;
    
    if (!classNum || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class and section are required'
      });
    }
    
    // Get students in class
    const students = await Student.find({
      teacherId: teacher.teacherId,
      class: parseInt(classNum),
      section: section.toUpperCase(),
      active: true
    });
    
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found in this class'
      });
    }
    
    // Calculate class statistics
    const avgPerformance = students.reduce((sum, s) => sum + s.performanceIndex, 0) / students.length;
    const avgChallenges = students.reduce((sum, s) => sum + (s.stats.totalChallengesCompleted || 0), 0) / students.length;
    
    // Competency analysis
    const competencyScores = {};
    students.forEach(student => {
      Object.entries(student.competencyScores).forEach(([comp, score]) => {
        if (!competencyScores[comp]) {
          competencyScores[comp] = [];
        }
        competencyScores[comp].push(score);
      });
    });
    
    const avgCompetencies = {};
    Object.entries(competencyScores).forEach(([comp, scores]) => {
      avgCompetencies[comp] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });
    
    // Performance distribution
    const distribution = {
      excellent: students.filter(s => s.performanceIndex >= 90).length,
      good: students.filter(s => s.performanceIndex >= 70 && s.performanceIndex < 90).length,
      average: students.filter(s => s.performanceIndex >= 50 && s.performanceIndex < 70).length,
      needsImprovement: students.filter(s => s.performanceIndex < 50).length
    };
    
    res.json({
      success: true,
      data: {
        class: {
          class: parseInt(classNum),
          section: section.toUpperCase(),
          totalStudents: students.length
        },
        statistics: {
          averagePerformance: avgPerformance,
          averageChallengesCompleted: avgChallenges,
          distribution
        },
        competencies: avgCompetencies,
        students: students.map(s => ({
          studentId: s.studentId,
          name: s.name,
          performanceIndex: s.performanceIndex,
          grade: s.grade,
          totalChallenges: s.stats.totalChallengesCompleted
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get class performance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

/**
 * @desc    Get student report
 * @route   GET /api/teacher/reports/student/:studentId
 * @access  Private (Teacher)
 */
exports.getStudentReport = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: req.params.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this student'
      });
    }
    
    // Get NEP reports
    const nepReports = await NEPReport.find({
      studentId: student.studentId
    }).sort({ generatedAt: -1 }).limit(5);
    
    // Get challenge statistics
    const challenges = await Challenge.find({
      studentId: student.studentId,
      status: 'evaluated'
    });
    
    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;
    
    res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: student.name,
          class: student.class,
          section: student.section,
          performanceIndex: student.performanceIndex,
          grade: student.grade
        },
        performance: {
          totalChallenges,
          passedChallenges,
          passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
          currentStreak: student.stats.dailyStreak,
          bestStreak: student.stats.bestStreak
        },
        competencies: student.competencyScores,
        nepReports: nepReports.map(r => ({
          reportId: r.reportId,
          reportType: r.reportType,
          generatedAt: r.generatedAt
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

/**
 * @desc    Get analytics overview
 * @route   GET /api/teacher/analytics/overview
 * @access  Private (Teacher)
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    // Get overall statistics
    const totalStudents = await Student.countDocuments({
      teacherId: teacher.teacherId,
      active: true
    });
    
    const totalChallenges = await Challenge.countDocuments({
      teacherId: teacher.teacherId
    });
    
    // Get average performance
    const students = await Student.find({
      teacherId: teacher.teacherId,
      active: true
    });
    
    const avgPerformance = students.length > 0
      ? students.reduce((sum, s) => sum + s.performanceIndex, 0) / students.length
      : 0;
    
    // Get challenge statistics by status
    const challengeStats = await Challenge.aggregate([
      { $match: { teacherId: teacher.teacherId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = {};
    challengeStats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });
    
    // Get recent activity (last 30 days)
    const recentActivity = await Challenge.aggregate([
      {
        $match: {
          teacherId: teacher.teacherId,
          generatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalChallenges,
          averagePerformance: avgPerformance
        },
        challengesByStatus: statusCounts,
        recentActivity
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
 * @desc    Get competency analytics
 * @route   GET /api/teacher/analytics/competencies
 * @access  Private (Teacher)
 */
exports.getCompetencyAnalytics = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const students = await Student.find({
      teacherId: teacher.teacherId,
      active: true
    });
    
    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          competencies: {},
          message: 'No students found'
        }
      });
    }
    
    // Calculate average competency scores
    const competencyScores = {};
    students.forEach(student => {
      Object.entries(student.competencyScores).forEach(([comp, score]) => {
        if (!competencyScores[comp]) {
          competencyScores[comp] = {
            total: 0,
            count: 0,
            students: []
          };
        }
        competencyScores[comp].total += score;
        competencyScores[comp].count++;
        competencyScores[comp].students.push({
          studentId: student.studentId,
          name: student.name,
          score: score
        });
      });
    });
    
    const avgCompetencies = {};
    Object.entries(competencyScores).forEach(([comp, data]) => {
      avgCompetencies[comp] = {
        average: data.total / data.count,
        studentCount: data.count,
        topStudents: data.students
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
        weakStudents: data.students
          .sort((a, b) => a.score - b.score)
          .slice(0, 5)
      };
    });
    
    res.json({
      success: true,
      data: {
        competencies: avgCompetencies,
        totalStudents: students.length
      }
    });
    
  } catch (error) {
    logger.error('Get competency analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching competency analytics',
      error: error.message
    });
  }
};

// ============================================================================
// HELP TICKETS
// ============================================================================

/**
 * @desc    Get help tickets
 * @route   GET /api/teacher/help-tickets
 * @access  Private (Teacher)
 */
exports.getHelpTickets = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const { status, limit = 50 } = req.query;
    
    const query = { teacherId: teacher.teacherId };
    
    if (status) {
      query.status = status;
    }
    
    const tickets = await HelpTicket.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        tickets,
        count: tickets.length
      }
    });
    
  } catch (error) {
    logger.error('Get help tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching help tickets',
      error: error.message
    });
  }
};

/**
 * @desc    Respond to help ticket
 * @route   PUT /api/teacher/help-tickets/:ticketId/respond
 * @access  Private (Teacher)
 */
exports.respondToTicket = async (req, res) => {
  try {
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({
        success: false,
        message: 'Response is required'
      });
    }
    
    const teacher = await Teacher.findById(req.user.userId);
    
    const ticket = await HelpTicket.findOne({
      ticketId: req.params.ticketId
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    if (ticket.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this ticket'
      });
    }
    
    await ticket.respond(req.user.userId, response);
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'teacher',
      schoolId: teacher.schoolId,
      activityType: 'other',
      action: 'Help ticket response',
      metadata: { ticketId: ticket.ticketId },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Response added successfully',
      data: { ticket }
    });
    
  } catch (error) {
    logger.error('Respond to ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to ticket',
      error: error.message
    });
  }
};

/**
 * @desc    Resolve help ticket
 * @route   PUT /api/teacher/help-tickets/:ticketId/resolve
 * @access  Private (Teacher)
 */
exports.resolveTicket = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId);
    
    const ticket = await HelpTicket.findOne({
      ticketId: req.params.ticketId
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    if (ticket.teacherId !== teacher.teacherId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this ticket'
      });
    }
    
    await ticket.resolve();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'teacher',
      schoolId: teacher.schoolId,
      activityType: 'other',
      action: 'Help ticket resolved',
      metadata: { ticketId: ticket.ticketId },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Ticket resolved successfully',
      data: { ticket }
    });
    
  } catch (error) {
    logger.error('Resolve ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving ticket',
      error: error.message
    });
  }
};

module.exports = exports;