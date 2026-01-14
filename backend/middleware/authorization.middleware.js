// middleware/authorization.middleware.js
/**
 * AUTHORIZATION MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * Resource ownership and advanced authorization checks
 * 
 * @module middleware/authorization.middleware
 */

const { Student, Teacher, Admin, Parent, School, Challenge, NEPReport, InstitutionalReport, HelpTicket, ClassSection } = require('../models');

// ============================================================================
// STUDENT RESOURCE AUTHORIZATION
// ============================================================================

/**
 * Check if user can access student resource
 */
const canAccessStudentResource = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    // Admin can access all students in their school
    if (userType === 'admin') {
      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      if (student.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Student belongs to different school.'
        });
      }
      
      req.student = student;
      return next();
    }
    
    // Student can only access their own resources
    if (userType === 'student') {
      if (studentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }
      
      const student = await Student.findOne({ studentId });
      req.student = student;
      return next();
    }
    
    // Teacher can access students they teach
    if (userType === 'teacher') {
      const student = await Student.findOne({ studentId });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      const teacher = await Teacher.findOne({ teacherId: userId });
      const hasAccess = teacher.classes.some(cls => 
        cls.class === student.class && 
        cls.section === student.section
      );
      
      if (!hasAccess && student.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not teach this student.'
        });
      }
      
      req.student = student;
      return next();
    }
    
    // Parent can access their children
    if (userType === 'parent') {
      const parent = await Parent.findOne({ parentId: userId });
      if (!parent.children.includes(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This is not your child.'
        });
      }
      
      const student = await Student.findOne({ studentId });
      req.student = student;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('Student resource authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// CHALLENGE AUTHORIZATION
// ============================================================================

/**
 * Check if user can access challenge
 */
const canAccessChallenge = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    const challenge = await Challenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Student can only access their own challenges
    if (userType === 'student') {
      if (challenge.studentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own challenges.'
        });
      }
      req.challenge = challenge;
      return next();
    }
    
    // Teacher can access challenges from their students
    if (userType === 'teacher') {
      const student = await Student.findOne({ studentId: challenge.studentId });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      const teacher = await Teacher.findOne({ teacherId: userId });
      const hasAccess = teacher.classes.some(cls => 
        cls.class === student.class && 
        cls.section === student.section
      );
      
      if (!hasAccess && student.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not teach this student.'
        });
      }
      
      req.challenge = challenge;
      return next();
    }
    
    // Admin can access all challenges in their school
    if (userType === 'admin') {
      const student = await Student.findOne({ studentId: challenge.studentId });
      if (student.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Challenge belongs to different school.'
        });
      }
      
      req.challenge = challenge;
      return next();
    }
    
    // Parent can access their children's challenges
    if (userType === 'parent') {
      const parent = await Parent.findOne({ parentId: userId });
      if (!parent.children.includes(challenge.studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This is not your child\'s challenge.'
        });
      }
      
      req.challenge = challenge;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('Challenge authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Check if user can modify challenge
 */
const canModifyChallenge = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { userType, userId } = req.user;
    
    const challenge = await Challenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Only challenge owner can modify before submission
    if (challenge.status === 'pending' || challenge.status === 'in-progress') {
      if (userType === 'student' && challenge.studentId === userId) {
        req.challenge = challenge;
        return next();
      }
    }
    
    // Teachers and admins can modify evaluated challenges
    if (userType === 'teacher' || userType === 'admin') {
      req.challenge = challenge;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Cannot modify this challenge.'
    });
    
  } catch (error) {
    console.error('Challenge modification authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Check if user can evaluate challenge
 */
const canEvaluateChallenge = async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    if (userType !== 'teacher' && userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can evaluate challenges'
      });
    }
    
    const challenge = await Challenge.findOne({ challengeId });
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Challenge must be submitted before evaluation'
      });
    }
    
    const student = await Student.findOne({ studentId: challenge.studentId });
    if (student.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Challenge belongs to different school.'
      });
    }
    
    req.challenge = challenge;
    next();
    
  } catch (error) {
    console.error('Challenge evaluation authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// REPORT AUTHORIZATION
// ============================================================================

/**
 * Check if user can access NEP report
 */
const canAccessNEPReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    const report = await NEPReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Student can access their own reports
    if (userType === 'student') {
      if (report.studentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own reports.'
        });
      }
      req.report = report;
      return next();
    }
    
    // Teacher can access reports of students they teach
    if (userType === 'teacher') {
      const student = await Student.findOne({ studentId: report.studentId });
      const teacher = await Teacher.findOne({ teacherId: userId });
      
      const hasAccess = teacher.classes.some(cls => 
        cls.class === student.class && 
        cls.section === student.section
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not teach this student.'
        });
      }
      
      req.report = report;
      return next();
    }
    
    // Admin can access all reports in their school
    if (userType === 'admin') {
      if (report.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Report belongs to different school.'
        });
      }
      
      req.report = report;
      return next();
    }
    
    // Parent can access their children's reports
    if (userType === 'parent') {
      const parent = await Parent.findOne({ parentId: userId });
      if (!parent.children.includes(report.studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This is not your child\'s report.'
        });
      }
      
      req.report = report;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('NEP report authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Check if user can access institutional report
 */
const canAccessInstitutionalReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    const report = await InstitutionalReport.findOne({ reportId });
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Only teachers and admins can access institutional reports
    if (userType !== 'teacher' && userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers and admins can access institutional reports.'
      });
    }
    
    if (report.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Report belongs to different school.'
      });
    }
    
    req.report = report;
    next();
    
  } catch (error) {
    console.error('Institutional report authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// HELP TICKET AUTHORIZATION
// ============================================================================

/**
 * Check if user can access help ticket
 */
const canAccessHelpTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    const ticket = await HelpTicket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Student can access their own tickets
    if (userType === 'student') {
      if (ticket.studentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own tickets.'
        });
      }
      req.ticket = ticket;
      return next();
    }
    
    // Teacher can access tickets from their school
    if (userType === 'teacher') {
      if (ticket.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Ticket belongs to different school.'
        });
      }
      req.ticket = ticket;
      return next();
    }
    
    // Admin can access all tickets in their school
    if (userType === 'admin') {
      if (ticket.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Ticket belongs to different school.'
        });
      }
      req.ticket = ticket;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('Help ticket authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

/**
 * Check if user can modify help ticket
 */
const canModifyHelpTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    const ticket = await HelpTicket.findOne({ ticketId });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Teachers and admins can modify tickets
    if (userType === 'teacher' || userType === 'admin') {
      if (ticket.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Ticket belongs to different school.'
        });
      }
      req.ticket = ticket;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Only teachers and admins can modify tickets'
    });
    
  } catch (error) {
    console.error('Help ticket modification authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// CLASS AUTHORIZATION
// ============================================================================

/**
 * Check if user can access class
 */
const canAccessClass = async (req, res, next) => {
  try {
    const { class: className, section } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    // Admin can access all classes in their school
    if (userType === 'admin') {
      return next();
    }
    
    // Teacher can only access their classes
    if (userType === 'teacher') {
      const teacher = await Teacher.findOne({ teacherId: userId });
      const hasAccess = teacher.classes.some(cls => 
        cls.class === parseInt(className) && 
        (!section || cls.section === section)
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not teach this class.'
        });
      }
      
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('Class authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// SCHOOL AUTHORIZATION
// ============================================================================

/**
 * Check if user can modify school settings
 */
const canModifySchool = async (req, res, next) => {
  try {
    const { schoolId } = req.params;
    const { userType, schoolId: userSchoolId } = req.user;
    
    if (userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can modify school settings'
      });
    }
    
    if (schoolId !== userSchoolId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only modify your own school.'
      });
    }
    
    const school = await School.findOne({ schoolId });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    req.school = school;
    next();
    
  } catch (error) {
    console.error('School modification authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// PARENT AUTHORIZATION
// ============================================================================

/**
 * Check if parent can access child
 */
const canAccessChild = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { userType, userId } = req.user;
    
    if (userType !== 'parent') {
      return next();
    }
    
    const parent = await Parent.findOne({ parentId: userId });
    if (!parent.children.includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This is not your child.'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Child access authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// TEACHER AUTHORIZATION
// ============================================================================

/**
 * Check if teacher can access teacher resource
 */
const canAccessTeacherResource = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    // Admin can access all teachers in their school
    if (userType === 'admin') {
      const teacher = await Teacher.findOne({ teacherId });
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      
      if (teacher.schoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Teacher belongs to different school.'
        });
      }
      
      req.teacher = teacher;
      return next();
    }
    
    // Teacher can only access their own resources
    if (userType === 'teacher') {
      if (teacherId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }
      
      const teacher = await Teacher.findOne({ teacherId });
      req.teacher = teacher;
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('Teacher resource authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// BATCH AUTHORIZATION
// ============================================================================

/**
 * Check if user can perform batch operations
 */
const canPerformBatchOperation = async (req, res, next) => {
  try {
    const { userType } = req.user;
    
    if (userType !== 'admin' && userType !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can perform batch operations'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Batch operation authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// DATA EXPORT AUTHORIZATION
// ============================================================================

/**
 * Check if user can export data
 */
const canExportData = async (req, res, next) => {
  try {
    const { userType } = req.user;
    
    if (userType !== 'admin' && userType !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can export data'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Data export authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// ANALYTICS AUTHORIZATION
// ============================================================================

/**
 * Check if user can access analytics
 */
const canAccessAnalytics = async (req, res, next) => {
  try {
    const { scope } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    // Student can only access their own analytics
    if (userType === 'student') {
      if (scope !== 'student' && scope !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Students can only access their own analytics'
        });
      }
      return next();
    }
    
    // Parent can access their children's analytics
    if (userType === 'parent') {
      const parent = await Parent.findOne({ parentId: userId });
      const { studentId } = req.params;
      
      if (studentId && !parent.children.includes(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This is not your child.'
        });
      }
      return next();
    }
    
    // Teacher can access class analytics
    if (userType === 'teacher') {
      if (scope === 'school') {
        return res.status(403).json({
          success: false,
          message: 'Teachers cannot access school-wide analytics'
        });
      }
      return next();
    }
    
    // Admin can access all analytics in their school
    if (userType === 'admin') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
    
  } catch (error) {
    console.error('Analytics authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Student
  canAccessStudentResource,
  
  // Challenge
  canAccessChallenge,
  canModifyChallenge,
  canEvaluateChallenge,
  
  // Reports
  canAccessNEPReport,
  canAccessInstitutionalReport,
  
  // Help Tickets
  canAccessHelpTicket,
  canModifyHelpTicket,
  
  // Class
  canAccessClass,
  
  // School
  canModifySchool,
  
  // Parent
  canAccessChild,
  
  // Teacher
  canAccessTeacherResource,
  
  // Batch Operations
  canPerformBatchOperation,
  
  // Data Export
  canExportData,
  
  // Analytics
  canAccessAnalytics
};