// middleware/role.middleware.js
/**
 * ROLE MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * Advanced role-based access control and permission management
 * 
 * @module middleware/role.middleware
 */

const { Student, Teacher, Admin, Parent, School, Challenge } = require('../models');

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

const PERMISSIONS = {
  // Student permissions
  STUDENT: {
    READ_OWN_PROFILE: 'student:read:own_profile',
    UPDATE_OWN_PROFILE: 'student:update:own_profile',
    READ_OWN_CHALLENGES: 'student:read:own_challenges',
    CREATE_CHALLENGE: 'student:create:challenge',
    SUBMIT_CHALLENGE: 'student:submit:challenge',
    READ_OWN_REPORTS: 'student:read:own_reports',
    CREATE_HELP_TICKET: 'student:create:help_ticket',
    READ_OWN_HELP_TICKETS: 'student:read:own_help_tickets'
  },
  
  // Teacher permissions
  TEACHER: {
    READ_STUDENTS: 'teacher:read:students',
    READ_STUDENT_PROFILE: 'teacher:read:student_profile',
    READ_CHALLENGES: 'teacher:read:challenges',
    EVALUATE_CHALLENGE: 'teacher:evaluate:challenge',
    OVERRIDE_SCORE: 'teacher:override:score',
    READ_REPORTS: 'teacher:read:reports',
    CREATE_REPORT: 'teacher:create:report',
    MANAGE_HELP_TICKETS: 'teacher:manage:help_tickets',
    READ_CLASS_ANALYTICS: 'teacher:read:class_analytics',
    MANAGE_CLASS: 'teacher:manage:class'
  },
  
  // Admin permissions
  ADMIN: {
    MANAGE_SCHOOL: 'admin:manage:school',
    MANAGE_TEACHERS: 'admin:manage:teachers',
    MANAGE_STUDENTS: 'admin:manage:students',
    MANAGE_PARENTS: 'admin:manage:parents',
    READ_ALL_DATA: 'admin:read:all_data',
    MANAGE_SETTINGS: 'admin:manage:settings',
    VIEW_ANALYTICS: 'admin:view:analytics',
    MANAGE_HELP_TICKETS: 'admin:manage:help_tickets',
    EXPORT_DATA: 'admin:export:data',
    MANAGE_REPORTS: 'admin:manage:reports'
  },
  
  // Parent permissions
  PARENT: {
    READ_CHILD_PROFILE: 'parent:read:child_profile',
    READ_CHILD_CHALLENGES: 'parent:read:child_challenges',
    READ_CHILD_REPORTS: 'parent:read:child_reports',
    READ_CHILD_ANALYTICS: 'parent:read:child_analytics',
    COMMUNICATE_TEACHER: 'parent:communicate:teacher',
    UPDATE_PREFERENCES: 'parent:update:preferences'
  }
};

// Permission mapping by role
const ROLE_PERMISSIONS = {
  student: Object.values(PERMISSIONS.STUDENT),
  teacher: [
    ...Object.values(PERMISSIONS.TEACHER),
    PERMISSIONS.STUDENT.READ_OWN_PROFILE
  ],
  admin: [
    ...Object.values(PERMISSIONS.ADMIN),
    ...Object.values(PERMISSIONS.TEACHER),
    ...Object.values(PERMISSIONS.STUDENT)
  ],
  parent: Object.values(PERMISSIONS.PARENT)
};

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has permission
 * @param {Object} user - User object from req.user
 * @param {String} permission - Permission to check
 * @returns {Boolean}
 */
const hasPermission = (user, permission) => {
  if (!user || !user.userType) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.userType] || [];
  return userPermissions.includes(permission);
};

/**
 * Check if user has any of the permissions
 * @param {Object} user - User object from req.user
 * @param {Array} permissions - Array of permissions
 * @returns {Boolean}
 */
const hasAnyPermission = (user, permissions) => {
  if (!user || !user.userType) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.userType] || [];
  return permissions.some(permission => userPermissions.includes(permission));
};

