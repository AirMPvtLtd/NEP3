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
  Ledger,
  HelpTicket
} = require('../models');
const logger = require('../utils/logger');

const SPIRecord = require('../models/SPIRecord');
const { callMistralAPI } = require('../services/mistral.service');
const QuestionBank = require('../models/QuestionBank');
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
// controllers/teacher.controller.js

exports.getDashboard = async (req, res) => {
  try {
    // ------------------------------------------------------------
    // 1️⃣ AUTH TEACHER
    // ------------------------------------------------------------
    const teacher = await Teacher.findById(req.user.userId).lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacherId = teacher.teacherId;

    // ------------------------------------------------------------
    // 2️⃣ BASIC STATS
    // ------------------------------------------------------------
    const [
      totalStudents,
      totalClasses,
      totalChallenges,
      pendingReviews,
      openTickets
    ] = await Promise.all([
      Student.countDocuments({ teacherId, active: true }),
      ClassSection.countDocuments({ teacherId, active: true }),
      Challenge.countDocuments({ teacherId }),
      Challenge.countDocuments({ teacherId, status: 'submitted' }),
      HelpTicket.countDocuments({ teacherId, status: 'open' })
    ]);

    // ------------------------------------------------------------
    // 3️⃣ RECENT CHALLENGES (LAST 7 DAYS)
    // ------------------------------------------------------------
    const recentChallenges = await Challenge.find({
      teacherId,
      generatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ generatedAt: -1 })
      .limit(10)
      .select('challengeId studentId simulationType difficulty status generatedAt')
      .lean();

    // ------------------------------------------------------------
    // 4️⃣ LOAD SPI RECORDS (CANONICAL PERFORMANCE SOURCE)
    // ------------------------------------------------------------
    const spiRecords = await SPIRecord.find().lean();

    const spiMap = new Map();
    spiRecords.forEach(r => {
      spiMap.set(r.studentId, r);
    });

    const allStudentIds = Array.from(spiMap.keys());

    // ------------------------------------------------------------
    // 5️⃣ LOAD STUDENTS FOR THIS TEACHER
    // ------------------------------------------------------------
    const students = await Student.find({
      teacherId,
      active: true,
      studentId: { $in: allStudentIds }
    })
      .select('studentId name class section')
      .lean();

    // ------------------------------------------------------------
    // 6️⃣ MERGE STUDENT + SPI
    // ------------------------------------------------------------
    const enrichedStudents = students.map(s => {
      const spi = spiMap.get(s.studentId);
      return {
        ...s,
        performanceIndex: spi?.spi ?? 0,
        grade: spi?.grade ?? 'F'
      };
    });

    // ------------------------------------------------------------
    // 7️⃣ DERIVE TOP & WEAK STUDENTS
    // ------------------------------------------------------------
    const studentsNeedingAttention = enrichedStudents
      .filter(s => s.performanceIndex < 50)
      .sort((a, b) => a.performanceIndex - b.performanceIndex)
      .slice(0, 5);

    const topPerformers = enrichedStudents
      .filter(s => s.performanceIndex >= 70)
      .sort((a, b) => b.performanceIndex - a.performanceIndex)
      .slice(0, 5);

    // ------------------------------------------------------------
    // 8️⃣ RESPONSE
    // ------------------------------------------------------------
    return res.json({
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
    return res.status(500).json({
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
/**
 * GET TEACHER CLASSES
 * ------------------------------------------------------------------
 * Source of truth:
 * - Student collection for student counts
 * - ClassSection only for structure/meta
 *
 * Never trust ClassSection.stats (stale cache)
 */

exports.getClasses = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId).lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacherId = teacher.teacherId;

    // ---------------------------------------------------------------
    // FETCH CLASSES
    // ---------------------------------------------------------------
    const classes = await ClassSection.find({
      teacherId,
      active: true
    })
      .sort({ class: 1, section: 1 })
      .lean();

    // ---------------------------------------------------------------
    // ENRICH WITH LIVE STUDENT COUNTS (SOURCE OF TRUTH)
    // ---------------------------------------------------------------
    const classesWithCounts = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await Student.countDocuments({
          class: cls.class,
          section: cls.section,
          schoolId: cls.schoolId,
          active: true
        });

        return {
          ...cls,

          // 🔒 OVERRIDE STALE STATS (CRITICAL FIX)
          stats: {
            totalStudents: studentCount,
            activeStudents: studentCount,
            averagePerformance: cls.stats?.averagePerformance ?? 0,
            totalChallenges: cls.stats?.totalChallenges ?? 0
          },

          // Explicit field for frontend
          studentCount,

          // Derived helpers (UI-safe)
          fullName: `Class ${cls.class}${cls.section} - ${cls.subject}`,
          isFull: cls.capacity ? studentCount >= cls.capacity : false
        };
      })
    );

    // ---------------------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------------------
    return res.json({
      success: true,
      data: {
        classes: classesWithCounts,
        count: classesWithCounts.length
      }
    });

  } catch (error) {
    logger.error('Get teacher classes error:', error);
    return res.status(500).json({
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
    const teacher = await Teacher.findById(req.user.userId).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const classSection = await ClassSection.findOne({
      classSectionId: req.params.classSectionId
    }).lean();

    if (!classSection) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    if (classSection.teacherId !== teacher.teacherId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // --------------------------------------------------
    // Students
    // --------------------------------------------------
    const students = await Student.find({
      class: classSection.class,
      section: classSection.section,
      schoolId: classSection.schoolId,
      active: true
    })
      .select('studentId name rollNumber stats')
      .lean();

    const studentIds = students.map(s => s.studentId);

    // --------------------------------------------------
    // SPI RECORDS (SOURCE OF TRUTH)
    // --------------------------------------------------
    const spiRecords = await SPIRecord.find({
      studentId: { $in: studentIds }
    })
      .select('studentId spi grade')
      .lean();

    const spiMap = {};
    spiRecords.forEach(r => {
      spiMap[r.studentId] = r;
    });

    // --------------------------------------------------
    // Merge SPI into students
    // --------------------------------------------------
    const enrichedStudents = students.map(s => {
      const spi = spiMap[s.studentId];
      return {
        ...s,
        performanceIndex: spi?.spi ?? null,
        grade: spi?.grade ?? 'N/A'
      };
    });

    // --------------------------------------------------
    // Class statistics
    // --------------------------------------------------
    const validSPI = enrichedStudents
      .map(s => s.performanceIndex)
      .filter(v => typeof v === 'number');

    const averagePerformance =
      validSPI.length > 0
        ? Number((validSPI.reduce((a, b) => a + b, 0) / validSPI.length).toFixed(2))
        : null;

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------
    return res.json({
      success: true,
      data: {
        class: classSection,
        students: enrichedStudents,
        statistics: {
          totalStudents: enrichedStudents.length,
          averagePerformance
        }
      }
    });

  } catch (error) {
    logger.error('Get class details error:', error);
    return res.status(500).json({
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
    const teacher = await Teacher.findById(req.user.userId).lean();

    const student = await Student.findOne({
      studentId: req.params.studentId
    }).lean();

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

    // 🔹 Fetch SPI (authoritative)
    const spiRecord = await SPIRecord.findOne({
      studentId: student.studentId
    })
      .sort({ calculatedAt: -1 })
      .lean();

    // 🔹 Recent challenges
    const recentChallenges = await Challenge.find({
      studentId: student.studentId
    })
      .sort({ generatedAt: -1 })
      .limit(10)
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt')
      .lean();

    return res.json({
      success: true,
      data: {
        student: {
          ...student,
          performanceIndex: spiRecord?.spi ?? null,
          grade: spiRecord?.grade ?? 'NA',
          learningState: spiRecord?.learning_state ?? 'uninitialized'
        },
        recentChallenges
      }
    });

  } catch (error) {
    logger.error('Get student details error:', error);
    return res.status(500).json({
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

    // Check school student limit before creating
    const school = await School.findOne({ schoolId: teacher.schoolId });
    if (!school || !school.canAddStudent()) {
      const limit = school ? school.limits.maxStudents : 50;
      return res.status(403).json({
        success: false,
        code: 'STUDENT_LIMIT_REACHED',
        message: `Student limit of ${limit} reached for your current plan.`,
        upgradeUrl: '/contact',
        upgradeMessage: 'Contact us to upgrade your plan.',
      });
    }

    // Create student
    const student = await Student.create({
      ...req.body,
      schoolId: teacher.schoolId,
      teacherId: teacher.teacherId
    });

    // Increment school and teacher student counts
    await school.incrementStudentCount();
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
    const teacher = await Teacher.findById(req.user.userId).lean();

    const student = await Student.findOne({
      studentId: req.params.studentId
    }).lean();

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

    // --------------------------------------------------
    // ✅ SPI = SINGLE SOURCE OF TRUTH
    // --------------------------------------------------
    const latestSPI = await SPIRecord.findOne({
      studentId: student.studentId
    })
      .sort({ calculatedAt: -1 })
      .lean();

    // --------------------------------------------------
    // CHALLENGE HISTORY
    // --------------------------------------------------
    const challenges = await Challenge.find({
      studentId: student.studentId,
      status: 'evaluated'
    })
      .sort({ evaluatedAt: -1 })
      .lean();

    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;

    const averageScore =
      totalChallenges > 0
        ? challenges.reduce(
            (sum, c) => sum + (c.results?.totalScore || 0),
            0
          ) / totalChallenges
        : 0;

    // --------------------------------------------------
    // PERFORMANCE TREND (last 10)
    // --------------------------------------------------
    const performanceTrend = challenges
      .slice(0, 10)
      .reverse()
      .map(c => ({
        challengeId: c.challengeId,
        date: c.evaluatedAt,
        score: c.results?.totalScore || 0,
        simulationType: c.simulationType
      }));

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------
    return res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: student.name,
          spi: latestSPI?.spi ?? null,
          grade: latestSPI?.grade ?? 'NA'
        },
        performance: {
          totalChallenges,
          passedChallenges,
          passRate:
            totalChallenges > 0
              ? (passedChallenges / totalChallenges) * 100
              : 0,
          averageScore,
          currentStreak: student.stats?.dailyStreak || 0,
          competencyScores: student.competencyScores // 🔒 stable for now
        },
        trend: performanceTrend
      }
    });

  } catch (error) {
    logger.error('Get student performance error:', error);
    return res.status(500).json({
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
// controllers/teacher.controller.js

exports.getClassPerformanceReport = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    const { class: classNum, section, period } = req.query;

    if (!classNum || !section) {
      return res.status(400).json({
        success: false,
        message: 'Class and section are required'
      });
    }

    // ----------------------------------------------------
    // PERIOD FILTER
    // ----------------------------------------------------
    let fromDate = null;
    if (period === 'weekly') {
      fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      fromDate = new Date();
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    }

    // ----------------------------------------------------
    // 1️⃣ STUDENT ROSTER (IDENTITY ONLY)
    // ----------------------------------------------------
    const students = await Student.find({
      teacherId: teacher.teacherId,
      class: parseInt(classNum),
      section: section.toUpperCase(),
      active: true
    })
      .select('studentId name')
      .lean();

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: 'No students found in this class'
      });
    }

    const studentIds = students.map(s => s.studentId);

    // ----------------------------------------------------
    // 2️⃣ LATEST SPI SNAPSHOT (AUTHORITATIVE)
    // ----------------------------------------------------
    const spiRecords = await SPIRecord.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      { $sort: { calculatedAt: -1 } },
      {
        $group: {
          _id: '$studentId',
          spi: { $first: '$spi' },
          grade: { $first: '$grade' }
        }
      }
    ]);

    const spiMap = {};
    spiRecords.forEach(r => {
      spiMap[r._id] = r;
    });

    // ----------------------------------------------------
    // 3️⃣ LEDGER → COMPETENCY AGGREGATION
    // ----------------------------------------------------
    const ledgerMatch = {
      studentId: { $in: studentIds },
      eventType: 'challenge_evaluated',
      status: 'confirmed'
    };

    if (fromDate) {
      ledgerMatch.createdAt = { $gte: fromDate };
    }

    const ledgerAgg = await Ledger.aggregate([
      { $match: ledgerMatch },
      { $unwind: '$data.competenciesAssessed' },
      {
        $group: {
          _id: '$data.competenciesAssessed.competency',
          avgScore: { $avg: '$data.competenciesAssessed.score' }
        }
      }
    ]);

    const avgCompetencies = {};
    ledgerAgg.forEach(c => {
      avgCompetencies[c._id] = Math.round(c.avgScore);
    });

    // ----------------------------------------------------
    // 4️⃣ DISTRIBUTION + AVERAGE SPI
    // ----------------------------------------------------
    let spiSum = 0;
    const distribution = {
      excellent: 0,
      good: 0,
      average: 0,
      needsImprovement: 0
    };

    students.forEach(s => {
      const spi = spiMap[s.studentId]?.spi ?? 0;
      spiSum += spi;

      if (spi >= 90) distribution.excellent++;
      else if (spi >= 70) distribution.good++;
      else if (spi >= 50) distribution.average++;
      else distribution.needsImprovement++;
    });

    const avgPerformance = students.length
      ? Math.round(spiSum / students.length)
      : 0;

    // ----------------------------------------------------
    // 5️⃣ FINAL RESPONSE (SORTED)
    // ----------------------------------------------------
    const studentsPayload = students
      .map(s => ({
        studentId: s.studentId,
        name: s.name,
        performanceIndex: spiMap[s.studentId]?.spi ?? 0,
        grade: spiMap[s.studentId]?.grade ?? 'F'
      }))
      .sort((a, b) => b.performanceIndex - a.performanceIndex);

    return res.json({
      success: true,
      data: {
        class: {
          class: parseInt(classNum),
          section: section.toUpperCase(),
          totalStudents: students.length
        },
        statistics: {
          averagePerformance: avgPerformance,
          distribution
        },
        competencies: avgCompetencies,
        students: studentsPayload
      }
    });

  } catch (error) {
    logger.error('Get class performance report error:', error);
    return res.status(500).json({
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
          passRate: totalChallenges > 0 ? Math.round(passedChallenges / totalChallenges * 100) : 0,
          currentStreak: student.stats?.dailyStreak || 0,
          weeklyActivity: student.stats?.weeklyActivity || 0,
          averageScore: student.stats?.averageChallengeScore || 0
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
// controllers/teacher.controller.js


exports.getAnalyticsOverview = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.userId).lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacherId = teacher.teacherId;

    // --------------------------------------------------
    // 1️⃣ TOTAL STUDENTS
    // --------------------------------------------------
    const students = await Student.find({
      teacherId,
      active: true
    }).select('studentId').lean();

    const totalStudents = students.length;
    const studentIds = students.map(s => s.studentId);

    // --------------------------------------------------
    // 2️⃣ TOTAL CHALLENGES
    // --------------------------------------------------
    const totalChallenges = await Challenge.countDocuments({ teacherId });

    // --------------------------------------------------
    // 3️⃣ AVERAGE PERFORMANCE (FROM SPI RECORDS ✅)
    // --------------------------------------------------
    let averagePerformance = 0;

    if (studentIds.length > 0) {
      const spiAgg = await SPIRecord.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        { $sort: { calculatedAt: -1 } },
        {
          $group: {
            _id: '$studentId',
            spi: { $first: '$spi' }
          }
        }
      ]);

      if (spiAgg.length > 0) {
        const spiSum = spiAgg.reduce((sum, r) => sum + (r.spi || 0), 0);
        averagePerformance = Math.round(spiSum / spiAgg.length);
      }
    }

    // --------------------------------------------------
    // 4️⃣ CHALLENGES BY STATUS
    // --------------------------------------------------
    const challengeStats = await Challenge.aggregate([
      { $match: { teacherId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const challengesByStatus = {};
    challengeStats.forEach(stat => {
      challengesByStatus[stat._id] = stat.count;
    });

    // --------------------------------------------------
    // 5️⃣ RECENT ACTIVITY (LAST 30 DAYS)
    // --------------------------------------------------
    const recentActivity = await Challenge.aggregate([
      {
        $match: {
          teacherId,
          generatedAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$generatedAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // --------------------------------------------------
    // 6️⃣ SIMULATION USAGE (TOP 6 SIMULATION TYPES)
    // --------------------------------------------------
    const simUsageAgg = await Challenge.aggregate([
      { $match: { teacherId } },
      { $group: { _id: '$simulationType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);
    const simulationUsage = simUsageAgg.map(s => ({
      name: s._id || 'General',
      count: s.count
    }));

    // --------------------------------------------------
    // 7️⃣ DIFFICULTY SUCCESS RATES
    // --------------------------------------------------
    const diffAgg = await Challenge.aggregate([
      { $match: { teacherId } },
      {
        $group: {
          _id: '$difficulty',
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$results.passed', true] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const difficultyStats = diffAgg.map(d => ({
      difficulty: d._id || 'medium',
      total: d.total,
      passed: d.passed,
      successRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0
    }));

    // --------------------------------------------------
    // 8️⃣ PERFORMANCE DISTRIBUTION (SPI BUCKETS)
    // --------------------------------------------------
    let performanceDistribution = [
      { range: 'Needs Help (0-49)', count: 0 },
      { range: 'Average (50-69)', count: 0 },
      { range: 'Good (70-89)', count: 0 },
      { range: 'Excellent (90-100)', count: 0 }
    ];

    if (studentIds.length > 0) {
      const latestSPIs = await SPIRecord.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        { $sort: { calculatedAt: -1 } },
        { $group: { _id: '$studentId', spi: { $first: '$spi' } } }
      ]);

      latestSPIs.forEach(r => {
        const spi = r.spi || 0;
        if (spi < 50) performanceDistribution[0].count++;
        else if (spi < 70) performanceDistribution[1].count++;
        else if (spi < 90) performanceDistribution[2].count++;
        else performanceDistribution[3].count++;
      });
    }

    // --------------------------------------------------
    // 9️⃣ RESPONSE
    // --------------------------------------------------
    return res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalChallenges,
          averagePerformance
        },
        challengesByStatus,
        recentActivity,
        simulationUsage,
        difficultyStats,
        performanceDistribution
      }
    });

  } catch (error) {
    logger.error('Get analytics overview error:', error);
    return res.status(500).json({
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
// controllers/teacher.controller.js

exports.getCompetencyAnalytics = async (req, res) => {
  try {
    // ------------------------------------------------------------------
    // 1️⃣ AUTH TEACHER
    // ------------------------------------------------------------------
    const teacher = await Teacher.findById(req.user.userId).lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // ------------------------------------------------------------------
    // 2️⃣ STUDENTS UNDER TEACHER
    // ------------------------------------------------------------------
    const students = await Student.find({
      teacherId: teacher.teacherId,
      active: true
    })
      .select('studentId name')
      .lean();

    if (!students.length) {
      return res.json({
        success: true,
        data: {
          competencies: {},
          totalStudents: 0
        }
      });
    }

    const studentIds = students.map(s => s.studentId);
    const studentMap = Object.fromEntries(
      students.map(s => [s.studentId, s.name])
    );

    // ------------------------------------------------------------------
    // 3️⃣ LEDGER → COMPETENCY AGGREGATION (REAL FIX)
    // ------------------------------------------------------------------
    const ledgerAgg = await Ledger.aggregate([
      {
        $match: {
          studentId: { $in: studentIds },
          eventType: Ledger.EVENT_TYPES.CHALLENGE_EVALUATED,
          status: 'confirmed'
        }
      },
      { $unwind: '$data.competenciesAssessed' },
      {
        $group: {
          _id: {
            competency: '$data.competenciesAssessed.competency',
            studentId: '$studentId'
          },
          avgScore: {
            $avg: '$data.competenciesAssessed.score'
          }
        }
      }
    ]);

    // ------------------------------------------------------------------
    // 4️⃣ NORMALIZE INTO COMPETENCY OBJECT
    // ------------------------------------------------------------------
    const competencyBuckets = {};

    ledgerAgg.forEach(row => {
      const { competency, studentId } = row._id;

      if (!competencyBuckets[competency]) {
        competencyBuckets[competency] = [];
      }

      competencyBuckets[competency].push({
        studentId,
        name: studentMap[studentId] || 'Unknown',
        score: Math.round(row.avgScore)
      });
    });

    // ------------------------------------------------------------------
    // 5️⃣ BUILD FINAL RESPONSE STRUCTURE
    // ------------------------------------------------------------------
    const competencies = {};

    Object.entries(competencyBuckets).forEach(([competency, records]) => {
      const avg =
        records.reduce((sum, r) => sum + r.score, 0) / records.length;

      const sorted = [...records].sort((a, b) => b.score - a.score);

      competencies[competency] = {
        average: Math.round(avg),
        studentCount: records.length,
        topStudents: sorted.slice(0, 3),
        weakStudents: sorted.slice(-3).reverse()
      };
    });

    // ------------------------------------------------------------------
    // 6️⃣ RESPONSE
    // ------------------------------------------------------------------
    return res.json({
      success: true,
      data: {
        competencies,
        totalStudents: students.length
      }
    });

  } catch (error) {
    logger.error('Get competency analytics error:', error);
    return res.status(500).json({
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

// ============================================================================
// TEACHING STUDIO
// ============================================================================

exports.generateSmartNotes = async (req, res) => {
  try {
    const { subject, grade, topic, format } = req.body;
    if (!subject || !grade || !topic) {
      return res.status(400).json({ success: false, message: 'subject, grade, and topic are required' });
    }

    const formatInstructions = {
      detailed: 'Write comprehensive, detailed notes with full explanations for each section. Include rich content, multiple examples, and thorough coverage of each concept.',
      summary: 'Write concise bullet-point summary notes. Each section should have short, crisp points (1-2 sentences each). Keep content minimal and easy to revise quickly.',
      vocational: 'Focus on real-world industry and vocational applications of the topic. Emphasize practical skills, workplace relevance, career connections, and hands-on examples aligned to NEP 2020 vocational education.',
      mindmap: 'Organise content as a mind-map-friendly outline. Each section heading is a main branch; content is a comma-separated list of short sub-nodes or keywords (not full sentences).'
    };

    const formatGuide = formatInstructions[format] || formatInstructions.detailed;

    const messages = [
      {
        role: 'system',
        content: 'You are an expert Indian school teacher content generator following NEP 2020. Return ONLY valid JSON — no markdown, no prose, no code fences.'
      },
      {
        role: 'user',
        content: `Generate lesson notes for a Class ${grade} ${subject} lesson on "${topic}".

Format style: "${format || 'detailed'}" — ${formatGuide}

Return JSON exactly matching this schema: { "title": string, "objectives": [string], "sections": [{ "heading": string, "content": string }], "formulas": [string], "applications": [string], "misconceptions": [string] }`
      }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 1500, operation: 'teaching_studio_notes' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let notes;
    try {
      const raw = mistralRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
      notes = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ success: false, message: 'AI response malformed' });
    }

    return res.json({ success: true, notes });
  } catch (error) {
    logger.error('generateSmartNotes error:', error);
    return res.status(500).json({ success: false, message: 'Error generating smart notes', error: error.message });
  }
};

exports.generateIndustryScenario = async (req, res) => {
  try {
    const { industry, difficulty, duration } = req.body;
    if (!industry || !difficulty || !duration) {
      return res.status(400).json({ success: false, message: 'industry, difficulty, and duration are required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert workplace scenario designer for NEP 2020 vocational education. Return ONLY valid JSON — no markdown, no prose, no code fences.'
      },
      {
        role: 'user',
        content: `Create a realistic ${difficulty} difficulty workplace scenario for the ${industry} industry, designed to take ${duration} minutes. Return JSON matching: { "title": string, "role": string, "brief": string, "tasks": [{ "id": number, "title": string, "description": string }], "learningObjectives": [string], "evaluationCriteria": [string] }`
      }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 1000, operation: 'teaching_studio_scenario' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let scenario;
    try {
      const raw = mistralRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
      scenario = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ success: false, message: 'AI response malformed' });
    }

    return res.json({ success: true, scenario });
  } catch (error) {
    logger.error('generateIndustryScenario error:', error);
    return res.status(500).json({ success: false, message: 'Error generating scenario', error: error.message });
  }
};

exports.generateQuestion = async (req, res) => {
  try {
    const { subject, grade, questionType, topic, difficulty, count } = req.body;
    if (!subject || !grade || !questionType) {
      return res.status(400).json({ success: false, message: 'subject, grade, and questionType are required' });
    }

    const numQuestions = Math.min(parseInt(count) || 1, 5);
    const topicStr = topic ? ` on "${topic}"` : '';
    const difficultyStr = difficulty ? ` at ${difficulty} difficulty` : '';

    const messages = [
      {
        role: 'system',
        content: 'You are an expert Indian school examiner following NEP 2020 and Bloom\'s taxonomy. Return ONLY valid JSON — no markdown, no prose, no code fences.'
      },
      {
        role: 'user',
        content: `Generate ${numQuestions} ${questionType} question(s) for Class ${grade} ${subject}${topicStr}${difficultyStr}. Return JSON matching: { "questions": [{ "questionText": string, "options": [string], "correctAnswer": string, "explanation": string, "marks": number, "bloomsLevel": string }] }. For non-MCQ types, options should be an empty array.`
      }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 800, operation: 'teaching_studio_questions' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let parsed;
    try {
      const raw = mistralRes.content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ success: false, message: 'AI response malformed' });
    }

    return res.json({ success: true, questions: parsed.questions || [] });
  } catch (error) {
    logger.error('generateQuestion error:', error);
    return res.status(500).json({ success: false, message: 'Error generating question', error: error.message });
  }
};

exports.saveQuestion = async (req, res) => {
  try {
    const { questionText, questionType, subject, grade, topic, options, correctAnswer, marks, difficulty, bloomsLevel, aiGenerated } = req.body;
    if (!questionText || !questionType || !subject || !grade) {
      return res.status(400).json({ success: false, message: 'questionText, questionType, subject, and grade are required' });
    }

    const teacherId = req.user.userId;
    const schoolId = req.user.schoolId;

    const question = await QuestionBank.create({
      teacherId,
      schoolId,
      subject,
      grade,
      topic,
      questionType,
      questionText,
      options: options || [],
      correctAnswer,
      marks: marks || 1,
      difficulty: difficulty || 'medium',
      bloomsLevel,
      aiGenerated: aiGenerated || false
    });

    return res.json({ success: true, question });
  } catch (error) {
    logger.error('saveQuestion error:', error);
    return res.status(500).json({ success: false, message: 'Error saving question', error: error.message });
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const filter = { teacherId };

    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.grade) filter.grade = req.query.grade;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    const questions = await QuestionBank.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, questions });
  } catch (error) {
    logger.error('getQuestions error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching questions', error: error.message });
  }
};

exports.generateSimulator = async (req, res) => {
  try {
    const { topic, grade, subject, simulationType, interactionType, visualStyle, variables } = req.body;
    if (!topic || !grade || !subject) {
      return res.status(400).json({ success: false, message: 'topic, grade, and subject are required' });
    }

    // Per-type structural instructions
    const typeInstructions = {
      interactive: `Build an INTERACTIVE DIAGRAM simulator:
- Render the core concept visually using SVG or Canvas (e.g. ray diagrams, force vectors, cell diagrams)
- Labelled parts that highlight or animate on hover/click
- Sliders or number inputs to change key parameters and see the diagram update live
- Display calculated values (e.g. angles, forces, voltages) updating in real time`,

      virtuallab: `Build a VIRTUAL LAB simulator:
- Simulate a real laboratory experiment for the topic (e.g. titration, inclined plane, circuit builder)
- Include a "lab bench" layout with apparatus drawn via SVG/Canvas
- Step-by-step experiment flow: setup → run → observe → record
- Show measurable outputs (readings, graphs, tables) that change as user adjusts variables
- Include a Results section that populates after the experiment runs`,

      stepprocess: `Build a STEP-BY-STEP PROCESS simulator:
- Break the topic into 4–7 clearly numbered steps
- Show one step at a time with a large visual (SVG/Canvas) and explanation text
- "Previous" and "Next" navigation buttons to move through steps
- Progress bar at the top showing current step
- Each step must include an interactive element (click to reveal, fill-in, or toggle) before proceeding`,

      realscenario: `Build a REAL-WORLD SCENARIO simulator:
- Present a realistic workplace or daily-life scenario that applies the topic (NEP 2020 vocational link)
- Give the student a role (e.g. engineer, doctor, scientist) and a problem to solve
- Provide input controls (dropdowns, sliders, text inputs) to make decisions
- Show consequence of each decision visually and numerically
- End with a score or evaluation summary based on choices made`
    };

    // Interaction style additions
    const interactionInstructions = {
      dragdrop: 'Use drag-and-drop interactions (mousedown/mousemove/mouseup on SVG/Canvas elements) as the primary control mechanism.',
      clickreveal: 'Use click-to-reveal interactions — clicking elements uncovers labels, values, or next steps.',
      sliders: 'Use HTML range sliders as the primary controls. Every slider change must instantly update visuals and output values.',
      stepnav: 'Use Previous/Next buttons for step navigation as the primary interaction. No free-form input.'
    };

    // Visual style additions
    const visualInstructions = {
      minimal: 'Keep visuals minimal and clean — simple shapes, monochrome lines, maximum whitespace. No decorative elements.',
      detailed: 'Use detailed, richly labelled visuals with colour-coded components, legends, and annotations.',
      animated: 'Add CSS or JS animations — moving particles, flowing arrows, pulsing elements — to make the concept visually dynamic.',
      diagrammatic: 'Use clean diagrammatic style: technical drawing conventions, precise labels, dimension lines, and scientific notation.'
    };

    const variablesHint = variables
      ? `The key variables/parameters to include are: ${variables}.`
      : '';

    const typeGuide        = typeInstructions[simulationType]  || typeInstructions.interactive;
    const interactionGuide = interactionInstructions[interactionType] || '';
    const visualGuide      = visualInstructions[visualStyle]   || '';

    const messages = [
      {
        role: 'system',
        content: 'You are an expert educational simulation developer. Output ONLY raw HTML — no markdown, no code fences, no explanation. The HTML must be a complete self-contained page.'
      },
      {
        role: 'user',
        content: `Create a complete interactive HTML simulator for Class ${grade} ${subject} topic: "${topic}".

SIMULATION TYPE — follow this strictly:
${typeGuide}

INTERACTION STYLE:
${interactionGuide}

VISUAL STYLE:
${visualGuide}

${variablesHint}

UNIVERSAL REQUIREMENTS (apply to all types):
- Full HTML page with <html>, <head>, <body> tags
- Dark background (#1e1e1e), text color #ffffff
- Inline <style> and <script> only — no external CDN, no libraries
- Vanilla JS only
- Real scientific/mathematical behaviour aligned to NEP 2020
- Blue/cyan accent colours (#007acc / #00d4ff)
- Responsive layout that fills the viewport height
- Output ONLY the raw HTML — no markdown, no explanation`
      }
    ];

    let mistralRes;
    try {
      mistralRes = await callMistralAPI({ messages, maxTokens: 3000, operation: 'teaching_studio_simulator' });
    } catch (err) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    let htmlContent = mistralRes.content.trim();
    // Strip any accidental markdown fences
    htmlContent = htmlContent.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

    return res.json({ success: true, htmlContent });
  } catch (error) {
    logger.error('generateSimulator error:', error);
    return res.status(500).json({ success: false, message: 'Error generating simulator', error: error.message });
  }
};

module.exports = exports;