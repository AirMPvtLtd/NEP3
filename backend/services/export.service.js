// services/export.service.js
/**
 * EXPORT SERVICE - COMPLETE PRODUCTION VERSION
 * Data export to CSV, PDF, Excel formats
 * 
 * @module services/export.service
 */

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { parse } = require('json2csv');
const fs = require('fs');
const path = require('path');
const { Student, Teacher, Challenge, NEPReport, InstitutionalReport } = require('../models');

// ============================================================================
// EXPORT DIRECTORIES
// ============================================================================

const exportDir = path.join(__dirname, '../exports');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export students to CSV
 * @param {Object} query - Query options
 * @returns {Promise<String>} File path
 */
const exportStudentsCSV = async (query = {}) => {
  const students = await Student.find(query).lean();
  
  const fields = [
    'studentId',
    'name',
    'email',
    'class',
    'section',
    'rollNumber',
    'dateOfBirth',
    'status',
    'createdAt'
  ];
  
  const csv = parse(students, { fields });
  
  const filename = `students_${Date.now()}.csv`;
  const filepath = path.join(exportDir, filename);
  
  fs.writeFileSync(filepath, csv);
  
  return filepath;
};

/**
 * Export challenges to CSV
 * @param {Object} query - Query options
 * @returns {Promise<String>} File path
 */
const exportChallengesCSV = async (query = {}) => {
  const challenges = await Challenge.find(query).lean();
  
  const data = challenges.map(challenge => ({
    challengeId: challenge.challengeId,
    studentId: challenge.studentId,
    simulationType: challenge.simulationType,
    difficulty: challenge.difficulty,
    status: challenge.status,
    score: challenge.evaluation?.score || 'N/A',
    createdAt: challenge.createdAt,
    submittedAt: challenge.submittedAt || 'N/A',
    evaluatedAt: challenge.evaluatedAt || 'N/A'
  }));
  
  const fields = Object.keys(data[0] || {});
  const csv = parse(data, { fields });
  
  const filename = `challenges_${Date.now()}.csv`;
  const filepath = path.join(exportDir, filename);
  
  fs.writeFileSync(filepath, csv);
  
  return filepath;
};

/**
 * Export generic data to CSV
 * @param {Array} data - Data array
 * @param {String} filename - Filename
 * @param {Array} fields - Field names (optional)
 * @returns {Promise<String>} File path
 */
const exportToCSV = async (data, filename, fields = null) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }
  
  const csvFields = fields || Object.keys(data[0]);
  const csv = parse(data, { fields: csvFields });
  
  const filepath = path.join(exportDir, `${filename}_${Date.now()}.csv`);
  fs.writeFileSync(filepath, csv);
  
  return filepath;
};

// ============================================================================
// EXCEL EXPORT
// ============================================================================

/**
 * Export students to Excel
 * @param {Object} query - Query options
 * @returns {Promise<String>} File path
 */
const exportStudentsExcel = async (query = {}) => {
  const students = await Student.find(query).lean();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');
  
  // Define columns
  worksheet.columns = [
    { header: 'Student ID', key: 'studentId', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Class', key: 'class', width: 10 },
    { header: 'Section', key: 'section', width: 10 },
    { header: 'Roll Number', key: 'rollNumber', width: 15 },
    { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 20 }
  ];
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4CAF50' }
  };
  
  // Add data
  students.forEach(student => {
    worksheet.addRow({
      studentId: student.studentId,
      name: student.name,
      email: student.email,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber || 'N/A',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split('T')[0] : 'N/A',
      status: student.status,
      createdAt: student.createdAt.toISOString()
    });
  });
  
  const filename = `students_${Date.now()}.xlsx`;
  const filepath = path.join(exportDir, filename);
  
  await workbook.xlsx.writeFile(filepath);
  
  return filepath;
};

/**
 * Export challenges to Excel
 * @param {Object} query - Query options
 * @returns {Promise<String>} File path
 */
