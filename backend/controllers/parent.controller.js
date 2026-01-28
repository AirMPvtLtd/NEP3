// controllers/parent.controller.js
/**
 * PARENT CONTROLLER - COMPLETE PRODUCTION VERSION
 * Parent operations - fully integrated with all models
 * 
 * @module controllers/parentController
 */

const {
  Parent,
  Student,
  Teacher,
  Challenge,
  NEPReport,
  Activity,
  HelpTicket
} = require('../models');
const logger = require('../utils/logger');
const School = require('../models/School');

// ============================================================================
// PROFILE & DASHBOARD
// ============================================================================

/**
 * @desc    Get parent profile
 * @route   GET /api/parent/profile
 * @access  Private (Parent)
 */
exports.getProfile = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId).lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // ✅ IMPORTANT FIX: use findOne({ studentId })
    const student = await Student.findOne({
      studentId: parent.studentId
    })
    .select('studentId name class section schoolId')
    .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Linked student not found'
      });
    }

    return res.json({
      success: true,
      data: {
        parent,
        student
      }
    });

  } catch (error) {
    logger.error('Get parent profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parent profile'
    });
  }
};


/**
 * @desc    Update parent profile
 * @route   PUT /api/parent/profile
 * @access  Private (Parent)
 */
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'phone',
      'email',
      'occupation',
      'address',
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
    
    const parent = await Parent.findByIdAndUpdate(
      req.user.userId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'parent',
      schoolId: parent.schoolId,
      activityType: 'profile_updated',
      action: 'Parent profile updated',
      metadata: { fields: Object.keys(updates) },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { parent }
    });
    
  } catch (error) {
    logger.error('Update parent profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

/**
 * @desc    Get parent dashboard
 * @route   GET /api/parent/dashboard
 * @access  Private (Parent)
 */
exports.getDashboard = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }
    
    // Get student (child) information
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get teacher information
    const teacher = await Teacher.findOne({
      teacherId: student.teacherId
    }).select('teacherId name email phone subjects');
    
    // Get recent challenges (last 7 days)
    const recentChallenges = await Challenge.find({
      studentId: student.studentId,
      generatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })
      .sort({ generatedAt: -1 })
      .limit(5)
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt');
    
    // Get performance statistics
    const totalChallenges = await Challenge.countDocuments({
      studentId: student.studentId,
      status: 'evaluated'
    });
    
    const passedChallenges = await Challenge.countDocuments({
      studentId: student.studentId,
      status: 'evaluated',
      'results.passed': true
    });
    
    // Get recent NEP report
    const latestReport = await NEPReport.findOne({
      studentId: student.studentId
    }).sort({ generatedAt: -1 });
    
    // Get notification count (unread activity logs)
    const notificationCount = parent.notificationPreferences?.enabled
      ? await Activity.countDocuments({
          schoolId: parent.schoolId,
          createdAt: { $gte: parent.lastLoginAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          success: true
        })
      : 0;
    
    res.json({
      success: true,
      data: {
        parent: {
          name: parent.name,
          email: parent.email
        },
        student: {
          studentId: student.studentId,
          name: student.name,
          class: student.class,
          section: student.section,
          performanceIndex: student.performanceIndex,
          grade: student.grade
        },
        teacher: teacher || null,
        statistics: {
          totalChallenges,
          passedChallenges,
          passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
          currentStreak: student.stats.dailyStreak,
          averageScore: student.stats.averageChallengeScore || 0
        },
        recentChallenges,
        latestReport: latestReport ? {
          reportId: latestReport.reportId,
          reportType: latestReport.reportType,
          generatedAt: latestReport.generatedAt
        } : null,
        notifications: notificationCount
      }
    });
    
  } catch (error) {
    logger.error('Get parent dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
};

// ============================================================================
// CHILD INFORMATION
// ============================================================================

/**
 * @desc    Get child details
 * @route   GET /api/parent/child
 * @access  Private (Parent)
 */
exports.getChildDetails = async (req, res) => {
  try {
    // 1️⃣ Parent
    const parent = await Parent.findById(req.user.userId).lean();
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // 2️⃣ Student
    const student = await Student.findOne({
      studentId: parent.studentId
    }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // 3️⃣ School (string lookup)
    const school = await School.findOne({
      schoolId: student.schoolId
    })
      .select('schoolId schoolName phone address')
      .lean();

    // 4️⃣ Teachers (MULTIPLE support – future safe)
    const teachers = await Teacher.find({
      schoolId: student.schoolId,
      active: true
    })
      .select('teacherId name email phone subjects qualification experience')
      .lean();

    return res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          name: student.name,
          class: student.class,
          section: student.section
        },
        school,
        teachers
      }
    });

  } catch (error) {
    logger.error('Get child details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching child details'
    });
  }
};