/**
 * Check if user has all of the permissions
 * @param {Object} user - User object from req.user
 * @param {Array} permissions - Array of permissions
 * @returns {Boolean}
 */
const hasAllPermissions = (user, permissions) => {
  if (!user || !user.userType) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.userType] || [];
  return permissions.every(permission => userPermissions.includes(permission));
};

// ============================================================================
// PERMISSION MIDDLEWARE
// ============================================================================

/**
 * Require specific permission
 * @param {String} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: permission
      });
    }
    
    next();
  };
};

/**
 * Require any of the permissions
 * @param {Array} permissions - Array of permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: permissions
      });
    }
    
    next();
  };
};

/**
 * Require all of the permissions
 * @param {Array} permissions - Array of permissions
 */
const requireAllPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!hasAllPermissions(req.user, permissions)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: permissions
      });
    }
    
    next();
  };
};

// ============================================================================
// RESOURCE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Check if teacher can access student
 */
const canAccessStudent = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { userType, userId, schoolId } = req.user;
    
    // Admin has access to all students in their school
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
    
    // Student can access their own profile
    if (userType === 'student') {
      if (studentId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own profile.'
        });
      }
      
      const student = await Student.findOne({ studentId });
      req.student = student;
      return next();
    }
    
    // Teacher can access students in their classes
    if (userType === 'teacher') {
      const student = await Student.findOne({ studentId });
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }
      
      const teacher = await Teacher.findOne({ teacherId: userId });
      
      // Check if teacher teaches this student's class
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
    console.error('Student access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking student access'
    });
  }
};

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
    console.error('Challenge access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking challenge access'
    });
  }
};

/**
 * Check if teacher can access class
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
        cls.section === section
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
    console.error('Class access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking class access'
    });
  }
};

// ============================================================================
// TEACHER APPROVAL STATUS
// ============================================================================

/**
 * Check if teacher is approved
 */
const isTeacherApproved = async (req, res, next) => {
  try {
    const { userId, userType } = req.user;
    
    if (userType !== 'teacher') {
      return next();
    }
    
    const teacher = await Teacher.findOne({ teacherId: userId });
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    if (teacher.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Teacher account pending approval',
        status: teacher.status
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Teacher approval check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking teacher approval'
    });
  }
};

// ============================================================================
// SCHOOL CAPACITY CHECKS
// ============================================================================

/**
 * Check if school has capacity for new students
 */
const checkSchoolCapacity = async (req, res, next) => {
  try {
    const { schoolId } = req.body || req.params;
    
    if (!schoolId) {
      return next();
    }
    
    const school = await School.findOne({ schoolId });
    
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }
    
    const currentStudents = await Student.countDocuments({ schoolId });
    
    if (currentStudents >= school.capacity.maxStudents) {
      return res.status(403).json({
        success: false,
        message: 'School has reached maximum student capacity',
        currentStudents,
        maxStudents: school.capacity.maxStudents
      });
    }
    
    req.school = school;
    next();
    
  } catch (error) {
    console.error('School capacity check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking school capacity'
    });
  }
};

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if feature is enabled for user's school
 * @param {String} feature - Feature name
 */
const requireFeature = (feature) => {
  return async (req, res, next) => {
    try {
      const { schoolId } = req.user;
      
      const school = await School.findOne({ schoolId });
      
      if (!school) {
        return res.status(404).json({
          success: false,
          message: 'School not found'
        });
      }
      
      // Check if feature is enabled in school settings
      if (!school.settings || !school.settings[feature]) {
        return res.status(403).json({
          success: false,
          message: `Feature '${feature}' is not enabled for your school`,
          feature
        });
      }
      
      next();
      
    } catch (error) {
      console.error('Feature check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking feature availability'
      });
    }
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Permissions
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  
  // Permission Middleware
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  
  // Resource Access
  canAccessStudent,
  canAccessChallenge,
  canAccessClass,
  
  // Status Checks
  isTeacherApproved,
  checkSchoolCapacity,
  
  // Features
  requireFeature
};