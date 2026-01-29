// // controllers/analytics.controller.js
// /**
//  * ANALYTICS CONTROLLER - COMPLETE PRODUCTION VERSION
//  * Advanced analytics and reporting - fully integrated with all models
//  * 
//  * @module controllers/analyticsController
//  */

// const {
//   Student,
//   Teacher,
//   Challenge,
//   School,
//   ClassSection,
//   Activity,
//   NEPReport,
//   AILog
// } = require('../models');
// const logger = require('../utils/logger');
// const attentionService = require('../services/algorithms/attention.algorithm.service');
// const irtService = require('../services/algorithms/irt.algorithm.service');
// const pidService = require('../services/algorithms/pid.algorithm.service');

// // ============================================================================
// // STUDENT ANALYTICS
// // ============================================================================

// /**
//  * @desc    Get student analytics overview
//  * @route   GET /api/analytics/student/:studentId/overview
//  * @access  Private
//  */
// exports.getStudentAnalytics = async (req, res) => {
//   try {
//     const student = await Student.findOne({
//       studentId: req.params.studentId
//     });
    
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found'
//       });
//     }
    
//     // Get challenge history
//     const challenges = await Challenge.find({
//       studentId: student.studentId,
//       status: 'evaluated'
//     }).sort({ evaluatedAt: 1 });
    
//     // Overall performance
//     const totalChallenges = challenges.length;
//     const passedChallenges = challenges.filter(c => c.results?.passed).length;
//     const averageScore = totalChallenges > 0
//       ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
//       : 0;
    
//     // Performance trend (last 30 challenges)
//     const recentChallenges = challenges.slice(-30);
//     const performanceTrend = recentChallenges.map(c => ({
//       date: c.evaluatedAt,
//       score: c.results?.totalScore || 0,
//       passed: c.results?.passed || false
//     }));
    
//     // Competency analysis
//     const competencyData = Object.entries(student.competencyScores).map(([comp, score]) => ({
//       competency: comp,
//       score,
//       level: score >= 80 ? 'Advanced' : score >= 60 ? 'Proficient' : score >= 40 ? 'Developing' : 'Beginning'
//     }));
    
//     // Activity patterns (by day of week)
//     const activityByDay = {};
//     challenges.forEach(c => {
//       const day = new Date(c.generatedAt).getDay();
//       activityByDay[day] = (activityByDay[day] || 0) + 1;
//     });
    
//     // Simulation type distribution
//     const simulationStats = {};
//     challenges.forEach(c => {
//       if (!simulationStats[c.simulationType]) {
//         simulationStats[c.simulationType] = { count: 0, totalScore: 0, passed: 0 };
//       }
//       simulationStats[c.simulationType].count++;
//       simulationStats[c.simulationType].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         simulationStats[c.simulationType].passed++;
//       }
//     });
    
//     const simulationBreakdown = Object.entries(simulationStats).map(([type, stats]) => ({
//       simulationType: type,
//       count: stats.count,
//       averageScore: stats.totalScore / stats.count,
//       passRate: (stats.passed / stats.count * 100)
//     }));
    
//     res.json({
//       success: true,
//       data: {
//         student: {
//           studentId: student.studentId,
//           name: student.name,
//           class: student.class,
//           section: student.section,
//           performanceIndex: student.performanceIndex,
//           grade: student.grade
//         },
//         performance: {
//           totalChallenges,
//           passedChallenges,
//           passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
//           averageScore,
//           currentStreak: student.stats.dailyStreak,
//           bestStreak: student.stats.bestStreak
//         },
//         trends: {
//           performance: performanceTrend,
//           activityByDay: Object.entries(activityByDay).map(([day, count]) => ({
//             day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
//             count
//           }))
//         },
//         competencies: {
//           all: competencyData,
//           weak: student.weakCompetencies.map(comp => ({
//             competency: comp,
//             score: student.competencyScores[comp]
//           })),
//           strong: student.strongCompetencies.map(comp => ({
//             competency: comp,
//             score: student.competencyScores[comp]
//           }))
//         },
//         simulations: simulationBreakdown
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get student analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching student analytics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get student performance trend
//  * @route   GET /api/analytics/student/:studentId/trend
//  * @access  Private
//  */
// exports.getStudentPerformanceTrend = async (req, res) => {
//   try {
//     const { period = '30' } = req.query; // days
    
//     const student = await Student.findOne({
//       studentId: req.params.studentId
//     });
    
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found'
//       });
//     }
    
//     const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
//     const challenges = await Challenge.find({
//       studentId: student.studentId,
//       status: 'evaluated',
//       evaluatedAt: { $gte: startDate }
//     }).sort({ evaluatedAt: 1 });
    
//     // Daily aggregation
//     const dailyData = {};
//     challenges.forEach(c => {
//       const date = c.evaluatedAt.toISOString().split('T')[0];
//       if (!dailyData[date]) {
//         dailyData[date] = { challenges: 0, totalScore: 0, passed: 0 };
//       }
//       dailyData[date].challenges++;
//       dailyData[date].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         dailyData[date].passed++;
//       }
//     });
    
//     const trend = Object.entries(dailyData).map(([date, data]) => ({
//       date,
//       challenges: data.challenges,
//       averageScore: data.totalScore / data.challenges,
//       passRate: (data.passed / data.challenges * 100)
//     }));
    
//     // Calculate improvement
//     const firstHalf = challenges.slice(0, Math.floor(challenges.length / 2));
//     const secondHalf = challenges.slice(Math.floor(challenges.length / 2));
    
//     const firstHalfAvg = firstHalf.length > 0
//       ? firstHalf.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / firstHalf.length
//       : 0;
//     const secondHalfAvg = secondHalf.length > 0
//       ? secondHalf.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / secondHalf.length
//       : 0;
    
//     res.json({
//       success: true,
//       data: {
//         period: parseInt(period),
//         trend,
//         summary: {
//           totalChallenges: challenges.length,
//           averageScore: challenges.length > 0
//             ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / challenges.length
//             : 0,
//           improvement: secondHalfAvg - firstHalfAvg,
//           improvementPercentage: firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100) : 0
//         }
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get student performance trend error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching performance trend',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get student competency analysis
//  * @route   GET /api/analytics/student/:studentId/competencies
//  * @access  Private
//  */
// exports.getStudentCompetencyAnalysis = async (req, res) => {
//   try {
//     const student = await Student.findOne({
//       studentId: req.params.studentId
//     });
    
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found'
//       });
//     }
    
//     // Get challenges with competency data
//     const challenges = await Challenge.find({
//       studentId: student.studentId,
//       status: 'evaluated'
//     }).select('results evaluatedAt');
    