/**
 * @desc    Get child performance
 * @route   GET /api/parent/child/performance
 * @access  Private (Parent)
 */
exports.getChildPerformance = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get challenge history
    const challenges = await Challenge.find({
      studentId: student.studentId,
      status: 'evaluated'
    })
      .sort({ evaluatedAt: -1 })
      .limit(50);
    
    // Calculate performance metrics
    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;
    const averageScore = totalChallenges > 0
      ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
      : 0;
    
    // Performance trend (last 20 challenges)
    const performanceTrend = challenges.slice(0, 20).reverse().map(c => ({
      date: c.evaluatedAt,
      score: c.results?.totalScore || 0,
      simulationType: c.simulationType,
      difficulty: c.difficulty,
      passed: c.results?.passed || false
    }));
    
    // Competency breakdown
    const competencies = student.competencyScores;
    const weakCompetencies = student.weakCompetencies.map(comp => ({
      name: comp,
      score: competencies[comp] || 0
    }));
    const strongCompetencies = student.strongCompetencies.map(comp => ({
      name: comp,
      score: competencies[comp] || 0
    }));
    
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
          averageScore,
          currentStreak: student.stats.dailyStreak,
          bestStreak: student.stats.bestStreak,
          totalTimeSpent: student.stats.totalTimeSpent || 0
        },
        competencies: {
          all: competencies,
          weak: weakCompetencies,
          strong: strongCompetencies
        },
        trend: performanceTrend
      }
    });
    
  } catch (error) {
    logger.error('Get child performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performance',
      error: error.message
    });
  }
};

/**
 * @desc    Get child competencies
 * @route   GET /api/parent/child/competencies
 * @access  Private (Parent)
 */
exports.getChildCompetencies = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get competency scores
    const competencies = student.competencyScores;
    
    // Get challenges grouped by competency
    const challenges = await Challenge.find({
      studentId: student.studentId,
      status: 'evaluated'
    }).select('questions results');
    
    // Analyze competency trends
    const competencyTrends = {};
    
    challenges.forEach(challenge => {
      if (challenge.results?.competenciesAssessed) {
        challenge.results.competenciesAssessed.forEach(comp => {
          if (!competencyTrends[comp.competency]) {
            competencyTrends[comp.competency] = [];
          }
          competencyTrends[comp.competency].push(comp.score);
        });
      }
    });
    
    // Calculate trends (improving/declining)
    const competencyAnalysis = {};
    Object.entries(competencies).forEach(([comp, currentScore]) => {
      const trend = competencyTrends[comp] || [];
      const recentAvg = trend.length >= 3
        ? trend.slice(-3).reduce((a, b) => a + b, 0) / 3
        : currentScore;
      const olderAvg = trend.length >= 6
        ? trend.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
        : currentScore;
      
      competencyAnalysis[comp] = {
        currentScore,
        trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
        recentAverage: recentAvg,
        totalAssessments: trend.length
      };
    });
    
    res.json({
      success: true,
      data: {
        competencies: competencyAnalysis,
        weak: student.weakCompetencies,
        strong: student.strongCompetencies,
        recommendations: student.weakCompetencies.slice(0, 3).map(comp => ({
          competency: comp,
          score: competencies[comp],
          recommendation: `Focus on ${comp.toLowerCase()} to improve overall performance`
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get child competencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching competencies',
      error: error.message
    });
  }
};

/**
 * @desc    Get child progress
 * @route   GET /api/parent/child/progress
 * @access  Private (Parent)
 */
exports.getChildProgress = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    const { period = '30' } = req.query; // days
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
    // Get challenges in period
    const challenges = await Challenge.find({
      studentId: student.studentId,
      generatedAt: { $gte: startDate },
      status: 'evaluated'
    }).sort({ generatedAt: 1 });
    
    // Daily progress
    const dailyProgress = {};
    challenges.forEach(challenge => {
      const date = challenge.generatedAt.toISOString().split('T')[0];
      if (!dailyProgress[date]) {
        dailyProgress[date] = {
          challenges: 0,
          totalScore: 0,
          passed: 0
        };
      }
      dailyProgress[date].challenges++;
      dailyProgress[date].totalScore += challenge.results?.totalScore || 0;
      if (challenge.results?.passed) {
        dailyProgress[date].passed++;
      }
    });
    
    // Format daily progress
    const progressArray = Object.entries(dailyProgress).map(([date, data]) => ({
      date,
      challenges: data.challenges,
      averageScore: data.totalScore / data.challenges,
      passRate: (data.passed / data.challenges * 100)
    }));
    
    // Calculate improvement
    const firstHalf = challenges.slice(0, Math.floor(challenges.length / 2));
    const secondHalf = challenges.slice(Math.floor(challenges.length / 2));
    
    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / secondHalf.length
      : 0;
    
    const improvement = secondHalfAvg - firstHalfAvg;
    
    res.json({
      success: true,
      data: {
        period: parseInt(period),
        totalChallenges: challenges.length,
        dailyProgress: progressArray,
        summary: {
          averageScore: challenges.length > 0
            ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / challenges.length
            : 0,
          improvement,
          improvementPercentage: firstHalfAvg > 0 ? (improvement / firstHalfAvg * 100) : 0,
          currentStreak: student.stats.dailyStreak
        }
      }
    });
    
  } catch (error) {
    logger.error('Get child progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching progress',
      error: error.message
    });
  }
};