const exportChallengesExcel = async (query = {}) => {
  const challenges = await Challenge.find(query).lean();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Challenges');
  
  // Define columns
  worksheet.columns = [
    { header: 'Challenge ID', key: 'challengeId', width: 20 },
    { header: 'Student ID', key: 'studentId', width: 20 },
    { header: 'Simulation Type', key: 'simulationType', width: 25 },
    { header: 'Difficulty', key: 'difficulty', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Submitted At', key: 'submittedAt', width: 20 },
    { header: 'Evaluated At', key: 'evaluatedAt', width: 20 }
  ];
  
  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2196F3' }
  };
  
  // Add data
  challenges.forEach(challenge => {
    const row = worksheet.addRow({
      challengeId: challenge.challengeId,
      studentId: challenge.studentId,
      simulationType: challenge.simulationType,
      difficulty: challenge.difficulty,
      status: challenge.status,
      score: challenge.evaluation?.score || 'N/A',
      createdAt: challenge.createdAt.toISOString(),
      submittedAt: challenge.submittedAt ? challenge.submittedAt.toISOString() : 'N/A',
      evaluatedAt: challenge.evaluatedAt ? challenge.evaluatedAt.toISOString() : 'N/A'
    });
    
    // Color code by score
    if (challenge.evaluation?.score) {
      const score = challenge.evaluation.score;
      if (score >= 80) {
        row.getCell('score').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC8E6C9' }
        };
      } else if (score < 60) {
        row.getCell('score').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFCDD2' }
        };
      }
    }
  });
  
  const filename = `challenges_${Date.now()}.xlsx`;
  const filepath = path.join(exportDir, filename);
  
  await workbook.xlsx.writeFile(filepath);
  
  return filepath;
};

/**
 * Export class performance to Excel
 * @param {String} schoolId - School ID
 * @param {Number} className - Class number
 * @param {String} section - Section
 * @returns {Promise<String>} File path
 */
const exportClassPerformanceExcel = async (schoolId, className, section) => {
  const students = await Student.find({ schoolId, class: className, section }).lean();
  const studentIds = students.map(s => s.studentId);
  
  const challenges = await Challenge.find({
    studentId: { $in: studentIds },
    status: 'evaluated'
  }).lean();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Class Performance');
  
  // Define columns
  worksheet.columns = [
    { header: 'Student ID', key: 'studentId', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Total Challenges', key: 'totalChallenges', width: 20 },
    { header: 'Average Score', key: 'averageScore', width: 20 },
    { header: 'Pass Rate', key: 'passRate', width: 15 },
    { header: 'Highest Score', key: 'highestScore', width: 15 },
    { header: 'Lowest Score', key: 'lowestScore', width: 15 }
  ];
  
  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF9800' }
  };
  
  // Calculate performance for each student
  students.forEach(student => {
    const studentChallenges = challenges.filter(c => c.studentId === student.studentId);
    
    if (studentChallenges.length === 0) {
      worksheet.addRow({
        studentId: student.studentId,
        name: student.name,
        totalChallenges: 0,
        averageScore: 'N/A',
        passRate: 'N/A',
        highestScore: 'N/A',
        lowestScore: 'N/A'
      });
      return;
    }
    
    const scores = studentChallenges.map(c => c.evaluation?.score || 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const passedCount = scores.filter(s => s >= 60).length;
    const passRate = (passedCount / scores.length) * 100;
    
    worksheet.addRow({
      studentId: student.studentId,
      name: student.name,
      totalChallenges: studentChallenges.length,
      averageScore: Math.round(avgScore * 100) / 100,
      passRate: `${Math.round(passRate)}%`,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores)
    });
  });
  
  // Add summary row
  worksheet.addRow({});
  const summaryRow = worksheet.addRow({
    studentId: 'CLASS AVERAGE',
    totalChallenges: challenges.length,
    averageScore: challenges.length > 0 
      ? Math.round((challenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / challenges.length) * 100) / 100
      : 0
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE082' }
  };
  
  const filename = `class_${className}_${section}_performance_${Date.now()}.xlsx`;
  const filepath = path.join(exportDir, filename);
  
  await workbook.xlsx.writeFile(filepath);
  
  return filepath;
};

// ============================================================================
// PDF EXPORT
// ============================================================================

/**
 * Export student report to PDF
 * @param {String} studentId - Student ID
 * @returns {Promise<String>} File path
 */
const exportStudentReportPDF = async (studentId) => {
  const student = await Student.findOne({ studentId });
  if (!student) {
    throw new Error('Student not found');
  }
  
  const challenges = await Challenge.find({
    studentId,
    status: 'evaluated'
  }).sort({ createdAt: -1 }).limit(20);
  
  const filename = `student_report_${studentId}_${Date.now()}.pdf`;
  const filepath = path.join(exportDir, filename);
  
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filepath));
  
  // Header
  doc.fontSize(24).text('Student Performance Report', { align: 'center' });
  doc.moveDown();
  
  // Student info
  doc.fontSize(12);
  doc.text(`Name: ${student.name}`);
  doc.text(`Student ID: ${student.studentId}`);
  doc.text(`Class: ${student.class}-${student.section}`);
  doc.text(`Email: ${student.email}`);
  doc.moveDown();
  
  // Performance summary
  if (challenges.length > 0) {
    const avgScore = challenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / challenges.length;
    const passedChallenges = challenges.filter(c => (c.evaluation?.score || 0) >= 60).length;
    const passRate = (passedChallenges / challenges.length) * 100;
    
    doc.fontSize(16).text('Performance Summary', { underline: true });
    doc.fontSize(12);
    doc.moveDown(0.5);
    doc.text(`Total Challenges: ${challenges.length}`);
    doc.text(`Average Score: ${Math.round(avgScore * 100) / 100}%`);
    doc.text(`Pass Rate: ${Math.round(passRate)}%`);
    doc.text(`Challenges Passed: ${passedChallenges}`);
    doc.moveDown();
  }
  
  // Recent challenges
  doc.fontSize(16).text('Recent Challenges', { underline: true });
  doc.fontSize(10);
  doc.moveDown(0.5);
  
  challenges.slice(0, 10).forEach((challenge, index) => {
    doc.text(`${index + 1}. ${challenge.simulationType} (${challenge.difficulty})`, { continued: true });
    doc.text(` - Score: ${challenge.evaluation?.score || 'N/A'}%`, { align: 'right' });
    doc.fontSize(8).fillColor('gray');
    doc.text(`   ${challenge.createdAt.toLocaleDateString()}`, { align: 'left' });
    doc.fillColor('black').fontSize(10);
    doc.moveDown(0.3);
  });
  
  // Footer
  doc.fontSize(8).fillColor('gray');
  doc.text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
    align: 'center'
  });
  
  doc.end();
  
  return filepath;
};