//     // Build competency history
//     const competencyHistory = {};
//     challenges.forEach(c => {
//       if (c.results?.competenciesAssessed) {
//         c.results.competenciesAssessed.forEach(comp => {
//           if (!competencyHistory[comp.competency]) {
//             competencyHistory[comp.competency] = [];
//           }
//           competencyHistory[comp.competency].push({
//             date: c.evaluatedAt,
//             score: comp.score
//           });
//         });
//       }
//     });
    
//     // Analyze each competency
//     const competencyAnalysis = Object.entries(student.competencyScores).map(([comp, currentScore]) => {
//       const history = competencyHistory[comp] || [];
//       const assessmentCount = history.length;
      
//       // Calculate trend
//       let trend = 'stable';
//       if (assessmentCount >= 3) {
//         const recent = history.slice(-3).reduce((sum, h) => sum + h.score, 0) / 3;
//         const older = assessmentCount >= 6
//           ? history.slice(-6, -3).reduce((sum, h) => sum + h.score, 0) / 3
//           : recent;
        
//         if (recent > older + 5) trend = 'improving';
//         else if (recent < older - 5) trend = 'declining';
//       }
      
//       return {
//         competency: comp,
//         currentScore,
//         assessmentCount,
//         trend,
//         history: history.slice(-10), // Last 10 assessments
//         level: currentScore >= 80 ? 'Advanced' : currentScore >= 60 ? 'Proficient' : currentScore >= 40 ? 'Developing' : 'Beginning'
//       };
//     });
    
//     res.json({
//       success: true,
//       data: {
//         competencies: competencyAnalysis,
//         weak: student.weakCompetencies,
//         strong: student.strongCompetencies,
//         recommendations: student.weakCompetencies.slice(0, 3).map(comp => ({
//           competency: comp,
//           score: student.competencyScores[comp],
//           recommendation: `Focus on ${comp.toLowerCase()} through targeted practice`
//         }))
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get student competency analysis error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching competency analysis',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Compare student with class
//  * @route   GET /api/analytics/student/:studentId/compare
//  * @access  Private
//  */
// exports.compareStudentWithClass = async (req, res) => {
//   try {
//     const student = await Student.findOne({
//       studentId: req.params.studentId
//     });
    
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found'
//       });
//     }
    
//     // Get class students
//     const classStudents = await Student.find({
//       schoolId: student.schoolId,
//       class: student.class,
//       section: student.section,
//       active: true
//     });
    
//     // Get school students (same class, all sections)
//     const schoolStudents = await Student.find({
//       schoolId: student.schoolId,
//       class: student.class,
//       active: true
//     });
    
//     // Calculate averages
//     const classAverage = classStudents.length > 0
//       ? classStudents.reduce((sum, s) => sum + s.performanceIndex, 0) / classStudents.length
//       : 0;
    
//     const schoolAverage = schoolStudents.length > 0
//       ? schoolStudents.reduce((sum, s) => sum + s.performanceIndex, 0) / schoolStudents.length
//       : 0;
    
//     // Calculate ranks
//     const classRank = classStudents
//       .sort((a, b) => b.performanceIndex - a.performanceIndex)
//       .findIndex(s => s.studentId === student.studentId) + 1;
    
//     const schoolRank = schoolStudents
//       .sort((a, b) => b.performanceIndex - a.performanceIndex)
//       .findIndex(s => s.studentId === student.studentId) + 1;
    
//     // Percentile
//     const classPercentile = classStudents.length > 0
//       ? ((classStudents.length - classRank + 1) / classStudents.length * 100)
//       : 0;
    
//     const schoolPercentile = schoolStudents.length > 0
//       ? ((schoolStudents.length - schoolRank + 1) / schoolStudents.length * 100)
//       : 0;
    
//     // Competency comparison
//     const competencyComparison = {};
//     Object.keys(student.competencyScores).forEach(comp => {
//       const classScores = classStudents.map(s => s.competencyScores[comp] || 0);
//       const classAvg = classScores.reduce((a, b) => a + b, 0) / classScores.length;
      
//       competencyComparison[comp] = {
//         studentScore: student.competencyScores[comp],
//         classAverage: classAvg,
//         difference: student.competencyScores[comp] - classAvg,
//         aboveAverage: student.competencyScores[comp] > classAvg
//       };
//     });
    
//     res.json({
//       success: true,
//       data: {
//         student: {
//           performanceIndex: student.performanceIndex,
//           grade: student.grade
//         },
//         class: {
//           average: classAverage,
//           rank: classRank,
//           totalStudents: classStudents.length,
//           percentile: classPercentile
//         },
//         school: {
//           average: schoolAverage,
//           rank: schoolRank,
//           totalStudents: schoolStudents.length,
//           percentile: schoolPercentile
//         },
//         comparison: {
//           aboveClassAverage: student.performanceIndex > classAverage,
//           aboveSchoolAverage: student.performanceIndex > schoolAverage,
//           classPerformance: student.performanceIndex - classAverage,
//           schoolPerformance: student.performanceIndex - schoolAverage
//         },
//         competencies: competencyComparison
//       }
//     });
    
//   } catch (error) {
//     logger.error('Compare student with class error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error comparing student',
//       error: error.message
//     });
//   }
// };

// // ============================================================================
// // CLASS ANALYTICS
// // ============================================================================

// /**
//  * @desc    Get class analytics
//  * @route   GET /api/analytics/class/:classNum/:section
//  * @access  Private (Teacher/Admin)
//  */
// exports.getClassAnalytics = async (req, res) => {
//   try {
//     const { classNum, section } = req.params;
//     const { schoolId } = req.query;
    
//     const students = await Student.find({
//       schoolId,
//       class: parseInt(classNum),
//       section: section.toUpperCase(),
//       active: true
//     });
    
//     if (students.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No students found in this class'
//       });
//     }
    
//     // Overall class statistics
//     const totalStudents = students.length;
//     const averagePerformance = students.reduce((sum, s) => sum + s.performanceIndex, 0) / totalStudents;
    
//     // Performance distribution
//     const distribution = {
//       excellent: students.filter(s => s.performanceIndex >= 90).length,
//       good: students.filter(s => s.performanceIndex >= 70 && s.performanceIndex < 90).length,
//       average: students.filter(s => s.performanceIndex >= 50 && s.performanceIndex < 70).length,
//       needsImprovement: students.filter(s => s.performanceIndex < 50).length
//     };
    
//     // Grade distribution
//     const gradeDistribution = {};
//     students.forEach(s => {
//       gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
//     });
    
//     // Competency analysis
//     const competencyScores = {};
//     students.forEach(student => {
//       Object.entries(student.competencyScores).forEach(([comp, score]) => {
//         if (!competencyScores[comp]) {
//           competencyScores[comp] = [];
//         }
//         competencyScores[comp].push(score);
//       });
//     });
    
//     const competencyAverages = Object.entries(competencyScores).map(([comp, scores]) => ({
//       competency: comp,
//       average: scores.reduce((a, b) => a + b, 0) / scores.length,
//       min: Math.min(...scores),
//       max: Math.max(...scores),
//       studentCount: scores.length
//     }));
    
