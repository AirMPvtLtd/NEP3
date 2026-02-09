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
const SPIRecord = require('../models/SPIRecord');
const { NEP_COMPETENCIES } = require('../config/constants');
const logger = require('../utils/logger');

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
  const [students, totalTeachers] = await Promise.all([
    Student.find({ schoolId }).lean(),
    Teacher.countDocuments({ schoolId })
  ]);

  if (!students.length) {
    throw new Error('No students found for this school');
  }

  const studentIds = students.map(s => s.studentId);

  // ---------------------------------------------------
  // 2. FETCH SPI RECORDS (AUTHORITATIVE)
  // ---------------------------------------------------
  const spiRecords = await SPIRecord.find({
    studentId: { $in: studentIds },
    calculatedAt: { $gte: periodStart, $lte: periodEnd }
  }).lean();

  // ---------------------------------------------------
  // 3. ACTIVE STUDENTS
  // ---------------------------------------------------
  const activeStudents = new Set(spiRecords.map(r => r.studentId)).size;

  // ---------------------------------------------------
  // 4. AVERAGE SPI
  // ---------------------------------------------------
  const spiValues = spiRecords.map(r => r.spi).filter(v => typeof v === 'number');

  const averageSPI =
    spiValues.length > 0
      ? Number(
          (spiValues.reduce((a, b) => a + b, 0) / spiValues.length).toFixed(2)
        )
      : null;

  // ---------------------------------------------------
  // 5. PERFORMANCE DISTRIBUTION
  // ---------------------------------------------------
  const performanceDistribution = {
    aPlus: 0,
    a: 0,
    b: 0,
    c: 0,
    d: 0,
    f: 0
  };

  spiValues.forEach(spi => {
    if (spi >= 90) performanceDistribution.aPlus++;
    else if (spi >= 80) performanceDistribution.a++;
    else if (spi >= 70) performanceDistribution.b++;
    else if (spi >= 60) performanceDistribution.c++;
    else if (spi >= 50) performanceDistribution.d++;
    else performanceDistribution.f++;
  });

  // ---------------------------------------------------
  // 6. CLASS-WISE PERFORMANCE
  // ---------------------------------------------------
  const classMap = {};

  spiRecords.forEach(r => {
    const student = students.find(s => s.studentId === r.studentId);
    if (!student) return;

    const key = `${student.class}-${student.section || ''}`;

    if (!classMap[key]) {
      classMap[key] = {
        class: student.class,
        section: student.section || '',
        totalStudents: 0,
        spiSum: 0,
        count: 0
      };
    }

    classMap[key].totalStudents++;
    classMap[key].spiSum += r.spi;
    classMap[key].count++;
  });

  const classwisePerformance = Object.values(classMap).map(c => ({
    class: c.class,
    section: c.section,
    totalStudents: c.totalStudents,
    averageSPI: c.count ? Number((c.spiSum / c.count).toFixed(2)) : null,
    averageChallengeScore: null // intentional (SPI-only report)
  }));

  // ---------------------------------------------------
  // 7. NEP COMPETENCY OVERVIEW (FROM NEP REPORTS)
  // ---------------------------------------------------
  const nepReports = await NEPReport.find({
    studentId: { $in: studentIds },
    periodStart: { $lte: periodEnd },
    periodEnd: { $gte: periodStart }
  }).lean();

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
  // 8. TOP PERFORMERS
  // ---------------------------------------------------
  const topPerformers = spiRecords
    .map(r => {
      const student = students.find(s => s.studentId === r.studentId);
      return student
        ? {
            studentId: r.studentId,
            name: student.name || 'Unknown',
            class: student.class,
            spi: r.spi
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.spi - a.spi)
    .slice(0, 10)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // ---------------------------------------------------
  // 9. SAVE REPORT
  // ---------------------------------------------------
  const report = await InstitutionalReport.create({
    schoolId,
    reportType,
    periodStart,
    periodEnd,
    overview: {
      totalStudents: students.length,
      activeStudents,
      totalTeachers,
      totalClasses: new Set(students.map(s => s.class)).size,
      totalChallenges: spiRecords.length,
      averageSPI
    },
    performanceDistribution,
    classwisePerformance,
    subjectwisePerformance: [],
    topPerformers,
    competencyOverview,
    activityTrends: {
      dailyChallenges: {},
      weeklyActive: {},
      loginTrends: {}
    },
    aiUsage: {
      totalEvaluations: spiRecords.length,
      averageResponseTime: null,
      totalTokensUsed: 0,
      estimatedCost: 0
    },
    generatedBy
  });

  logger.info('🏫 Institutional report generated', {
    reportId: report.reportId
  });

  return report;
}

module.exports = {
  generateInstitutionalReport
};