/**
 * Export NEP report to PDF
 * @param {String} reportId - Report ID
 * @returns {Promise<String>} File path
 */
const exportNEPReportPDF = async (reportId) => {
  const report = await NEPReport.findOne({ reportId });
  if (!report) {
    throw new Error('Report not found');
  }
  
  const student = await Student.findOne({ studentId: report.studentId });
  
  const filename = `nep_report_${reportId}_${Date.now()}.pdf`;
  const filepath = path.join(exportDir, filename);
  
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filepath));
  
  // Header
  doc.fontSize(24).fillColor('#4CAF50').text('NEP Report', { align: 'center' });
  doc.fillColor('black');
  doc.moveDown();
  
  // Student info
  doc.fontSize(14).text('Student Information', { underline: true });
  doc.fontSize(12);
  doc.moveDown(0.5);
  if (student) {
    doc.text(`Name: ${student.name}`);
    doc.text(`Class: ${student.class}-${student.section}`);
  }
  doc.text(`Report Period: ${report.period?.start?.toLocaleDateString() || 'N/A'} - ${report.period?.end?.toLocaleDateString() || 'N/A'}`);
  doc.moveDown();
  
  // Summary
  if (report.summary) {
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(11);
    doc.moveDown(0.5);
    doc.text(report.summary, { align: 'justify' });
    doc.moveDown();
  }
  
  // Strengths
  if (report.strengths && report.strengths.length > 0) {
    doc.fontSize(14).text('Strengths', { underline: true });
    doc.fontSize(11);
    doc.moveDown(0.5);
    report.strengths.forEach((strength, index) => {
      doc.text(`${index + 1}. ${strength}`);
    });
    doc.moveDown();
  }
  
  // Areas for improvement
  if (report.areasForImprovement && report.areasForImprovement.length > 0) {
    doc.fontSize(14).text('Areas for Improvement', { underline: true });
    doc.fontSize(11);
    doc.moveDown(0.5);
    report.areasForImprovement.forEach((area, index) => {
      doc.text(`${index + 1}. ${area}`);
    });
    doc.moveDown();
  }
  
  // Competency analysis
  if (report.competencyAnalysis && Object.keys(report.competencyAnalysis).length > 0) {
    doc.addPage();
    doc.fontSize(14).text('Competency Analysis', { underline: true });
    doc.fontSize(10);
    doc.moveDown(0.5);
    
    Object.entries(report.competencyAnalysis).forEach(([competency, data]) => {
      doc.fontSize(12).fillColor('#2196F3').text(competency);
      doc.fillColor('black').fontSize(10);
      doc.text(`Score: ${data.score || 'N/A'}`);
      doc.text(`Level: ${data.level || 'N/A'}`);
      if (data.insights) {
        doc.text(`Insights: ${data.insights}`);
      }
      doc.moveDown();
    });
  }
  
  // Footer
  doc.fontSize(8).fillColor('gray');
  doc.text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
    align: 'center'
  });
  
  doc.end();
  
  return filepath;
};