//     // Get class challenges
//     const studentIds = students.map(s => s.studentId);
//     const challenges = await Challenge.find({
//       studentId: { $in: studentIds },
//       status: 'evaluated'
//     });
    
//     const totalChallenges = challenges.length;
//     const averageChallengeScore = totalChallenges > 0
//       ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
//       : 0;
    
//     // Top performers
//     const topPerformers = students
//       .sort((a, b) => b.performanceIndex - a.performanceIndex)
//       .slice(0, 5)
//       .map(s => ({
//         studentId: s.studentId,
//         name: s.name,
//         performanceIndex: s.performanceIndex,
//         grade: s.grade
//       }));
    
//     // Students needing attention
//     const needsAttention = students
//       .filter(s => s.performanceIndex < 50)
//       .sort((a, b) => a.performanceIndex - b.performanceIndex)
//       .slice(0, 5)
//       .map(s => ({
//         studentId: s.studentId,
//         name: s.name,
//         performanceIndex: s.performanceIndex,
//         weakCompetencies: s.weakCompetencies
//       }));
    
//     res.json({
//       success: true,
//       data: {
//         class: {
//           class: parseInt(classNum),
//           section: section.toUpperCase(),
//           totalStudents
//         },
//         performance: {
//           averagePerformance,
//           distribution,
//           gradeDistribution
//         },
//         challenges: {
//           total: totalChallenges,
//           averageScore: averageChallengeScore,
//           perStudent: totalStudents > 0 ? (totalChallenges / totalStudents) : 0
//         },
//         competencies: competencyAverages,
//         topPerformers,
//         needsAttention
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get class analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching class analytics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get class performance trend
//  * @route   GET /api/analytics/class/:classNum/:section/trend
//  * @access  Private (Teacher/Admin)
//  */
// exports.getClassPerformanceTrend = async (req, res) => {
//   try {
//     const { classNum, section } = req.params;
//     const { schoolId, period = '30' } = req.query;
    
//     const students = await Student.find({
//       schoolId,
//       class: parseInt(classNum),
//       section: section.toUpperCase(),
//       active: true
//     });
    
//     const studentIds = students.map(s => s.studentId);
    
//     const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
//     const challenges = await Challenge.find({
//       studentId: { $in: studentIds },
//       status: 'evaluated',
//       evaluatedAt: { $gte: startDate }
//     }).sort({ evaluatedAt: 1 });
    
//     // Daily aggregation
//     const dailyData = {};
//     challenges.forEach(c => {
//       const date = c.evaluatedAt.toISOString().split('T')[0];
//       if (!dailyData[date]) {
//         dailyData[date] = { challenges: 0, totalScore: 0, passed: 0 };
//       }
//       dailyData[date].challenges++;
//       dailyData[date].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         dailyData[date].passed++;
//       }
//     });
    
//     const trend = Object.entries(dailyData).map(([date, data]) => ({
//       date,
//       challenges: data.challenges,
//       averageScore: data.totalScore / data.challenges,
//       passRate: (data.passed / data.challenges * 100)
//     }));
    
//     res.json({
//       success: true,
//       data: {
//         period: parseInt(period),
//         trend,
//         summary: {
//           totalChallenges: challenges.length,
//           totalStudents: students.length,
//           averageScore: challenges.length > 0
//             ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / challenges.length
//             : 0
//         }
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get class performance trend error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching class trend',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Compare classes
//  * @route   GET /api/analytics/class/compare
//  * @access  Private (Admin)
//  */
// exports.compareClasses = async (req, res) => {
//   try {
//     const { schoolId } = req.query;
    
//     // Get all classes
//     const allStudents = await Student.find({
//       schoolId,
//       active: true
//     });
    
//     // Group by class and section
//     const classSections = {};
//     allStudents.forEach(student => {
//       const key = `${student.class}-${student.section}`;
//       if (!classSections[key]) {
//         classSections[key] = {
//           class: student.class,
//           section: student.section,
//           students: []
//         };
//       }
//       classSections[key].students.push(student);
//     });
    
//     // Calculate statistics for each class
//     const classComparison = Object.values(classSections).map(cls => {
//       const avgPerformance = cls.students.reduce((sum, s) => sum + s.performanceIndex, 0) / cls.students.length;
      
//       return {
//         class: cls.class,
//         section: cls.section,
//         totalStudents: cls.students.length,
//         averagePerformance: avgPerformance,
//         topPerformer: Math.max(...cls.students.map(s => s.performanceIndex)),
//         lowestPerformer: Math.min(...cls.students.map(s => s.performanceIndex)),
//         excellentCount: cls.students.filter(s => s.performanceIndex >= 90).length,
//         needsImprovementCount: cls.students.filter(s => s.performanceIndex < 50).length
//       };
//     });
    
//     // Sort by average performance
//     classComparison.sort((a, b) => b.averagePerformance - a.averagePerformance);
    
//     res.json({
//       success: true,
//       data: {
//         classes: classComparison,
//         totalClasses: classComparison.length,
//         bestPerforming: classComparison[0],
//         needsSupport: classComparison[classComparison.length - 1]
//       }
//     });
    
//   } catch (error) {
//     logger.error('Compare classes error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error comparing classes',
//       error: error.message
//     });
//   }
// };

// // ============================================================================
// // SCHOOL ANALYTICS
// // ============================================================================

// /**
//  * @desc    Get school analytics overview
//  * @route   GET /api/analytics/school/:schoolId/overview
//  * @access  Private (Admin)
//  */
// exports.getSchoolAnalytics = async (req, res) => {
//   try {
//     const { schoolId } = req.params;
    
//     const school = await School.findOne({ schoolId });
    
//     if (!school) {
//       return res.status(404).json({
//         success: false,
//         message: 'School not found'
//       });
//     }
    
//     // Student statistics
//     const students = await Student.find({ schoolId, active: true });
//     const totalStudents = students.length;
//     const averagePerformance = totalStudents > 0
//       ? students.reduce((sum, s) => sum + s.performanceIndex, 0) / totalStudents
//       : 0;
    
//     // Teacher statistics
//     const totalTeachers = await Teacher.countDocuments({ schoolId, active: true });
//     const approvedTeachers = await Teacher.countDocuments({ schoolId, status: 'APPROVED' });
    
//     // Challenge statistics
//     const challenges = await Challenge.find({ schoolId, status: 'evaluated' });
//     const totalChallenges = challenges.length;
//     const averageChallengeScore = totalChallenges > 0
//       ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
//       : 0;
//     const passRate = totalChallenges > 0
//       ? (challenges.filter(c => c.results?.passed).length / totalChallenges * 100)
//       : 0;
    
//     // Performance distribution
//     const distribution = {
//       excellent: students.filter(s => s.performanceIndex >= 90).length,
//       good: students.filter(s => s.performanceIndex >= 70 && s.performanceIndex < 90).length,
//       average: students.filter(s => s.performanceIndex >= 50 && s.performanceIndex < 70).length,
//       needsImprovement: students.filter(s => s.performanceIndex < 50).length
//     };
    