// ============================================================================
// CHALLENGES
// ============================================================================

/**
 * @desc    Get all child challenges
 * @route   GET /api/parent/child/challenges
 * @access  Private (Parent)
 */
exports.getAllChallenges = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    const { status, simulationType, limit = 50, page = 1 } = req.query;
    
    const query = { studentId: parent.studentId };
    
    if (status) {
      query.status = status;
    }
    
    if (simulationType) {
      query.simulationType = simulationType;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const challenges = await Challenge.find(query)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt');
    
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
 * @route   GET /api/parent/child/challenges/:challengeId
 * @access  Private (Parent)
 */
exports.getChallengeDetails = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId,
      studentId: parent.studentId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Only show full details if evaluated
    if (challenge.status !== 'evaluated') {
      return res.json({
        success: true,
        data: {
          challenge: {
            challengeId: challenge.challengeId,
            simulationType: challenge.simulationType,
            difficulty: challenge.difficulty,
            status: challenge.status,
            generatedAt: challenge.generatedAt,
            message: 'Challenge details will be available after evaluation'
          }
        }
      });
    }
    
    res.json({
      success: true,
      data: { challenge }
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
 * @desc    Get recent challenges
 * @route   GET /api/parent/child/challenges/recent
 * @access  Private (Parent)
 */
exports.getRecentChallenges = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    const { days = 7 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    const challenges = await Challenge.find({
      studentId: parent.studentId,
      generatedAt: { $gte: startDate }
    })
      .sort({ generatedAt: -1 })
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt');
    
    res.json({
      success: true,
      data: {
        challenges,
        count: challenges.length,
        period: `Last ${days} days`
      }
    });
    
  } catch (error) {
    logger.error('Get recent challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Get activity log
 * @route   GET /api/parent/child/activity
 * @access  Private (Parent)
 */
exports.getActivityLog = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    const { limit = 50 } = req.query;
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    const activities = await Activity.find({
      userId: student._id.toString(),
      userType: 'student'
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('activityType action description createdAt success');
    
    res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
    
  } catch (error) {
    logger.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity log',
      error: error.message
    });
  }
};

// ============================================================================
// REPORTS
// ============================================================================

/**
 * @desc    Get NEP reports
 * @route   GET /api/parent/child/reports/nep
 * @access  Private (Parent)
 */
exports.getNEPReports = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    const { limit = 10 } = req.query;
    
    const reports = await NEPReport.find({
      studentId: parent.studentId
    })
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
    logger.error('Get NEP reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching NEP reports',
      error: error.message
    });
  }
};

/**
 * @desc    Get specific NEP report details
 * @route   GET /api/parent/reports/nep/:reportId
 * @access  Private (Parent)
 */
exports.getNEPReportDetails = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const report = await NEPReport.findOne({
      reportId: req.params.reportId,
      studentId: parent.studentId
    });
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    res.json({
      success: true,
      data: { report }
    });
    
  } catch (error) {
    logger.error('Get NEP report details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report details',
      error: error.message
    });
  }
};

