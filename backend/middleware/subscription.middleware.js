/**
 * SUBSCRIPTION MIDDLEWARE
 * Checks student limits before allowing add/bulk-upload operations.
 */

const { School } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware: block the request if the school has reached its student limit.
 * Handles both single-student (default batchSize=1) and bulk uploads
 * (batchSize = req.body.students.length).
 *
 * On success, attaches `req.school` for downstream use.
 */
const checkStudentLimit = async (req, res, next) => {
  try {
    const school = await School.findOne({ schoolId: req.user.schoolId });

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    const batchSize = Array.isArray(req.body.students)
      ? req.body.students.length
      : 1;

    const remaining = school.limits.maxStudents - school.stats.totalStudents;

    if (remaining < batchSize) {
      return res.status(403).json({
        success: false,
        code: 'STUDENT_LIMIT_REACHED',
        message: `Student limit of ${school.limits.maxStudents} reached for your current plan.`,
        currentStudents: school.stats.totalStudents,
        maxStudents: school.limits.maxStudents,
        plan: school.subscriptionPlan,
        upgradeUrl: '/contact',
        upgradeMessage: 'Contact us to upgrade your plan and add more students.',
      });
    }

    req.school = school;
    next();
  } catch (err) {
    logger.error('checkStudentLimit error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error checking student limit',
    });
  }
};

/**
 * Helper: fetch the School document for the authenticated user's schoolId.
 * Returns null if not found. Does not send a response.
 */
const getSchoolForRequest = async (req) => {
  return School.findOne({ schoolId: req.user.schoolId });
};

module.exports = { checkStudentLimit, getSchoolForRequest };