//     // Competency averages
//     const competencyScores = {};
//     students.forEach(student => {
//       Object.entries(student.competencyScores).forEach(([comp, score]) => {
//         if (!competencyScores[comp]) {
//           competencyScores[comp] = [];
//         }
//         competencyScores[comp].push(score);
//       });
//     });
    
//     const competencyAverages = Object.entries(competencyScores).map(([comp, scores]) => ({
//       competency: comp,
//       average: scores.reduce((a, b) => a + b, 0) / scores.length
//     }));
    
//     // Activity statistics (last 30 days)
//     const activityCount = await Activity.countDocuments({
//       schoolId,
//       createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
//     });
    
//     // AI usage statistics
//     const aiLogs = await AILog.find({
//       schoolId,
//       createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
//     });
    
//     const totalAIOperations = aiLogs.length;
//     const totalTokensUsed = aiLogs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
//     const totalAICost = aiLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
    
//     res.json({
//       success: true,
//       data: {
//         school: {
//           schoolId: school.schoolId,
//           name: school.schoolName,
//           city: school.city,
//           state: school.state
//         },
//         students: {
//           total: totalStudents,
//           averagePerformance,
//           distribution
//         },
//         teachers: {
//           total: totalTeachers,
//           approved: approvedTeachers
//         },
//         challenges: {
//           total: totalChallenges,
//           averageScore: averageChallengeScore,
//           passRate,
//           perStudent: totalStudents > 0 ? (totalChallenges / totalStudents) : 0
//         },
//         competencies: competencyAverages,
//         activity: {
//           last30Days: activityCount
//         },
//         aiUsage: {
//           operations: totalAIOperations,
//           tokensUsed: totalTokensUsed,
//           estimatedCost: totalAICost
//         }
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get school analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching school analytics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get school performance trend
//  * @route   GET /api/analytics/school/:schoolId/trend
//  * @access  Private (Admin)
//  */
// exports.getSchoolPerformanceTrend = async (req, res) => {
//   try {
//     const { schoolId } = req.params;
//     const { period = '30' } = req.query;
    
//     const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
//     const challenges = await Challenge.find({
//       schoolId,
//       status: 'evaluated',
//       evaluatedAt: { $gte: startDate }
//     }).sort({ evaluatedAt: 1 });
    
//     // Daily aggregation
//     const dailyData = {};
//     challenges.forEach(c => {
//       const date = c.evaluatedAt.toISOString().split('T')[0];
//       if (!dailyData[date]) {
//         dailyData[date] = { challenges: 0, totalScore: 0, passed: 0 };
//       }
//       dailyData[date].challenges++;
//       dailyData[date].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         dailyData[date].passed++;
//       }
//     });
    
//     const trend = Object.entries(dailyData).map(([date, data]) => ({
//       date,
//       challenges: data.challenges,
//       averageScore: data.totalScore / data.challenges,
//       passRate: (data.passed / data.challenges * 100)
//     }));
    
//     // Weekly aggregation
//     const weeklyData = {};
//     challenges.forEach(c => {
//       const week = `Week ${Math.ceil((Date.now() - c.evaluatedAt) / (7 * 24 * 60 * 60 * 1000))}`;
//       if (!weeklyData[week]) {
//         weeklyData[week] = { challenges: 0, totalScore: 0, passed: 0 };
//       }
//       weeklyData[week].challenges++;
//       weeklyData[week].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         weeklyData[week].passed++;
//       }
//     });
    
//     const weeklyTrend = Object.entries(weeklyData).map(([week, data]) => ({
//       week,
//       challenges: data.challenges,
//       averageScore: data.totalScore / data.challenges,
//       passRate: (data.passed / data.challenges * 100)
//     }));
    
//     res.json({
//       success: true,
//       data: {
//         period: parseInt(period),
//         daily: trend,
//         weekly: weeklyTrend,
//         summary: {
//           totalChallenges: challenges.length,
//           averageScore: challenges.length > 0
//             ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / challenges.length
//             : 0
//         }
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get school performance trend error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching school trend',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get school competency analysis
//  * @route   GET /api/analytics/school/:schoolId/competencies
//  * @access  Private (Admin)
//  */
// exports.getSchoolCompetencyAnalysis = async (req, res) => {
//   try {
//     const { schoolId } = req.params;
    
//     const students = await Student.find({ schoolId, active: true });
    
//     if (students.length === 0) {
//       return res.json({
//         success: true,
//         data: {
//           competencies: [],
//           message: 'No students found'
//         }
//       });
//     }
    
//     // Aggregate competency scores
//     const competencyScores = {};
//     students.forEach(student => {
//       Object.entries(student.competencyScores).forEach(([comp, score]) => {
//         if (!competencyScores[comp]) {
//           competencyScores[comp] = {
//             scores: [],
//             weakCount: 0,
//             strongCount: 0
//           };
//         }
//         competencyScores[comp].scores.push(score);
//         if (student.weakCompetencies.includes(comp)) {
//           competencyScores[comp].weakCount++;
//         }
//         if (student.strongCompetencies.includes(comp)) {
//           competencyScores[comp].strongCount++;
//         }
//       });
//     });
    
//     // Calculate statistics for each competency
//     const competencyAnalysis = Object.entries(competencyScores).map(([comp, data]) => {
//       const scores = data.scores;
//       const average = scores.reduce((a, b) => a + b, 0) / scores.length;
//       const sorted = [...scores].sort((a, b) => a - b);
//       const median = sorted[Math.floor(sorted.length / 2)];
      
//       return {
//         competency: comp,
//         average,
//         median,
//         min: Math.min(...scores),
//         max: Math.max(...scores),
//         studentCount: scores.length,
//         weakCount: data.weakCount,
//         strongCount: data.strongCount,
//         needsAttention: data.weakCount > scores.length * 0.3, // More than 30% weak
//         level: average >= 80 ? 'Advanced' : average >= 60 ? 'Proficient' : average >= 40 ? 'Developing' : 'Beginning'
//       };
//     });
    
//     // Sort by average (lowest first to identify areas needing attention)
//     competencyAnalysis.sort((a, b) => a.average - b.average);
    
//     res.json({
//       success: true,
//       data: {
//         competencies: competencyAnalysis,
//         totalStudents: students.length,
//         weakestCompetencies: competencyAnalysis.slice(0, 3),
//         strongestCompetencies: competencyAnalysis.slice(-3).reverse(),
//         needsAttention: competencyAnalysis.filter(c => c.needsAttention)
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get school competency analysis error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching competency analysis',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get engagement metrics
//  * @route   GET /api/analytics/school/:schoolId/engagement
//  * @access  Private (Admin)
//  */
// exports.getEngagementMetrics = async (req, res) => {
//   try {
//     const { schoolId } = req.params;
//     const { period = '30' } = req.query;
    
