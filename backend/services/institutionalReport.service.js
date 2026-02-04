/**
 * INSTITUTIONAL REPORT SERVICE
 * ---------------------------------------
 * Analytics-only, NON-LEDGER service.
 * Generates school-wide NEP performance reports.
 */

const InstitutionalReport = require('../models/InstitutionalReport');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const NEPReport = require('../models/NEPReport');
const { NEP_COMPETENCIES } = require('../config/constants');
const logger = require('../utils/logger');

// -----------------------------------------------------
// MAIN ENTRY
// -----------------------------------------------------
async function generateInstitutionalReport({
  schoolId,
  periodStart,
  periodEnd,
  reportType = 'monthly',
  generatedBy = 'system'
}) {
  logger.info('🏫 Generating institutional report', {
    schoolId,
    reportType,
    periodStart,
    periodEnd
  });

  // ---------------------------------------------------
  // 1. BASIC COUNTS
  // ---------------------------------------------------
  const [totalStudents, totalTeachers] = await Promise.all([
    Student.countDocuments({ schoolId }),
    Teacher.countDocuments({ schoolId })
  ]);

  // ---------------------------------------------------
  // 2. FETCH STUDENTS
  // ---------------------------------------------------
  const students = await Student.find({ schoolId }).lean();
  const studentIds = students.map(s => s.studentId);

  if (studentIds.length === 0) {
    throw new Error('No students found for this school');
  }

  // ---------------------------------------------------
  // 3. FETCH NEP REPORTS (OVERLAP-AWARE)
  // ---------------------------------------------------
  const nepReports = await NEPReport.find({
    studentId: { $in: studentIds },
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart }
  }).lean();

  // ---------------------------------------------------
  // 4. ACTIVE STUDENTS
  // ---------------------------------------------------
  const activeStudents = new Set(nepReports.map(r => r.studentId)).size;

  // ---------------------------------------------------
  // 5. SPI VALUES (CPI → fallback avgScore)
  // ---------------------------------------------------
  const spiValues = nepReports
    .map(r => {
      if (typeof r.performanceMetrics?.cpi === 'number') {
        return r.performanceMetrics.cpi * 100;
      }
      if (typeof r.summary?.averageScore === 'number') {
        return r.summary.averageScore;
      }
      return null;
    })
    .filter(v => typeof v === 'number');

  const averageSPI =
    spiValues.length > 0
      ? Number(
          (spiValues.reduce((a, b) => a + b, 0) / spiValues.length).toFixed(2)
        )
      : null;

  // ---------------------------------------------------
  // 6. PERFORMANCE DISTRIBUTION
  // ---------------------------------------------------
  const performanceDistribution = {
    aPlus: 0,
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    f: 0
  };

  spiValues.forEach(score => {
    if (score >= 90) performanceDistribution.aPlus++;
    else if (score >= 80) performanceDistribution.a++;
    else if (score >= 70) performanceDistribution.b++;
    else if (score >= 60) performanceDistribution.c++;
    else if (score >= 50) performanceDistribution.d++;
    else performanceDistribution.f++;
  });

  // ---------------------------------------------------
  // 7. CLASS-WISE PERFORMANCE
  // ---------------------------------------------------
  const classMap = {};

  nepReports.forEach(report => {
    const student = students.find(s => s.studentId === report.studentId);
    if (!student) return;

    const key = `${student.class}-${student.section || ''}`;

    if (!classMap[key]) {
      classMap[key] = {
        class: student.class,
        section: student.section || '',
        totalStudents: 0,
        spiSum: 0,
        scoreSum: 0,
        count: 0
      };
    }

    classMap[key].totalStudents++;

    const spi =
      typeof report.performanceMetrics?.cpi === 'number'
        ? report.performanceMetrics.cpi * 100
        : report.summary?.averageScore;

    if (typeof spi === 'number') {
      classMap[key].spiSum += spi;
      classMap[key].count++;
    }

    if (typeof report.summary?.averageScore === 'number') {
      classMap[key].scoreSum += report.summary.averageScore;
    }
  });

  const classwisePerformance = Object.values(classMap).map(c => ({
    class: c.class,
    section: c.section,
    totalStudents: c.totalStudents,
    averageSPI: c.count ? Number((c.spiSum / c.count).toFixed(2)) : null,
    averageChallengeScore: c.count
      ? Number((c.scoreSum / c.count).toFixed(2))
      : null
  }));

  // ---------------------------------------------------
  // 8. COMPETENCY OVERVIEW
  // ---------------------------------------------------
  const competencyStats = {};
  NEP_COMPETENCIES.forEach(c => {
    competencyStats[c] = {
      total: 0,
      sum: 0,
      above80: 0,
      below50: 0
    };
  });

  nepReports.forEach(r => {
    (r.competencies || []).forEach(c => {
      if (!competencyStats[c.name] || typeof c.score !== 'number') return;
      competencyStats[c.name].total++;
      competencyStats[c.name].sum += c.score;
      if (c.score >= 80) competencyStats[c.name].above80++;
      if (c.score < 50) competencyStats[c.name].below50++;
    });
  });

  const competencyOverview = NEP_COMPETENCIES.map(name => {
    const stat = competencyStats[name];
    return {
      competency: name,
      averageScore: stat.total
        ? Number((stat.sum / stat.total).toFixed(2))
        : null,
      studentsAbove80: stat.above80,
      studentsBelow50: stat.below50
    };
  });

  // ---------------------------------------------------
  // 9. TOP PERFORMERS
  // ---------------------------------------------------
  const topPerformers = nepReports
    .map(r => {
      const student = students.find(s => s.studentId === r.studentId);
      const spi =
        typeof r.performanceMetrics?.cpi === 'number'
          ? r.performanceMetrics.cpi * 100
          : r.summary?.averageScore;

      if (typeof spi !== 'number') return null;

      return {
        studentId: r.studentId,
        name: student?.name || 'Unknown',
        class: student?.class,
        spi
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.spi - a.spi)
    .slice(0, 10)
    .map((r, index) => ({
      ...r,
      rank: index + 1
    }));

  // ---------------------------------------------------
  // 10. ACTIVITY + AI USAGE (SAFE DEFAULTS)
  // ---------------------------------------------------
  const activityTrends = {
    dailyChallenges: {},
    weeklyActive: {},
    loginTrends: {}
  };

  const aiUsage = {
    totalEvaluations: nepReports.length,
    averageResponseTime: null,
    totalTokensUsed: 0,
    estimatedCost: 0
  };

  // ---------------------------------------------------
  // 11. SAVE REPORT
  // ---------------------------------------------------
  const report = await InstitutionalReport.create({
    schoolId,
    reportType,
    periodStart,
    periodEnd,
    overview: {
      totalStudents,
      activeStudents,
      totalTeachers,
      totalClasses: new Set(students.map(s => s.class)).size,
      totalChallenges: nepReports.length,
      averageSPI
    },
    performanceDistribution,
    classwisePerformance,
    subjectwisePerformance: [],
    topPerformers,
    competencyOverview,
    activityTrends,
    aiUsage,
    generatedBy
  });

  logger.info('🏫 Institutional report generated', {
    reportId: report.reportId
  });

  return report;
}

// -----------------------------------------------------
module.exports = {
  generateInstitutionalReport
};