/**
 * @desc    Get weekly report
 * @route   GET /api/parent/child/reports/weekly
 * @access  Private (Parent)
 */
exports.getWeeklyReport = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Last 7 days
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const challenges = await Challenge.find({
      studentId: student.studentId,
      generatedAt: { $gte: startDate },
      status: 'evaluated'
    });
    
    // Calculate weekly statistics
    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;
    const averageScore = totalChallenges > 0
      ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
      : 0;
    
    // Daily breakdown
    const dailyStats = {};
    challenges.forEach(challenge => {
      const date = challenge.generatedAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, totalScore: 0, passed: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].totalScore += challenge.results?.totalScore || 0;
      if (challenge.results?.passed) {
        dailyStats[date].passed++;
      }
    });
    
    // Simulation type breakdown
    const simulationStats = {};
    challenges.forEach(challenge => {
      if (!simulationStats[challenge.simulationType]) {
        simulationStats[challenge.simulationType] = { count: 0, totalScore: 0 };
      }
      simulationStats[challenge.simulationType].count++;
      simulationStats[challenge.simulationType].totalScore += challenge.results?.totalScore || 0;
    });
    
    res.json({
      success: true,
      data: {
        period: 'Last 7 days',
        summary: {
          totalChallenges,
          passedChallenges,
          passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
          averageScore,
          currentStreak: student.stats.dailyStreak
        },
        daily: Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          challenges: stats.count,
          averageScore: stats.totalScore / stats.count,
          passRate: (stats.passed / stats.count * 100)
        })),
        bySimulation: Object.entries(simulationStats).map(([type, stats]) => ({
          simulationType: type,
          challenges: stats.count,
          averageScore: stats.totalScore / stats.count
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get weekly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating weekly report',
      error: error.message
    });
  }
};

/**
 * @desc    Get monthly report
 * @route   GET /api/parent/child/reports/monthly
 * @access  Private (Parent)
 */
exports.getMonthlyReport = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Last 30 days
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const challenges = await Challenge.find({
      studentId: student.studentId,
      generatedAt: { $gte: startDate },
      status: 'evaluated'
    });
    
    // Calculate monthly statistics
    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;
    const averageScore = totalChallenges > 0
      ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
      : 0;
    
    // Weekly breakdown (4 weeks)
    const weeklyStats = [[], [], [], []];
    challenges.forEach(challenge => {
      const daysAgo = Math.floor((Date.now() - challenge.generatedAt) / (24 * 60 * 60 * 1000));
      const weekIndex = Math.min(Math.floor(daysAgo / 7), 3);
      weeklyStats[weekIndex].push(challenge);
    });
    
    const weeklyBreakdown = weeklyStats.map((weekChallenges, index) => ({
      week: `Week ${4 - index}`,
      challenges: weekChallenges.length,
      averageScore: weekChallenges.length > 0
        ? weekChallenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / weekChallenges.length
        : 0,
      passed: weekChallenges.filter(c => c.results?.passed).length
    })).reverse();
    
    // Competency progress
    const competencyProgress = {};
    challenges.forEach(challenge => {
      if (challenge.results?.competenciesAssessed) {
        challenge.results.competenciesAssessed.forEach(comp => {
          if (!competencyProgress[comp.competency]) {
            competencyProgress[comp.competency] = [];
          }
          competencyProgress[comp.competency].push(comp.score);
        });
      }
    });
    
    const competencySummary = Object.entries(competencyProgress).map(([comp, scores]) => ({
      competency: comp,
      currentScore: student.competencyScores[comp] || 0,
      averageThisMonth: scores.reduce((a, b) => a + b, 0) / scores.length,
      assessments: scores.length,
      trend: scores.length >= 2
        ? scores[scores.length - 1] > scores[0] ? 'improving' : 'stable'
        : 'stable'
    }));
    
    res.json({
      success: true,
      data: {
        period: 'Last 30 days',
        summary: {
          totalChallenges,
          passedChallenges,
          passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
          averageScore,
          performanceIndex: student.performanceIndex,
          grade: student.grade
        },
        weekly: weeklyBreakdown,
        competencies: competencySummary,
        achievements: {
          currentStreak: student.stats.dailyStreak,
          bestStreak: student.stats.bestStreak,
          totalCompleted: student.stats.totalChallengesCompleted
        }
      }
    });
    
  } catch (error) {
    logger.error('Get monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating monthly report',
      error: error.message
    });
  }
};