//     const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
//     const students = await Student.find({ schoolId, active: true });
//     const totalStudents = students.length;
    
//     // Active students (challenged in period)
//     const activeChallenges = await Challenge.find({
//       schoolId,
//       generatedAt: { $gte: startDate }
//     }).distinct('studentId');
    
//     const activeStudents = activeChallenges.length;
//     const engagementRate = totalStudents > 0 ? (activeStudents / totalStudents * 100) : 0;
    
//     // Daily active users
//     const dailyActive = await Challenge.aggregate([
//       {
//         $match: {
//           schoolId,
//           generatedAt: { $gte: startDate }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' }
//           },
//           uniqueStudents: { $addToSet: '$studentId' }
//         }
//       },
//       {
//         $project: {
//           date: '$_id',
//           count: { $size: '$uniqueStudents' }
//         }
//       },
//       { $sort: { date: 1 } }
//     ]);
    
//     // Student activity distribution
//     const studentActivity = await Challenge.aggregate([
//       {
//         $match: {
//           schoolId,
//           generatedAt: { $gte: startDate }
//         }
//       },
//       {
//         $group: {
//           _id: '$studentId',
//           challengeCount: { $sum: 1 }
//         }
//       }
//     ]);
    
//     const activityDistribution = {
//       veryActive: studentActivity.filter(s => s.challengeCount >= 20).length,
//       active: studentActivity.filter(s => s.challengeCount >= 10 && s.challengeCount < 20).length,
//       moderate: studentActivity.filter(s => s.challengeCount >= 5 && s.challengeCount < 10).length,
//       low: studentActivity.filter(s => s.challengeCount < 5).length,
//       inactive: totalStudents - studentActivity.length
//     };
    
//     // Average session duration (estimated)
//     const challenges = await Challenge.find({
//       schoolId,
//       status: 'evaluated',
//       generatedAt: { $gte: startDate }
//     }).select('results.timeSpent');
    
//     const averageSessionDuration = challenges.length > 0
//       ? challenges.reduce((sum, c) => sum + (c.results?.timeSpent || 0), 0) / challenges.length
//       : 0;
    
//     res.json({
//       success: true,
//       data: {
//         period: parseInt(period),
//         totalStudents,
//         activeStudents,
//         engagementRate,
//         dailyActive: dailyActive.map(d => ({
//           date: d.date,
//           activeStudents: d.count
//         })),
//         activityDistribution,
//         averageSessionDuration: Math.round(averageSessionDuration) // minutes
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get engagement metrics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching engagement metrics',
//       error: error.message
//     });
//   }
// };

// // ============================================================================
// // SIMULATION ANALYTICS
// // ============================================================================

// /**
//  * @desc    Get simulation analytics
//  * @route   GET /api/analytics/simulations
//  * @access  Private
//  */
// exports.getSimulationAnalytics = async (req, res) => {
//   try {
//     const { schoolId } = req.query;
    
//     const query = schoolId ? { schoolId, status: 'evaluated' } : { status: 'evaluated' };
    
//     const challenges = await Challenge.find(query);
    
//     // Aggregate by simulation type
//     const simulationStats = {};
//     challenges.forEach(c => {
//       if (!simulationStats[c.simulationType]) {
//         simulationStats[c.simulationType] = {
//           count: 0,
//           totalScore: 0,
//           passed: 0,
//           difficulties: { easy: 0, medium: 0, hard: 0 }
//         };
//       }
//       simulationStats[c.simulationType].count++;
//       simulationStats[c.simulationType].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         simulationStats[c.simulationType].passed++;
//       }
//       if (c.difficulty) {
//         simulationStats[c.simulationType].difficulties[c.difficulty]++;
//       }
//     });
    
//     const analytics = Object.entries(simulationStats).map(([type, stats]) => ({
//       simulationType: type,
//       totalChallenges: stats.count,
//       averageScore: stats.totalScore / stats.count,
//       passRate: (stats.passed / stats.count * 100),
//       difficulties: stats.difficulties,
//       popularity: stats.count // Can be used for ranking
//     }));
    
//     // Sort by popularity
//     analytics.sort((a, b) => b.totalChallenges - a.totalChallenges);
    
//     res.json({
//       success: true,
//       data: {
//         simulations: analytics,
//         totalSimulationTypes: analytics.length,
//         mostPopular: analytics[0],
//         totalChallenges: challenges.length
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get simulation analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching simulation analytics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get simulation performance by difficulty
//  * @route   GET /api/analytics/simulations/difficulty
//  * @access  Private
//  */
// exports.getSimulationPerformanceByDifficulty = async (req, res) => {
//   try {
//     const { schoolId, simulationType } = req.query;
    
//     const query = { status: 'evaluated' };
//     if (schoolId) query.schoolId = schoolId;
//     if (simulationType) query.simulationType = simulationType;
    
//     const challenges = await Challenge.find(query);
    
//     // Aggregate by difficulty
//     const difficultyStats = {};
//     challenges.forEach(c => {
//       const diff = c.difficulty || 'medium';
//       if (!difficultyStats[diff]) {
//         difficultyStats[diff] = {
//           count: 0,
//           totalScore: 0,
//           passed: 0
//         };
//       }
//       difficultyStats[diff].count++;
//       difficultyStats[diff].totalScore += c.results?.totalScore || 0;
//       if (c.results?.passed) {
//         difficultyStats[diff].passed++;
//       }
//     });
    
//     const analytics = Object.entries(difficultyStats).map(([diff, stats]) => ({
//       difficulty: diff,
//       totalChallenges: stats.count,
//       averageScore: stats.totalScore / stats.count,
//       passRate: (stats.passed / stats.count * 100)
//     }));
    
//     res.json({
//       success: true,
//       data: {
//         difficulties: analytics,
//         simulationType: simulationType || 'all'
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get simulation difficulty analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching difficulty analytics',
//       error: error.message
//     });
//   }
// };

// // ============================================================================
// // AI USAGE ANALYTICS
// // ============================================================================

// /**
//  * @desc    Get AI usage statistics
//  * @route   GET /api/analytics/ai-usage
//  * @access  Private (Admin)
//  */
// exports.getAIUsageStatistics = async (req, res) => {
//   try {
//     const { schoolId, period = '30' } = req.query;
    
//     const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
//     const query = { createdAt: { $gte: startDate } };
//     if (schoolId) query.schoolId = schoolId;
    
//     const aiLogs = await AILog.find(query);
    
//     // Overall statistics
//     const totalOperations = aiLogs.length;
//     const successfulOperations = aiLogs.filter(log => log.success).length;
//     const totalTokensUsed = aiLogs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
//     const totalCost = aiLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
//     const averageResponseTime = aiLogs.length > 0
//       ? aiLogs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / aiLogs.length
//       : 0;
    
