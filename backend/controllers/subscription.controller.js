/**
 * SUBSCRIPTION CONTROLLER
 * Endpoints for reading plan/limit status.
 * Stub-ready for Razorpay/Stripe integration later.
 */

const { School } = require('../models');
const plans = require('../config/plans');
const logger = require('../utils/logger');

/**
 * @desc  Get subscription status for the authenticated school
 * @route GET /api/subscription/status
 * @access Private (Admin)
 */
exports.getStatus = async (req, res) => {
  try {
    const school = await School.findOne({ schoolId: req.user.schoolId });

    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const planKey = school.subscriptionPlan || 'free';
    const planConfig = plans[planKey] || plans.free;

    const studentUsed  = school.stats.totalStudents  || 0;
    const teacherUsed  = school.stats.totalTeachers  || 0;

    const studentLimit  = school.limits.maxStudents;
    const teacherLimit  = school.limits.maxTeachers;

    // Use null to signal "unlimited" (Infinity can't be JSON-serialised)
    const studentLimitOut  = studentLimit  >= 999999 ? null : studentLimit;
    const teacherLimitOut  = teacherLimit  >= 999999 ? null : teacherLimit;

    const studentRemaining = studentLimitOut === null
      ? null
      : Math.max(0, studentLimitOut - studentUsed);
    const teacherRemaining = teacherLimitOut === null
      ? null
      : Math.max(0, teacherLimitOut - teacherUsed);

    const studentPct = studentLimitOut === null
      ? 0
      : Math.round((studentUsed / studentLimitOut) * 100);
    const teacherPct = teacherLimitOut === null
      ? 0
      : Math.round((teacherUsed / teacherLimitOut) * 100);

    const isAtStudentLimit = studentLimitOut !== null && studentUsed >= studentLimitOut;
    const isAtTeacherLimit = teacherLimitOut  !== null && teacherUsed  >= teacherLimitOut;

    return res.json({
      success: true,
      data: {
        plan: planKey,
        label: `${planConfig.label} Plan`,
        students: {
          used:        studentUsed,
          limit:       studentLimitOut,
          remaining:   studentRemaining,
          percentUsed: studentPct,
        },
        teachers: {
          used:        teacherUsed,
          limit:       teacherLimitOut,
          remaining:   teacherRemaining,
          percentUsed: teacherPct,
        },
        isAtLimit:           isAtStudentLimit,
        isAtTeacherLimit:    isAtTeacherLimit,
        contactForUpgrade:   planConfig.contactForUpgrade,
        upgradeUrl:          '/contact',
      },
    });
  } catch (err) {
    logger.error('getStatus error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching subscription status' });
  }
};

/**
 * @desc  Get available plan information
 * @route GET /api/subscription/plans
 * @access Private (Admin)
 */
exports.getPlans = async (req, res) => {
  try {
    const planList = Object.entries(plans).map(([key, cfg]) => ({
      id:               key,
      label:            cfg.label,
      maxStudents:      cfg.maxStudents === Infinity ? null : cfg.maxStudents,
      maxTeachers:      cfg.maxTeachers === Infinity ? null : cfg.maxTeachers,
      contactForUpgrade: cfg.contactForUpgrade,
      upgradeUrl:       cfg.contactForUpgrade ? '/contact' : null,
    }));

    return res.json({ success: true, data: { plans: planList } });
  } catch (err) {
    logger.error('getPlans error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching plans' });
  }
};