/**
 * @desc    Get performance comparison
 * @route   GET /api/parent/child/reports/comparison
 * @access  Private (Parent)
 */
exports.getPerformanceComparison = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get class average
    const classStudents = await Student.find({
      schoolId: student.schoolId,
      class: student.class,
      section: student.section,
      active: true
    });
    
    const classAverage = classStudents.length > 0
      ? classStudents.reduce((sum, s) => sum + s.performanceIndex, 0) / classStudents.length
      : 0;
    
    // Get school average for same class
    const schoolStudents = await Student.find({
      schoolId: student.schoolId,
      class: student.class,
      active: true
    });
    
    const schoolAverage = schoolStudents.length > 0
      ? schoolStudents.reduce((sum, s) => sum + s.performanceIndex, 0) / schoolStudents.length
      : 0;
    
    // Rank in class
    const classRank = classStudents
      .sort((a, b) => b.performanceIndex - a.performanceIndex)
      .findIndex(s => s.studentId === student.studentId) + 1;
    
    res.json({
      success: true,
      data: {
        student: {
          performanceIndex: student.performanceIndex,
          grade: student.grade
        },
        comparison: {
          classAverage,
          schoolAverage,
          classRank,
          totalInClass: classStudents.length,
          percentile: classStudents.length > 0
            ? ((classStudents.length - classRank + 1) / classStudents.length * 100)
            : 0
        },
        performance: {
          aboveClassAverage: student.performanceIndex > classAverage,
          aboveSchoolAverage: student.performanceIndex > schoolAverage,
          difference: {
            fromClass: student.performanceIndex - classAverage,
            fromSchool: student.performanceIndex - schoolAverage
          }
        }
      }
    });
    
  } catch (error) {
    logger.error('Get performance comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating comparison',
      error: error.message
    });
  }
};

// ============================================================================
// SETTINGS & NOTIFICATIONS
// ============================================================================

/**
 * @desc    Get notification preferences
 * @route   GET /api/parent/settings/notifications
 * @access  Private (Parent)
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    res.json({
      success: true,
      data: {
        preferences: parent.notificationPreferences || {
          enabled: true,
          email: true,
          challengeCompleted: true,
          weeklyReport: true,
          monthlyReport: true,
          performanceAlert: true
        }
      }
    });
    
  } catch (error) {
    logger.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching preferences',
      error: error.message
    });
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/parent/settings/notifications
 * @access  Private (Parent)
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const allowedSettings = [
      'enabled',
      'email',
      'challengeCompleted',
      'weeklyReport',
      'monthlyReport',
      'performanceAlert'
    ];
    
    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedSettings.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid settings to update'
      });
    }
    
    parent.notificationPreferences = {
      ...parent.notificationPreferences,
      ...updates
    };
    
    await parent.save();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'parent',
      schoolId: parent.schoolId,
      activityType: 'settings_changed',
      action: 'Notification preferences updated',
      metadata: { settings: Object.keys(updates) },
      ipAddress: req.ip,
      success: true
    });
    
    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: {
        preferences: parent.notificationPreferences
      }
    });
    
  } catch (error) {
    logger.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: error.message
    });
  }
};

// ============================================================================
// COMMUNICATION
// ============================================================================

/**
 * @desc    Get teacher information
 * @route   GET /api/parent/teacher
 * @access  Private (Parent)
 */
exports.getTeacherInfo = async (req, res) => {
  try {
    // 1️⃣ Parent fetch from token
    const parent = await Parent.findById(req.user.userId).lean();

    if (!parent || !parent.active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid parent account'
      });
    }

    // 2️⃣ Fetch student linked to parent
    const student = await Student.findOne({
      studentId: parent.studentId,
      active: true
    }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // 3️⃣ Resolve teacher IDs (current + future ready)
    let teacherIds = [];

    if (Array.isArray(student.teacherIds) && student.teacherIds.length > 0) {
      teacherIds = student.teacherIds;
    } else if (student.teacherId && student.teacherId !== 'SYSTEM-DEFAULT') {
      teacherIds = [student.teacherId];
    }

    if (teacherIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No teachers linked to this student'
      });
    }

    // 4️⃣ Fetch only linked teachers
    const teachers = await Teacher.find({
      teacherId: { $in: teacherIds },
      schoolId: student.schoolId,
      active: true
    })
      .select('teacherId name email phone subjects qualification experience')
      .lean();

    return res.json({
      success: true,
      data: {
        student: {
          studentId: student.studentId,
          class: student.class,
          section: student.section
        },
        teachers
      }
    });

  } catch (error) {
    logger.error('Get teacher info error:', {
      error: error.message,
      parentId: req.user?.userId
    });

    return res.status(500).json({
      success: false,
      message: 'Error fetching teacher information'
    });
  }
};