//     // By operation type
//     const byOperation = {};
//     aiLogs.forEach(log => {
//       if (!byOperation[log.operation]) {
//         byOperation[log.operation] = {
//           count: 0,
//           tokens: 0,
//           cost: 0,
//           avgResponseTime: 0,
//           successful: 0
//         };
//       }
//       byOperation[log.operation].count++;
//       byOperation[log.operation].tokens += log.tokensUsed || 0;
//       byOperation[log.operation].cost += log.cost || 0;
//       byOperation[log.operation].avgResponseTime += log.responseTime || 0;
//       if (log.success) {
//         byOperation[log.operation].successful++;
//       }
//     });
    
//     Object.keys(byOperation).forEach(op => {
//       byOperation[op].avgResponseTime = byOperation[op].avgResponseTime / byOperation[op].count;
//       byOperation[op].successRate = (byOperation[op].successful / byOperation[op].count * 100);
//     });
    
//     // Daily usage
//     const dailyUsage = {};
//     aiLogs.forEach(log => {
//       const date = log.createdAt.toISOString().split('T')[0];
//       if (!dailyUsage[date]) {
//         dailyUsage[date] = { operations: 0, tokens: 0, cost: 0 };
//       }
//       dailyUsage[date].operations++;
//       dailyUsage[date].tokens += log.tokensUsed || 0;
//       dailyUsage[date].cost += log.cost || 0;
//     });
    
//     const daily = Object.entries(dailyUsage).map(([date, data]) => ({
//       date,
//       operations: data.operations,
//       tokensUsed: data.tokens,
//       cost: data.cost
//     }));
    
//     res.json({
//       success: true,
//       data: {
//         period: parseInt(period),
//         overall: {
//           totalOperations,
//           successfulOperations,
//           successRate: totalOperations > 0 ? (successfulOperations / totalOperations * 100) : 0,
//           totalTokensUsed,
//           totalCost,
//           averageResponseTime: Math.round(averageResponseTime)
//         },
//         byOperation,
//         daily
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get AI usage statistics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching AI usage statistics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get AI cost projection
//  * @route   GET /api/analytics/ai-usage/projection
//  * @access  Private (Admin)
//  */
// exports.getAICostProjection = async (req, res) => {
//   try {
//     const { schoolId } = req.query;
    
//     // Last 30 days actual usage
//     const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
//     const query = { createdAt: { $gte: last30Days } };
//     if (schoolId) query.schoolId = schoolId;
    
//     const aiLogs = await AILog.find(query);
    
//     const last30DaysCost = aiLogs.reduce((sum, log) => sum + (log.cost || 0), 0);
//     const last30DaysTokens = aiLogs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
//     const last30DaysOperations = aiLogs.length;
    
//     // Projections
//     const dailyAvgCost = last30DaysCost / 30;
//     const monthlyProjection = dailyAvgCost * 30;
//     const yearlyProjection = dailyAvgCost * 365;
    
//     const dailyAvgTokens = last30DaysTokens / 30;
//     const monthlyTokenProjection = dailyAvgTokens * 30;
//     const yearlyTokenProjection = dailyAvgTokens * 365;
    
//     res.json({
//       success: true,
//       data: {
//         actual: {
//           last30DaysCost,
//           last30DaysTokens,
//           last30DaysOperations,
//           dailyAvgCost,
//           dailyAvgTokens
//         },
//         projections: {
//           monthly: {
//             cost: monthlyProjection,
//             tokens: monthlyTokenProjection
//           },
//           yearly: {
//             cost: yearlyProjection,
//             tokens: yearlyTokenProjection
//           }
//         },
//         breakdown: {
//           costPerOperation: last30DaysOperations > 0 ? (last30DaysCost / last30DaysOperations) : 0,
//           tokensPerOperation: last30DaysOperations > 0 ? (last30DaysTokens / last30DaysOperations) : 0
//         }
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get AI cost projection error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error calculating AI cost projection',
//       error: error.message
//     });
//   }
// };

// // ============================================================================
// // EXPORT ANALYTICS
// // ============================================================================

// /**
//  * @desc    Export analytics to CSV
//  * @route   GET /api/analytics/export
//  * @access  Private (Admin)
//  */
// exports.exportAnalytics = async (req, res) => {
//   try {
//     const { type, schoolId, startDate, endDate } = req.query;
    
//     // This would generate CSV exports
//     // For now, acknowledge the request
    
//     res.json({
//       success: true,
//       message: 'Export functionality - would generate CSV/Excel export',
//       data: {
//         type,
//         schoolId,
//         startDate,
//         endDate,
//         note: 'Implementation would use a CSV generation library'
//       }
//     });
    
//   } catch (error) {
//     logger.error('Export analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error exporting analytics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get custom report
//  * @route   POST /api/analytics/custom-report
//  * @access  Private (Admin)
//  */
// exports.getCustomReport = async (req, res) => {
//   try {
//     const {
//       schoolId,
//       startDate,
//       endDate,
//       metrics, // Array: ['students', 'challenges', 'competencies', 'engagement']
//       groupBy // 'class', 'simulation', 'difficulty', etc.
//     } = req.body;
    
//     // This would generate custom reports based on user-defined parameters
//     // For now, acknowledge the request
    
//     res.json({
//       success: true,
//       message: 'Custom report functionality',
//       data: {
//         schoolId,
//         startDate,
//         endDate,
//         metrics,
//         groupBy,
//         note: 'Implementation would aggregate data based on specified parameters'
//       }
//     });
    
//   } catch (error) {
//     logger.error('Get custom report error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error generating custom report',
//       error: error.message
//     });
//   }
// };



// /**
//  * @desc    Get attention statistics
//  * @route   GET /api/analytics/attention/:studentId
//  * @access  Private (Teacher/Admin)
//  */
// exports.getAttentionStatistics = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const stats = await attentionService.getAttentionStatistics(studentId);

//     res.json({
//       success: true,
//       statistics: stats
//     });

//   } catch (error) {
//     logger.error('Get attention stats error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching attention statistics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Analyze with multi-head attention
//  * @route   POST /api/analytics/attention/:studentId/analyze
//  * @access  Private (Teacher/Admin)
//  */
// exports.analyzeAttention = async (req, res) => {
//   try {
//     const { studentId } = req.params;
//     const { context, numHeads } = req.body;

//     const analysis = await attentionService.analyzeWithMultiHead(
//       studentId,
//       context || {},
//       numHeads || 4
//     );

//     res.json({
//       success: true,
//       analysis
//     });

//   } catch (error) {
//     logger.error('Analyze attention error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error analyzing attention',
//       error: error.message
//     });
//   }
// };


// /**
//  * @desc    Get student IRT statistics
//  * @route   GET /api/analytics/irt/:studentId
//  * @access  Private (Teacher/Admin/Student-self)
//  */
// exports.getIRTStatistics = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     // Authorization check
//     if (req.user.userType === 'student' && req.user.userId !== studentId) {
//       return res.status(403).json({
//         success: false,
//         message: 'Not authorized'
//       });
//     }

