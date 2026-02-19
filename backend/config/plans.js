/**
 * PLAN TIER DEFINITIONS
 * Defines limits and metadata for each subscription tier.
 * Tiers map exactly to the School.subscriptionPlan enum.
 */

module.exports = {
  free: {
    maxStudents: 50,
    maxTeachers: 5,
    label: 'Free',
    contactForUpgrade: true,
  },
  basic: {
    maxStudents: 500,
    maxTeachers: 50,
    label: 'Basic',
    contactForUpgrade: false,
  },
  premium: {
    maxStudents: 2000,
    maxTeachers: 200,
    label: 'Premium',
    contactForUpgrade: false,
  },
  enterprise: {
    maxStudents: Infinity,
    maxTeachers: 999,
    label: 'Enterprise',
    contactForUpgrade: false,
  },
};