/**
 * @desc    Send message to teacher
 * @route   POST /api/parent/teacher/message
 * @access  Private (Parent)
 */
exports.sendMessageToTeacher = async (req, res) => {
  try {
    const { subject, message, teacherId } = req.body;

    if (!subject || !message || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Subject, message, and teacherId are required'
      });
    }

    // 1️⃣ Parent
    const parent = await Parent.findById(req.user.userId);
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    // 2️⃣ Student
    const student = await Student.findOne({ studentId: parent.studentId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // 3️⃣ Teacher validation (🔥 CRITICAL)
    const teacher = await Teacher.findOne({
      teacherId,
      schoolId: parent.schoolId,
      active: true
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or not linked to this school'
      });
    }

    // 4️⃣ Create help ticket
    const ticket = await HelpTicket.create({
      studentId: student.studentId,
      teacherId: teacher.teacherId,
      schoolId: parent.schoolId,
      subject,
      description: message,
      category: 'parent_communication',
      priority: 'medium',
      createdBy: req.user.userId,
      createdByRole: 'parent'
    });

    // 5️⃣ Activity log
    await Activity.log({
      userId: req.user.userId,
      userType: 'parent',
      schoolId: parent.schoolId,
      activityType: 'parent_message',
      action: 'Parent sent message to teacher',
      metadata: {
        ticketId: ticket.ticketId,
        teacherId: teacher.teacherId,
        studentId: student.studentId
      },
      ipAddress: req.ip,
      success: true
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent to teacher successfully',
      data: {
        ticketId: ticket.ticketId,
        teacher: {
          teacherId: teacher.teacherId,
          name: teacher.name,
          subjects: teacher.subjects
        }
      }
    });

  } catch (error) {
    logger.error('Send message to teacher error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};


/**
 * @desc    Get communication history
 * @route   GET /api/parent/teacher/messages
 * @access  Private (Parent)
 */
exports.getCommunicationHistory = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    const student = await Student.findOne({
      studentId: parent.studentId
    });
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    const tickets = await HelpTicket.find({
      studentId: student.studentId,
      category: 'parent_communication'
    })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: {
        messages: tickets,
        count: tickets.length
      }
    });
    
  } catch (error) {
    logger.error('Get communication history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching communication history',
      error: error.message
    });
  }
};

// ============================================================================
// MISSING METHODS - ADDED TO FIX ROUTES
// ============================================================================

/**
 * @desc    Get child's challenges (alias for getAllChallenges)
 * @route   GET /api/parent/child/challenges
 * @access  Private (Parent)
 */
exports.getChildChallenges = exports.getAllChallenges;

/**
 * @desc    Get child's activity (alias for getActivityLog)
 * @route   GET /api/parent/child/activity
 * @access  Private (Parent)
 */
exports.getChildActivity = exports.getActivityLog;

/**
 * @desc    Get preferences (alias for getNotificationPreferences)
 * @route   GET /api/parent/preferences
 * @access  Private (Parent)
 */
exports.getPreferences = exports.getNotificationPreferences;

/**
 * @desc    Update preferences (alias for updateNotificationPreferences)
 * @route   PUT /api/parent/preferences
 * @access  Private (Parent)
 */
exports.updatePreferences = exports.updateNotificationPreferences;

/**
 * @desc    Get notifications
 * @route   GET /api/parent/notifications
 * @access  Private (Parent)
 */
exports.getNotifications = async (req, res) => {
  try {
    const parent = await Parent.findById(req.user.userId);
    
    // For now, return empty array - implement notification system later
    res.json({
      success: true,
      data: {
        notifications: [],
        unreadCount: 0
      }
    });
    
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/parent/notifications/:notificationId/read
 * @access  Private (Parent)
 */
exports.markNotificationRead = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

/**
 * @desc    Get messages (alias for getCommunicationHistory)
 * @route   GET /api/parent/messages
 * @access  Private (Parent)
 */
exports.getMessages = exports.getCommunicationHistory;

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = exports;