//     const stats = await irtService.getIRTStatistics(studentId);

//     res.json({
//       success: true,
//       statistics: stats
//     });

//   } catch (error) {
//     logger.error('Get IRT statistics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching IRT statistics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Recalibrate all items
//  * @route   POST /api/analytics/irt/calibrate-all
//  * @access  Private (Admin)
//  */
// exports.recalibrateAllItems = async (req, res) => {
//   try {
//     const { Challenge } = require('../../models');

//     // Get all unique challenges
//     const challenges = await Challenge.distinct('challengeId');

//     const results = {
//       total: challenges.length,
//       calibrated: 0,
//       failed: 0,
//       insufficient: 0
//     };

//     for (const challengeId of challenges) {
//       const result = await irtService.calibrateItem(challengeId);
      
//       if (result.calibrated) {
//         results.calibrated++;
//       } else if (result.reason === 'insufficient_data') {
//         results.insufficient++;
//       } else {
//         results.failed++;
//       }
//     }

//     res.json({
//       success: true,
//       message: 'Item calibration completed',
//       results
//     });

//   } catch (error) {
//     logger.error('Recalibrate all items error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error calibrating items',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Get optimal difficulty recommendation
//  * @route   GET /api/analytics/irt/:studentId/optimal-difficulty
//  * @access  Private (Teacher/Admin)
//  */
// exports.getOptimalDifficultyRecommendation = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const recommendation = await irtService.getOptimalDifficulty(studentId);

//     res.json({
//       success: true,
//       recommendation
//     });

//   } catch (error) {
//     logger.error('Get optimal difficulty error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error getting recommendation',
//       error: error.message
//     });
//   }
// };



// /**
//  * @desc    Get PID statistics
//  * @route   GET /api/analytics/pid/:studentId
//  * @access  Private (Teacher/Admin/Student-self)
//  */
// exports.getPIDStatistics = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const stats = await pidService.getStatistics(studentId);

//     res.json({
//       success: true,
//       statistics: stats
//     });

//   } catch (error) {
//     logger.error('Get PID statistics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error fetching PID statistics',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Auto-tune PID parameters
//  * @route   POST /api/analytics/pid/:studentId/auto-tune
//  * @access  Private (Admin)
//  */
// exports.autoTunePID = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const result = await pidService.autoTune(studentId);

//     res.json({
//       success: result.tuned,
//       result
//     });

//   } catch (error) {
//     logger.error('Auto-tune PID error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error auto-tuning PID',
//       error: error.message
//     });
//   }
// };

// /**
//  * @desc    Reset PID controller
//  * @route   POST /api/analytics/pid/:studentId/reset
//  * @access  Private (Admin)
//  */
// exports.resetPID = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const result = await pidService.reset(studentId);

//     res.json(result);

//   } catch (error) {
//     logger.error('Reset PID error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error resetting PID',
//       error: error.message
//     });
//   }
// };

// module.exports = exports;

/**
 * ANALYTICS CONTROLLER — LEDGER FIRST (AUTHORITATIVE)
 * Source of Truth: Ledger
 * Student / Challenge: metadata only
 */

const {
  Student,
  Teacher,
  School,
  Activity,
  AILog,
  Ledger
} = require('../models');

const analyticsService = require('../services/analytics.service');
//const ledgerService = require('../services/ledgerService');
const logger = require('../utils/logger');

// ============================================================================
// STUDENT ANALYTICS (LEDGER CPI)
// ============================================================================

/**
 * @route GET /api/analytics/student/:studentId/overview
 */
// exports.getStudentAnalytics = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     const student = await Student.findOne({ studentId }).lean();
//     if (!student) {
//       return res.status(404).json({ success: false, message: 'Student not found' });
//     }

//     // 🔐 Ledger = truth
//     const ledgerEvents = await Ledger.find({ studentId })
//       .sort({ timestamp: 1 })
//       .lean();

//     if (ledgerEvents.length === 0) {
//       return res.json({
//         success: true,
//         data: {
//           student: {
//             studentId,
//             name: student.name,
//             class: student.class,
//             section: student.section
//           },
//           learningIndex: null,
//           message: 'No ledger events found for this student'
//         }
//       });
//     }

//     const cpi = await analyticsService.generateCPI(studentId, ledgerEvents);
//     const trends = await analyticsService.calculateCompetencyTrends(studentId, ledgerEvents);

//     res.json({
//       success: true,
//       data: {
//         student: {
//           studentId,
//           name: student.name,
//           class: student.class,
//           section: student.section
//         },
//         learningIndex: {
//           cpi: cpi.cpi,
//           consistency: cpi.consistencyScore,
//           growthRate: cpi.growthRate,
//           driftDetected: cpi.driftDetected,
//           assessmentCount: cpi.assessmentCount
//         },
//         competencies: {
//           scores: cpi.competencyScores,
//           strengths: cpi.strengthAreas,
//           improvements: cpi.improvementAreas,
//           latestScores: cpi.latestScores
//         },
//         trends,
//         verification: {
//           ledgerBacked: true,
//           hashAnchored: true
//         }
//       }
//     });

//   } catch (error) {
//     logger.error('Ledger student analytics error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to compute ledger-based analytics',
//       error: error.message
//     });
//   }
// };
exports.getStudentAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 1️⃣ Validate student
    const student = await Student.findOne({ studentId }).lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // 2️⃣ Ledger = single source of truth
    const ledgerEvents = await Ledger.find({
      studentId,
      eventType: Ledger.EVENT_TYPES.CHALLENGE_EVALUATED
    })
      .sort({ timestamp: 1 })
      .lean();

    if (!ledgerEvents.length) {
      return res.json({
        success: true,
        data: {
          student: {
            studentId,
            name: student.name,
            class: student.class,
            section: student.section
          },
          learningIndex: null,
          message: 'No evaluated learning events found'
        }
      });
    }

    // 3️⃣ Raw CPI from analytics engine
    const cpiResult = await analyticsService.generateCPI(studentId, ledgerEvents);

    // 4️⃣ CPI smoothing (time-aware)
    const historicalCPI = ledgerEvents
      .map(e => e.challenge?.cpiSnapshot)
      .filter(v => typeof v === 'number');

    const smoothedCPI = analyticsService.smoothCPI(
      cpiResult.cpi,
      historicalCPI
    );

    cpiResult.cpi = smoothedCPI;

    // 5️⃣ Competency trends
    const trends = await analyticsService.calculateCompetencyTrends(
      studentId,
      ledgerEvents
    );

    // 6️⃣ Ledger integrity check
    const hashAnchored = ledgerEvents.every(e => !!e.hash);

    // 7️⃣ Final response
    res.json({
      success: true,
      data: {
        student: {
          studentId,
          name: student.name,
          class: student.class,
          section: student.section
        },
        learningIndex: {
          cpi: cpiResult.cpi,                 // 0–1 (smoothed)
          consistency: cpiResult.consistencyScore,
          growthRate: cpiResult.growthRate,
          driftDetected: cpiResult.driftDetected,
          assessmentCount: cpiResult.assessmentCount
        },
        competencies: {
          scores: cpiResult.competencyScores, // 0–100
          strengths: cpiResult.strengthAreas,
          improvements: cpiResult.improvementAreas,
          latestScores: cpiResult.latestScores
        },
        trends,
        verification: {
          ledgerBacked: true,
          hashAnchored
        }
      }
    });

  } catch (error) {
    logger.error('Ledger student analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute ledger-based analytics',
      error: error.message
    });
  }
};