/**
 * Export class summary to PDF
 * @param {String} schoolId - School ID
 * @param {Number} className - Class number
 * @param {String} section - Section
 * @returns {Promise<String>} File path
 */
const exportClassSummaryPDF = async (schoolId, className, section) => {
  const students = await Student.find({ schoolId, class: className, section });
  const studentIds = students.map(s => s.studentId);
  
  const challenges = await Challenge.find({
    studentId: { $in: studentIds },
    status: 'evaluated'
  });
  
  const filename = `class_${className}_${section}_summary_${Date.now()}.pdf`;
  const filepath = path.join(exportDir, filename);
  
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(filepath));
  
  // Header
  doc.fontSize(24).fillColor('#FF9800').text('Class Performance Summary', { align: 'center' });
  doc.fillColor('black');
  doc.moveDown();
  
  // Class info
  doc.fontSize(14).text(`Class: ${className}-${section}`);
  doc.text(`Total Students: ${students.length}`);
  doc.text(`Total Challenges Completed: ${challenges.length}`);
  doc.moveDown();
  
  // Class statistics
  if (challenges.length > 0) {
    const avgScore = challenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / challenges.length;
    const passedCount = challenges.filter(c => (c.evaluation?.score || 0) >= 60).length;
    const passRate = (passedCount / challenges.length) * 100;
    
    doc.fontSize(14).text('Class Statistics', { underline: true });
    doc.fontSize(12);
    doc.moveDown(0.5);
    doc.text(`Average Score: ${Math.round(avgScore * 100) / 100}%`);
    doc.text(`Pass Rate: ${Math.round(passRate)}%`);
    doc.moveDown();
  }
  
  // Top performers
  const studentPerformance = students.map(student => {
    const studentChallenges = challenges.filter(c => c.studentId === student.studentId);
    const avgScore = studentChallenges.length > 0
      ? studentChallenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / studentChallenges.length
      : 0;
    
    return {
      name: student.name,
      avgScore,
      challengeCount: studentChallenges.length
    };
  }).sort((a, b) => b.avgScore - a.avgScore);
  
  doc.fontSize(14).text('Top Performers', { underline: true });
  doc.fontSize(11);
  doc.moveDown(0.5);
  
  studentPerformance.slice(0, 5).forEach((student, index) => {
    doc.text(`${index + 1}. ${student.name} - ${Math.round(student.avgScore * 100) / 100}% (${student.challengeCount} challenges)`);
  });
  
  // Footer
  doc.fontSize(8).fillColor('gray');
  doc.text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50, {
    align: 'center'
  });
  
  doc.end();
  
  return filepath;
};

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up old export files
 * @param {Number} maxAge - Max age in milliseconds (default: 24 hours)
 * @returns {Number} Number of files deleted
 */
const cleanupExports = async (maxAge = 24 * 60 * 60 * 1000) => {
  const files = fs.readdirSync(exportDir);
  let deletedCount = 0;
  
  files.forEach(file => {
    const filepath = path.join(exportDir, file);
    const stats = fs.statSync(filepath);
    
    if (Date.now() - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filepath);
      deletedCount++;
    }
  });
  
  console.log(`Cleaned up ${deletedCount} old export files`);
  return deletedCount;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // CSV exports
  exportStudentsCSV,
  exportChallengesCSV,
  exportToCSV,
  
  // Excel exports
  exportStudentsExcel,
  exportChallengesExcel,
  exportClassPerformanceExcel,
  
  // PDF exports
  exportStudentReportPDF,
  exportNEPReportPDF,
  exportClassSummaryPDF,
  
  // Cleanup
  cleanupExports,
  
  // Constants
  exportDir
};