/**
 * @route GET /api/analytics/student/:studentId/trends
 */
exports.getStudentTrends = async (req, res) => {
  try {
    const { studentId } = req.params;

    const ledgerEvents = await Ledger.find({ studentId })
      .sort({ timestamp: 1 })
      .lean();

    const trends = await analyticsService.calculateCompetencyTrends(studentId, ledgerEvents);

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('Ledger trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate trends',
      error: error.message
    });
  }
};

/**
 * @route GET /api/analytics/student/:studentId/cpi
 */
exports.getStudentCPI = async (req, res) => {
  try {
    const { studentId } = req.params;

    const ledgerEvents = await Ledger.find({ studentId })
      .sort({ timestamp: 1 })
      .lean();

    const cpi = await analyticsService.generateCPI(studentId, ledgerEvents);

    res.json({
      success: true,
      data: cpi
    });

  } catch (error) {
    logger.error('Ledger CPI error:', error);
    logger.info('CPI requested for studentId:', req.params.studentId);

    res.status(500).json({
      success: false,
      message: 'Failed to calculate CPI',
      error: error.message
    });
  }
};

// ============================================================================
// CLASS ANALYTICS (LEDGER AGGREGATION)
// ============================================================================

/**
 * @route GET /api/analytics/class/:classNum/:section
 */
exports.getClassAnalytics = async (req, res) => {
  try {
    const { classNum, section } = req.params;
    const { schoolId } = req.query;

    const students = await Student.find({
      schoolId,
      class: parseInt(classNum),
      section: section.toUpperCase(),
      active: true
    }).lean();

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'No students found' });
    }

    const studentIds = students.map(s => s.studentId);

    const ledgerEvents = await Ledger.find({
      studentId: { $in: studentIds }
    }).lean();

    const perStudentCPI = {};
    for (const sid of studentIds) {
      const events = ledgerEvents.filter(e => e.studentId === sid);
      if (events.length) {
        perStudentCPI[sid] = await analyticsService.generateCPI(sid, events);
      }
    }

    const cpiValues = Object.values(perStudentCPI).map(c => c.cpi).filter(Boolean);
    const classAverageCPI = cpiValues.length
      ? cpiValues.reduce((a, b) => a + b, 0) / cpiValues.length
      : 0;

    res.json({
      success: true,
      data: {
        class: `${classNum}-${section.toUpperCase()}`,
        totalStudents: students.length,
        averageCPI: Math.round(classAverageCPI * 100) / 100,
        students: students.map(s => ({
          studentId: s.studentId,
          name: s.name,
          cpi: perStudentCPI[s.studentId]?.cpi || null
        }))
      }
    });

  } catch (error) {
    logger.error('Class analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute class analytics',
      error: error.message
    });
  }
};

// ============================================================================
// SCHOOL ANALYTICS (LEDGER AGGREGATION)
// ============================================================================

/**
 * @route GET /api/analytics/school/:schoolId/overview
 */
// controllers/analytics.controller.js

// controllers/analytics.controller.js

//const { School, Student, Ledger } = require('../models');
//const analyticsService = require('../services/analytics.service');
//const logger = require('../utils/logger');

/**
 * @desc    Get school analytics overview (Ledger-based CPI)
 * @route   GET /api/analytics/school/:schoolId/overview
 * @access  Private
 */
exports.getSchoolAnalytics = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // 1️⃣ Validate school
    const school = await School.findOne({ schoolId }).lean();
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found'
      });
    }

    // 2️⃣ Get active students
    const students = await Student.find({
      schoolId,
      active: true
    }).lean();

    if (students.length === 0) {
      return res.json({
        success: true,
        data: {
          school: {
            schoolId,
            name: school.schoolName
          },
          students: 0,
          averageCPI: 0,
          verification: {
            ledgerBacked: true,
            note: 'No active students'
          }
        }
      });
    }

    const studentIds = students.map(s => s.studentId);

    // 3️⃣ Fetch ledger events (ONLY evaluated learning events)
    const ledgerEvents = await Ledger.find({
      studentId: { $in: studentIds },
      //eventType: 'challenge_evaluated'
      eventType: Ledger.EVENT_TYPES.CHALLENGE_EVALUATED

    }).lean();

    // 4️⃣ Calculate CPI per student using analytics engine
    const cpiValues = [];

    for (const studentId of studentIds) {
      const events = ledgerEvents.filter(e => e.studentId === studentId);

      if (events.length === 0) continue;

      try {
        const cpiResult = await analyticsService.generateCPI(studentId, events);
        if (typeof cpiResult.cpi === 'number') {
          cpiValues.push(cpiResult.cpi);
        }
      } catch (err) {
        logger.warn(`CPI calculation skipped for ${studentId}:`, err.message);
      }
    }

    // 5️⃣ School average CPI
    const averageCPI = cpiValues.length
      ? cpiValues.reduce((sum, cpi) => sum + cpi, 0) / cpiValues.length
      : 0;

    // 6️⃣ Final response
    res.json({
      success: true,
      data: {
        school: {
          schoolId,
          name: school.schoolName
        },
        students: students.length,
        averageCPI: Math.round(averageCPI * 100) / 100,
        verification: {
          ledgerBacked: true,
          aggregation: 'student-ledger-cpi'
        }
      }
    });

  } catch (error) {
    logger.error('School analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compute school analytics',
      error: error.message
    });
  }
};



// ============================================================================
// AI USAGE (UNCHANGED — NOT PART OF CPI)
// ============================================================================

exports.getAIUsageStatistics = async (req, res) => {
  try {
    const { schoolId, period = 30 } = req.query;
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);

    const query = { createdAt: { $gte: startDate } };
    if (schoolId) query.schoolId = schoolId;

    const logs = await AILog.find(query).lean();

    const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0);
    const totalTokens = logs.reduce((s, l) => s + (l.tokensUsed || 0), 0);

    res.json({
      success: true,
      data: {
        operations: logs.length,
        totalTokens,
        totalCost
      }
    });

  } catch (error) {
    logger.error('AI usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI usage',
      error: error.message
    });
  }
};

module.exports = exports;
