// services/analytics.service.js
/**
 * ANALYTICS SERVICE - LEDGER-ANCHORED VERSION
 * Comprehensive analytics with ledger-based CPI calculations
 * 
 * @module services/analytics.service
 */

const { Student, Teacher, Challenge, NEPReport, Activity, School, Ledger } = require('../models');
const { calculateSPI } = require('./spi.service');
const logger = require('../utils/logger');

// ============================================================================
// LEDGER-BASED ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Generate Competency Performance Index (CPI) from ledger events
 * @param {String} studentId - Student ID
 * @param {Array} ledgerEvents - Ledger events
 * @returns {Promise<Object>} CPI results
 */
// const generateCPI = async (studentId, ledgerEvents) => {
//   try {
//     if (!ledgerEvents || ledgerEvents.length === 0) {
//       throw new Error('No ledger events found for CPI calculation');
//     }

//     // Extract competency scores from ledger events
//     const competencyScores = {};
//     const competencyHistory = {};
//     const competencyTimestamps = {};
    
//     ledgerEvents.forEach(event => {
//       if (event.eventType === Ledger.EVENT_TYPES.COMPETENCY_ASSESSED && event.assessment) {
//         const { competency, score, level } = event.assessment;
//         if (!competencyScores[competency]) {
//           competencyScores[competency] = [];
//           competencyHistory[competency] = [];
//           competencyTimestamps[competency] = [];
//         }
//         competencyScores[competency].push(score);
//         competencyHistory[competency].push({
//           score,
//           level,
//           timestamp: event.timestamp,
//           eventId: event.eventId,
//           hash: event.hash
//         });
//         competencyTimestamps[competency].push(event.timestamp);
//       } else if (event.eventType === Ledger.EVENT_TYPES.CHALLENGE_EVALUATED && event.challenge?.competenciesAssessed) {
//         event.challenge.competenciesAssessed.forEach(assessment => {
//           const { competency, score, level } = assessment;
//           if (!competencyScores[competency]) {
//             competencyScores[competency] = [];
//             competencyHistory[competency] = [];
//             competencyTimestamps[competency] = [];
//           }
//           competencyScores[competency].push(score);
//           competencyHistory[competency].push({
//             score,
//             level,
//             timestamp: event.timestamp,
//             eventId: event.eventId,
//             hash: event.hash,
//             source: 'challenge'
//           });
//           competencyTimestamps[competency].push(event.timestamp);
//         });
//       }
//     });
    
//     // Calculate weighted average for each competency (recent scores weighted higher)
//     const weightedScores = {};
//     const latestScores = {};
    
//     Object.keys(competencyScores).forEach(competency => {
//       const scores = competencyScores[competency];
//       const timestamps = competencyTimestamps[competency];
      
//       if (scores.length === 0) return;
      
//       // Get latest score
//       latestScores[competency] = scores[scores.length - 1];
      
//       // Calculate weighted average (recent scores have higher weight)
//       let weightedSum = 0;
//       let weightSum = 0;
      
//       scores.forEach((score, index) => {
//         const age = scores.length - index; // Recent scores get higher weight
//         const weight = Math.sqrt(age); // Square root weighting
//         weightedSum += score * weight;
//         weightSum += weight;
//       });
      
//       weightedScores[competency] = weightedSum / weightSum;
//     });
    
//     // Calculate overall CPI (weighted average of competency scores)
//     const competencies = Object.keys(weightedScores);
//     if (competencies.length === 0) {
//       return {
//         cpi: 0,
//         competencyScores: {},
//         strengthAreas: [],
//         improvementAreas: [],
//         consistencyScore: 0,
//         growthRate: 0,
//         assessmentCount: 0,
//         driftDetected: false
//       };
//     }
    
//     const totalScore = competencies.reduce((sum, comp) => sum + weightedScores[comp], 0);
//     const cpi = totalScore / competencies.length;
    
//     // Identify strength and improvement areas
//     const sortedCompetencies = competencies.sort((a, b) => weightedScores[b] - weightedScores[a]);
//     const strengthCount = Math.max(2, Math.ceil(competencies.length * 0.3));
//     const improvementCount = Math.max(2, Math.ceil(competencies.length * 0.3));
    
//     const strengthAreas = sortedCompetencies.slice(0, strengthCount);
//     const improvementAreas = sortedCompetencies.slice(-improvementCount).reverse();
    
//     // Calculate consistency (standard deviation)
//     const consistencyScore = calculateConsistency(competencyScores);
    
//     // Calculate growth rate
//     const growthRate = calculateGrowthRate(competencyHistory);
    
//     // Check for data drift (sudden changes in performance)
//     const driftDetected = checkForDataDrift(competencyHistory);
    
//     return {
//       cpi: Math.round(cpi * 100) / 100,
//       competencyScores: Object.keys(weightedScores).reduce((acc, comp) => {
//         acc[comp] = Math.round(weightedScores[comp] * 100) / 100;
//         return acc;
//       }, {}),
//       latestScores,
//       strengthAreas,
//       improvementAreas,
//       consistencyScore,
//       growthRate,
//       assessmentCount: ledgerEvents.length,
//       driftDetected,
//       competencyHistorySummary: Object.keys(competencyHistory).reduce((acc, comp) => {
//         acc[comp] = {
//           count: competencyHistory[comp].length,
//           latest: competencyHistory[comp].length > 0 ? competencyHistory[comp][competencyHistory[comp].length - 1] : null,
//           first: competencyHistory[comp].length > 0 ? competencyHistory[comp][0] : null
//         };
//         return acc;
//       }, {})
//     };
//   } catch (error) {
//     logger.error('CPI generation error:', error);
//     throw new Error(`CPI calculation failed: ${error.message}`);
//   }
// };

const generateCPI = async (studentId, ledgerEvents) => {
  try {
    if (!Array.isArray(ledgerEvents) || ledgerEvents.length === 0) {
      throw new Error('No ledger events found for CPI calculation');
    }

    const competencyScores = {};
    const competencyHistory = {};

    // ===============================
    // 1️⃣ COLLECT DATA FROM LEDGER
    // ===============================
    ledgerEvents.forEach(event => {
      if (
        event.eventType !== Ledger.EVENT_TYPES.CHALLENGE_EVALUATED ||
        !event.challenge?.competenciesAssessed
      ) {
        return;
      }

      event.challenge.competenciesAssessed.forEach(assessment => {
        const { competency, score, level } = assessment;

        if (!competencyScores[competency]) {
          competencyScores[competency] = [];
          competencyHistory[competency] = [];
        }

        competencyScores[competency].push(score);
        competencyHistory[competency].push({
          score,
          level,
          timestamp: new Date(event.timestamp),
          hash: event.hash
        });
      });
    });

    const competencies = Object.keys(competencyScores);

    if (competencies.length === 0) {
      return {
        cpi: 0,
        competencyScores: {},
        latestScores: {},
        strengthAreas: [],
        improvementAreas: [],
        consistencyScore: 0,
        growthRate: 0,
        assessmentCount: 0,
        driftDetected: false
      };
    }

    // ===============================
    // 2️⃣ WEIGHTED COMPETENCY SCORES
    // ===============================
    const weightedScores = {};
    const latestScores = {};

    competencies.forEach(competency => {
      const scores = competencyScores[competency];
      if (scores.length === 0) return;

      latestScores[competency] = scores[scores.length - 1];

      let weightedSum = 0;
      let weightSum = 0;

      scores.forEach((score, index) => {
        const age = scores.length - index; // recent → higher
        const weight = Math.sqrt(age);
        weightedSum += score * weight;
        weightSum += weight;
      });

      weightedScores[competency] = weightedSum / weightSum;
    });

    // ===============================
    // 3️⃣ CPI CALCULATION (0–1)
    // ===============================
    const totalWeightedScore = Object.values(weightedScores)
      .reduce((sum, v) => sum + v, 0);

    const avgScore = totalWeightedScore / competencies.length;

    // Normalize to 0–1
    const cpi = Math.min(1, Math.max(0, avgScore / 100));

    // ===============================
    // 4️⃣ INSIGHTS
    // ===============================
    const sortedCompetencies = [...competencies]
      .sort((a, b) => weightedScores[b] - weightedScores[a]);

    const sliceSize = Math.max(2, Math.ceil(competencies.length * 0.3));

    const strengthAreas = sortedCompetencies.slice(0, sliceSize);
    const improvementAreas =
      sortedCompetencies.slice(-sliceSize).reverse();

    const consistencyScore = calculateConsistency(competencyScores);
    const growthRate = calculateGrowthRate(competencyHistory);
    const driftDetected = checkForDataDrift(competencyHistory);

    const assessmentCount = Object.values(competencyHistory)
      .reduce((sum, arr) => sum + arr.length, 0);

    // ===============================
    // 5️⃣ FINAL OUTPUT
    // ===============================
    return {
      cpi: parseFloat(cpi.toFixed(3)), // 0–1
      competencyScores: Object.keys(weightedScores).reduce((acc, comp) => {
        acc[comp] = Math.round(weightedScores[comp] * 100) / 100; // 0–100
        return acc;
      }, {}),
      latestScores,
      strengthAreas,
      improvementAreas,
      consistencyScore,
      growthRate,
      assessmentCount,
      driftDetected,
      competencyHistorySummary: Object.keys(competencyHistory).reduce(
        (acc, comp) => {
          const history = competencyHistory[comp];
          acc[comp] = {
            count: history.length,
            first: history[0] || null,
            latest: history[history.length - 1] || null
          };
          return acc;
        },
        {}
      )
    };
  } catch (error) {
    logger.error('CPI generation error:', error);
    throw new Error(`CPI calculation failed: ${error.message}`);
  }
};

/**
 * Calculate competency trends from ledger data
 * @param {String} studentId - Student ID
 * @param {Array} ledgerEvents - Ledger events
 * @returns {Promise<Object>} Competency trends
 */
// const calculateCompetencyTrends = async (studentId, ledgerEvents) => {
//   try {
//     const trends = {};
    
//     // Group events by competency and time
//     const competencyData = {};
    
//     ledgerEvents.forEach(event => {
//       let assessments = [];
      
//       if (event.eventType === Ledger.EVENT_TYPES.COMPETENCY_ASSESSED && event.assessment) {
//         assessments.push(event.assessment);
//       } else if (event.eventType === Ledger.EVENT_TYPES.CHALLENGE_EVALUATED && event.challenge?.competenciesAssessed) {
//         assessments = event.challenge.competenciesAssessed;
//       }
      
//       assessments.forEach(assessment => {
//         const { competency, score, level } = assessment;
//         if (!competencyData[competency]) {
//           competencyData[competency] = [];
//         }
//         competencyData[competency].push({
//           score,
//           level,
//           timestamp: new Date(event.timestamp),
//           eventId: event.eventId,
//           eventType: event.eventType,
//           hash: event.hash
//         });
//       });
//     });
    
//     // Calculate trend for each competency
//     Object.keys(competencyData).forEach(competency => {
//       const data = competencyData[competency];
//       if (data.length === 0) {
//         trends[competency] = {
//           trend: 'unknown',
//           improvement: 0,
//           dataPoints: 0,
//           lastAssessment: null
//         };
//         return;
//       }
      
//       // Sort by timestamp
//       data.sort((a, b) => a.timestamp - b.timestamp);
      
//       if (data.length === 1) {
//         trends[competency] = {
//           trend: 'stable',
//           improvement: 0,
//           dataPoints: 1,
//           lastAssessment: data[0].timestamp,
//           confidence: 'low'
//         };
//         return;
//       }
      
//       const firstScore = data[0].score;
//       const lastScore = data[data.length - 1].score;
//       const improvement = lastScore - firstScore;
      
//       // Calculate moving average for smoother trend detection
//       const movingAverage = calculateMovingAverage(data.map(d => d.score));
//       const slope = calculateSlope(movingAverage);
      
//       // Determine trend based on slope and improvement
//       let trend = 'stable';
//       let confidence = 'medium';
      
//       if (slope > 0.5 || improvement > 15) {
//         trend = 'improving';
//         confidence = slope > 1 ? 'high' : 'medium';
//       } else if (slope < -0.5 || improvement < -15) {
//         trend = 'declining';
//         confidence = slope < -1 ? 'high' : 'medium';
//       }
      
//       // Calculate volatility
//       const volatility = calculateVolatility(data.map(d => d.score));
      
//       trends[competency] = {
//         trend,
//         improvement,
//         percentageChange: firstScore > 0 ? (improvement / firstScore * 100).toFixed(2) : 0,
//         dataPoints: data.length,
//         firstAssessment: data[0].timestamp,
//         lastAssessment: data[data.length - 1].timestamp,
//         averageScore: data.reduce((sum, d) => sum + d.score, 0) / data.length,
//         volatility: Math.round(volatility * 100) / 100,
//         confidence,
//         slope: Math.round(slope * 100) / 100,
//         recentAssessments: data.slice(-3).map(d => ({
//           score: d.score,
//           timestamp: d.timestamp,
//           level: d.level
//         }))
//       };
//     });
    
//     return trends;
//   } catch (error) {
//     logger.error('Trend calculation error:', error);
//     throw new Error(`Trend calculation failed: ${error.message}`);
//   }
// };
const calculateCompetencyTrends = async (studentId, ledgerEvents) => {
  try {
    const trends = {};
    const competencyData = {};

    // ===============================
    // 1️⃣ COLLECT DATA FROM LEDGER
    // ===============================
    ledgerEvents.forEach(event => {
      if (
        event.eventType !== Ledger.EVENT_TYPES.CHALLENGE_EVALUATED ||
        !event.challenge?.competenciesAssessed
      ) {
        return;
      }

      event.challenge.competenciesAssessed.forEach(assessment => {
        const { competency, score, level } = assessment;

        if (!competencyData[competency]) {
          competencyData[competency] = [];
        }

        competencyData[competency].push({
          score,
          level,
          timestamp: new Date(event.timestamp),
          eventId: event._id,
          hash: event.hash
        });
      });
    });

    // ===============================
    // 2️⃣ CALCULATE TRENDS
    // ===============================
    Object.keys(competencyData).forEach(competency => {
      const data = competencyData[competency];

      if (data.length === 0) {
        trends[competency] = {
          trend: 'unknown',
          improvement: 0,
          dataPoints: 0,
          confidence: 'low'
        };
        return;
      }

      // Sort by time
      data.sort((a, b) => a.timestamp - b.timestamp);

      if (data.length === 1) {
        trends[competency] = {
          trend: 'stable',
          improvement: 0,
          dataPoints: 1,
          firstAssessment: data[0].timestamp,
          lastAssessment: data[0].timestamp,
          averageScore: data[0].score,
          volatility: 0,
          slope: 0,
          confidence: 'low',
          recentAssessments: [{
            score: data[0].score,
            timestamp: data[0].timestamp,
            level: data[0].level
          }]
        };
        return;
      }

      const firstScore = data[0].score;
      const lastScore = data[data.length - 1].score;
      const improvement = lastScore - firstScore;

      // Smooth trend detection
      const movingAvg = calculateMovingAverage(data.map(d => d.score));
      const slope = calculateSlope(movingAvg);

      let trend = 'stable';
      let confidence = 'medium';

      if (slope > 0.5 || improvement > 15) {
        trend = 'improving';
        confidence = slope > 1 ? 'high' : 'medium';
      } else if (slope < -0.5 || improvement < -15) {
        trend = 'declining';
        confidence = slope < -1 ? 'high' : 'medium';
      }

      const volatility = calculateVolatility(data.map(d => d.score));
      const avgScore =
        data.reduce((sum, d) => sum + d.score, 0) / data.length;

      trends[competency] = {
        trend,
        improvement,
        percentageChange:
          firstScore > 0
            ? Math.round((improvement / firstScore) * 10000) / 100
            : 0,
        dataPoints: data.length,
        firstAssessment: data[0].timestamp,
        lastAssessment: data[data.length - 1].timestamp,
        averageScore: Math.round(avgScore * 100) / 100,
        volatility: Math.round(volatility * 100) / 100,
        slope: Math.round(slope * 100) / 100,
        confidence,
        recentAssessments: data.slice(-3).map(d => ({
          score: d.score,
          timestamp: d.timestamp,
          level: d.level
        }))
      };
    });

    return trends;
  } catch (error) {
    logger.error('Trend calculation error:', error);
    throw new Error(`Trend calculation failed: ${error.message}`);
  }
};

/**
 * Smooth CPI data using weighted moving average
 * @param {Array|number} cpiData - CPI data or single value
 * @param {Array} history - Historical data for smoothing
 * @returns {Array|number} Smoothed CPI
 */
// const smoothCPI = (cpiData, history = []) => {
//   try {
//     // If it's a single value, apply exponential smoothing with history
//     if (typeof cpiData === 'number' && history.length > 0) {
//       const alpha = 0.3; // Smoothing factor
//       let smoothed = cpiData;
      
//       // Apply exponential smoothing backwards through history
//       for (let i = history.length - 1; i >= 0; i--) {
//         smoothed = alpha * history[i] + (1 - alpha) * smoothed;
//       }
      
//       return Math.round(smoothed * 100) / 100;
//     }
    
//     // If it's an array, apply weighted moving average
//     if (Array.isArray(cpiData)) {
//       if (cpiData.length < 3) return cpiData;
      
//       const weights = [0.25, 0.5, 0.25]; // Center-weighted
//       const smoothed = [];
      
//       for (let i = 0; i < cpiData.length; i++) {
//         if (i === 0) {
//           smoothed.push(cpiData[i]); // Keep first
//         } else if (i === cpiData.length - 1) {
//           smoothed.push(cpiData[i]); // Keep last
//         } else {
//           let weightedSum = 0;
//           let weightSum = 0;
          
//           for (let j = -1; j <= 1; j++) {
//             const idx = i + j;
//             if (idx >= 0 && idx < cpiData.length) {
//               const weight = weights[j + 1];
//               weightedSum += cpiData[idx] * weight;
//               weightSum += weight;
//             }
//           }
          
//           smoothed.push(parseFloat((weightedSum / weightSum).toFixed(2)));
//         }
//       }
//       return smoothed;
//     }
    
//     return cpiData;
//   } catch (error) {
//     logger.error('CPI smoothing error:', error);
//     return cpiData;
//   }
// };

const smoothCPI = (cpiData, history = []) => {
  try {
    // ===============================
    // CASE 1: SINGLE CPI VALUE (EMA)
    // ===============================
    if (typeof cpiData === 'number') {
      if (!Array.isArray(history) || history.length === 0) {
        // No history → return bounded CPI
        return Math.min(1, Math.max(0, parseFloat(cpiData.toFixed(3))));
      }

      // Exponential Moving Average
      const alpha = 0.35; // NEP-friendly responsiveness
      let smoothed = history[0];

      for (let i = 1; i < history.length; i++) {
        smoothed = alpha * history[i] + (1 - alpha) * smoothed;
      }

      // Blend latest CPI
      smoothed = alpha * cpiData + (1 - alpha) * smoothed;

      return Math.min(1, Math.max(0, parseFloat(smoothed.toFixed(3))));
    }

    // ===============================
    // CASE 2: CPI SERIES (SMOOTHED CURVE)
    // ===============================
    if (Array.isArray(cpiData)) {
      if (cpiData.length < 3) {
        return cpiData.map(v =>
          Math.min(1, Math.max(0, parseFloat(v.toFixed(3))))
        );
      }

      const weights = [0.25, 0.5, 0.25]; // centered smoothing
      const smoothed = [];

      for (let i = 0; i < cpiData.length; i++) {
        if (i === 0 || i === cpiData.length - 1) {
          smoothed.push(
            Math.min(1, Math.max(0, parseFloat(cpiData[i].toFixed(3))))
          );
          continue;
        }

        let weightedSum = 0;
        let weightSum = 0;

        for (let j = -1; j <= 1; j++) {
          const idx = i + j;
          if (idx >= 0 && idx < cpiData.length) {
            weightedSum += cpiData[idx] * weights[j + 1];
            weightSum += weights[j + 1];
          }
        }

        const value = weightedSum / weightSum;
        smoothed.push(
          Math.min(1, Math.max(0, parseFloat(value.toFixed(3))))
        );
      }

      return smoothed;
    }

    return cpiData;
  } catch (error) {
    logger.error('CPI smoothing error:', error);
    return cpiData;
  }
};

/**
 * Calculate consistency score (lower volatility = higher consistency)
 * @param {Object} competencyScores - Scores by competency
 * @returns {number} Consistency score (0-100)
 */
const calculateConsistency = (competencyScores) => {
  try {
    const allScores = [];
    Object.values(competencyScores).forEach(scores => {
      allScores.push(...scores);
    });
    
    if (allScores.length < 2) return 100;
    
    const mean = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    const variance = allScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / allScores.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to 0-100 scale where 100 is most consistent
    const maxStdDev = 30; // Assuming reasonable consistency threshold
    const consistency = Math.max(0, 100 - (stdDev / maxStdDev * 100));
    
    return parseFloat(consistency.toFixed(2));
  } catch (error) {
    logger.error('Consistency calculation error:', error);
    return 0;
  }
};

/**
 * Calculate growth rate percentage
 * @param {Object} competencyHistory - Historical data by competency
 * @returns {number} Growth rate percentage
 */
const calculateGrowthRate = (competencyHistory) => {
  try {
    const competencies = Object.keys(competencyHistory);
    if (competencies.length === 0) return 0;
    
    let totalGrowth = 0;
    let count = 0;
    
    competencies.forEach(competency => {
      const history = competencyHistory[competency];
      if (history.length >= 3) {
        const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
        const earlyPeriod = sorted.slice(0, Math.ceil(sorted.length / 3));
        const latePeriod = sorted.slice(-Math.ceil(sorted.length / 3));
        
        const earlyAvg = earlyPeriod.reduce((sum, h) => sum + h.score, 0) / earlyPeriod.length;
        const lateAvg = latePeriod.reduce((sum, h) => sum + h.score, 0) / latePeriod.length;
        
        if (earlyAvg > 0) {
          const growth = ((lateAvg - earlyAvg) / earlyAvg) * 100;
          totalGrowth += growth;
          count++;
        }
      }
    });
    
    return count > 0 ? parseFloat((totalGrowth / count).toFixed(2)) : 0;
  } catch (error) {
    logger.error('Growth rate calculation error:', error);
    return 0;
  }
};

/**
 * Check for data drift in competency performance
 * @param {Object} competencyHistory - Historical data by competency
 * @returns {boolean} True if drift detected
 */
const checkForDataDrift = (competencyHistory) => {
  try {
    let driftDetected = false;
    
    Object.values(competencyHistory).forEach(history => {
      if (history.length >= 5) {
        const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
        const recent = sorted.slice(-3);
        const previous = sorted.slice(-6, -3);
        
        if (recent.length === 3 && previous.length === 3) {
          const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
          const previousAvg = previous.reduce((sum, h) => sum + h.score, 0) / previous.length;
          
          // Check for significant change (more than 20 points)
          if (Math.abs(recentAvg - previousAvg) > 20) {
            driftDetected = true;
          }
        }
      }
    });
    
    return driftDetected;
  } catch (error) {
    logger.error('Data drift check error:', error);
    return false;
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate moving average of an array
 * @param {Array} data - Numeric data
 * @param {number} window - Window size
 * @returns {Array} Moving averages
 */
const calculateMovingAverage = (data, window = 3) => {
  if (data.length < window) return data;
  
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, start + window);
    const slice = data.slice(start, end);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(avg);
  }
  return result;
};

/**
 * Calculate slope of a data series
 * @param {Array} data - Numeric data
 * @returns {number} Slope
 */
const calculateSlope = (data) => {
  if (data.length < 2) return 0;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }
  
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
};

/**
 * Calculate volatility (standard deviation)
 * @param {Array} data - Numeric data
 * @returns {number} Volatility
 */
const calculateVolatility = (data) => {
  if (data.length < 2) return 0;
  
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
};

// ============================================================================
// EXISTING ANALYTICS FUNCTIONS (KEPT AS IS)
// ============================================================================

/**
 * Get student analytics
 * @param {String} studentId - Student ID
 * @param {Object} options - Analytics options
 * @returns {Promise<Object>}
 */
const getStudentAnalytics = async (studentId, options = {}) => {
  const {
    period = 30,
    includeSPI = true,
    includeCompetencies = true,
    includeChallenges = true
  } = options;
  
  const student = await Student.findOne({ studentId });
  if (!student) {
    throw new Error('Student not found');
  }
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  // Get challenges
  const challenges = await Challenge.find({
    studentId,
    createdAt: { $gte: startDate }
  });
  
  // Calculate basic metrics
  const totalChallenges = challenges.length;
  const completedChallenges = challenges.filter(c => c.status === 'evaluated').length;
  const pendingChallenges = challenges.filter(c => c.status === 'pending' || c.status === 'in-progress').length;
  
  const evaluatedChallenges = challenges.filter(c => c.status === 'evaluated');
  const averageScore = evaluatedChallenges.length > 0
    ? evaluatedChallenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / evaluatedChallenges.length
    : 0;
  
  const passedChallenges = evaluatedChallenges.filter(c => (c.evaluation?.score || 0) >= 60).length;
  const passRate = evaluatedChallenges.length > 0
    ? (passedChallenges / evaluatedChallenges.length) * 100
    : 0;
  
  const analytics = {
    studentId,
    name: student.name,
    class: `${student.class}-${student.section}`,
    period,
    overview: {
      totalChallenges,
      completedChallenges,
      pendingChallenges,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      passedChallenges
    }
  };
  
  // SPI
  if (includeSPI) {
    try {
      const spiData = await calculateSPI(studentId, { period });
      analytics.spi = spiData;
    } catch (error) {
      analytics.spi = null;
    }
  }
  
  // Competency analysis
  if (includeCompetencies) {
    analytics.competencies = await analyzeCompetencies(studentId, evaluatedChallenges);
  }
  
  // Challenge breakdown
  if (includeChallenges) {
    analytics.challengeBreakdown = analyzeChallengeBreakdown(challenges);
  }
  
  // Activity timeline
  analytics.activityTimeline = await getActivityTimeline(studentId, period);
  
  // Strengths and weaknesses
  analytics.insights = generateStudentInsights(analytics);
  
  return analytics;
};

/**
 * Analyze competencies
 * @param {String} studentId - Student ID
 * @param {Array} challenges - Evaluated challenges
 * @returns {Promise<Object>}
 */
const analyzeCompetencies = async (studentId, challenges) => {
  const competencyScores = {};
  const competencyCounts = {};
  
  challenges.forEach(challenge => {
    if (challenge.evaluation?.competencyScores) {
      Object.entries(challenge.evaluation.competencyScores).forEach(([comp, score]) => {
        if (!competencyScores[comp]) {
          competencyScores[comp] = 0;
          competencyCounts[comp] = 0;
        }
        competencyScores[comp] += score;
        competencyCounts[comp]++;
      });
    }
  });
  
  const competencies = {};
  Object.keys(competencyScores).forEach(comp => {
    const avgScore = competencyScores[comp] / competencyCounts[comp];
    
    let level;
    if (avgScore >= 85) level = 'advanced';
    else if (avgScore >= 70) level = 'proficient';
    else if (avgScore >= 55) level = 'developing';
    else level = 'beginning';
    
    competencies[comp] = {
      score: Math.round(avgScore * 100) / 100,
      level,
      assessmentCount: competencyCounts[comp]
    };
  });
  
  return competencies;
};

/**
 * Analyze challenge breakdown
 * @param {Array} challenges - All challenges
 * @returns {Object}
 */
const analyzeChallengeBreakdown = (challenges) => {
  const byType = {};
  const byDifficulty = {};
  const byStatus = {};
  
  challenges.forEach(challenge => {
    // By type
    const type = challenge.simulationType || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
    
    // By difficulty
    const difficulty = challenge.difficulty || 'unknown';
    byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;
    
    // By status
    const status = challenge.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });
  
  return {
    bySimulationType: byType,
    byDifficulty,
    byStatus
  };
};

/**
 * Get activity timeline
 * @param {String} studentId - Student ID
 * @param {Number} period - Period in days
 * @returns {Promise<Array>}
 */
const getActivityTimeline = async (studentId, period) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  const activities = await Activity.find({
    userId: studentId,
    createdAt: { $gte: startDate },
    type: { $in: ['challenge_generated', 'challenge_submitted', 'challenge_evaluated'] }
  })
    .sort({ createdAt: 1 })
    .limit(50);
  
  return activities.map(activity => ({
    type: activity.action,
    timestamp: activity.createdAt,
    details: activity.details
  }));
};

/**
 * Generate student insights
 * @param {Object} analytics - Analytics data
 * @returns {Array}
 */
const generateStudentInsights = (analytics) => {
  const insights = [];
  
  // Performance insights
  if (analytics.overview.averageScore >= 85) {
    insights.push({
      type: 'strength',
      category: 'performance',
      message: 'Consistently achieving excellent scores',
      priority: 'high'
    });
  } else if (analytics.overview.averageScore < 60) {
    insights.push({
      type: 'concern',
      category: 'performance',
      message: 'Consider additional support or review of fundamentals',
      priority: 'high'
    });
  }
  
  // Completion rate
  const completionRate = analytics.overview.totalChallenges > 0
    ? (analytics.overview.completedChallenges / analytics.overview.totalChallenges) * 100
    : 0;
  
  if (completionRate < 50 && analytics.overview.pendingChallenges > 3) {
    insights.push({
      type: 'concern',
      category: 'completion',
      message: `${analytics.overview.pendingChallenges} pending challenges need attention`,
      priority: 'medium'
    });
  }
  
  // Activity level
  const expectedChallenges = analytics.period / 3;
  if (analytics.overview.totalChallenges < expectedChallenges * 0.5) {
    insights.push({
      type: 'suggestion',
      category: 'engagement',
      message: 'Increase practice frequency for better learning outcomes',
      priority: 'medium'
    });
  }
  
  return insights;
};

// ============================================================================
// CLASS ANALYTICS
// ============================================================================

/**
 * Get class analytics
 * @param {String} schoolId - School ID
 * @param {Number} className - Class number
 * @param {String} section - Section
 * @param {Object} options - Options
 * @returns {Promise<Object>}
 */
const getClassAnalytics = async (schoolId, className, section, options = {}) => {
  const { period = 30 } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  // Get students
  const students = await Student.find({
    schoolId,
    class: className,
    section
  });
  
  if (students.length === 0) {
    throw new Error('No students found in this class');
  }
  
  const studentIds = students.map(s => s.studentId);
  
  // Get challenges
  const challenges = await Challenge.find({
    studentId: { $in: studentIds },
    createdAt: { $gte: startDate }
  });
  
  // Calculate class metrics
  const totalChallenges = challenges.length;
  const evaluatedChallenges = challenges.filter(c => c.status === 'evaluated');
  
  const averageScore = evaluatedChallenges.length > 0
    ? evaluatedChallenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / evaluatedChallenges.length
    : 0;
  
  const passedChallenges = evaluatedChallenges.filter(c => (c.evaluation?.score || 0) >= 60).length;
  const passRate = evaluatedChallenges.length > 0
    ? (passedChallenges / evaluatedChallenges.length) * 100
    : 0;
  
  // Student performance distribution
  const studentPerformance = await Promise.all(
    students.map(async (student) => {
      const studentChallenges = challenges.filter(c => c.studentId === student.studentId && c.status === 'evaluated');
      const avgScore = studentChallenges.length > 0
        ? studentChallenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / studentChallenges.length
        : 0;
      
      return {
        studentId: student.studentId,
        name: student.name,
        averageScore: Math.round(avgScore * 100) / 100,
        challengesCompleted: studentChallenges.length
      };
    })
  );
  
  // Performance distribution
  const performanceDistribution = {
    excellent: studentPerformance.filter(s => s.averageScore >= 85).length,
    good: studentPerformance.filter(s => s.averageScore >= 70 && s.averageScore < 85).length,
    average: studentPerformance.filter(s => s.averageScore >= 55 && s.averageScore < 70).length,
    needsImprovement: studentPerformance.filter(s => s.averageScore < 55 && s.averageScore > 0).length,
    noData: studentPerformance.filter(s => s.averageScore === 0).length
  };
  
  // Top performers
  const topPerformers = [...studentPerformance]
    .filter(s => s.challengesCompleted >= 3)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);
  
  // Students needing support
  const needsSupport = [...studentPerformance]
    .filter(s => s.averageScore > 0 && s.averageScore < 60)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, 5);
  
  // Competency analysis
  const competencyAnalysis = await analyzeClassCompetencies(studentIds, evaluatedChallenges);
  
  return {
    class: `${className}-${section}`,
    schoolId,
    period,
    overview: {
      totalStudents: students.length,
      activeStudents: studentPerformance.filter(s => s.challengesCompleted > 0).length,
      totalChallenges,
      evaluatedChallenges: evaluatedChallenges.length,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100
    },
    performanceDistribution,
    topPerformers,
    needsSupport,
    competencyAnalysis,
    challengeActivity: analyzeChallengeActivity(challenges, period),
    insights: generateClassInsights({ overview: { totalStudents: students.length, activeStudents: studentPerformance.filter(s => s.challengesCompleted > 0).length, averageScore }, performanceDistribution })
  };
};

/**
 * Analyze class competencies
 * @param {Array} studentIds - Student IDs
 * @param {Array} challenges - Evaluated challenges
 * @returns {Object}
 */
const analyzeClassCompetencies = async (studentIds, challenges) => {
  const competencyData = {};
  
  challenges.forEach(challenge => {
    if (challenge.evaluation?.competencyScores) {
      Object.entries(challenge.evaluation.competencyScores).forEach(([comp, score]) => {
        if (!competencyData[comp]) {
          competencyData[comp] = {
            total: 0,
            count: 0,
            scores: []
          };
        }
        competencyData[comp].total += score;
        competencyData[comp].count++;
        competencyData[comp].scores.push(score);
      });
    }
  });
  
  const competencies = {};
  Object.keys(competencyData).forEach(comp => {
    const data = competencyData[comp];
    const average = data.total / data.count;
    const sorted = [...data.scores].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    competencies[comp] = {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: Math.min(...data.scores),
      max: Math.max(...data.scores),
      assessmentCount: data.count,
      needsAttention: average < 60
    };
  });
  
  return competencies;
};

/**
 * Analyze challenge activity
 * @param {Array} challenges - Challenges
 * @param {Number} period - Period in days
 * @returns {Object}
 */
const analyzeChallengeActivity = (challenges, period) => {
  const dailyActivity = {};
  
  // Initialize all days
  for (let i = 0; i < period; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyActivity[dateStr] = 0;
  }
  
  // Count challenges per day
  challenges.forEach(challenge => {
    const dateStr = challenge.createdAt.toISOString().split('T')[0];
    if (dailyActivity[dateStr] !== undefined) {
      dailyActivity[dateStr]++;
    }
  });
  
  const activityArray = Object.entries(dailyActivity)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return {
    daily: activityArray,
    averagePerDay: Math.round((challenges.length / period) * 100) / 100
  };
};

/**
 * Generate class insights
 * @param {Object} data - Class data
 * @returns {Array}
 */
const generateClassInsights = (data) => {
  const insights = [];
  
  // Engagement
  const engagementRate = (data.overview.activeStudents / data.overview.totalStudents) * 100;
  if (engagementRate < 50) {
    insights.push({
      type: 'concern',
      category: 'engagement',
      message: `Only ${Math.round(engagementRate)}% of students are actively participating`,
      priority: 'high'
    });
  }
  
  // Performance
  if (data.overview.averageScore < 60) {
    insights.push({
      type: 'concern',
      category: 'performance',
      message: 'Class average below expected level - consider curriculum review',
      priority: 'high'
    });
  }
  
  // Distribution
  if (data.performanceDistribution.needsImprovement > data.overview.totalStudents * 0.3) {
    insights.push({
      type: 'concern',
      category: 'distribution',
      message: 'Significant number of students need additional support',
      priority: 'high'
    });
  }
  
  return insights;
};

// ============================================================================
// SCHOOL ANALYTICS
// ============================================================================

/**
 * Get school analytics
 * @param {String} schoolId - School ID
 * @param {Object} options - Options
 * @returns {Promise<Object>}
 */
const getSchoolAnalytics = async (schoolId, options = {}) => {
  const { period = 30 } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);
  
  const school = await School.findOne({ schoolId });
  if (!school) {
    throw new Error('School not found');
  }
  
  // Get all students
  const students = await Student.find({ schoolId });
  const studentIds = students.map(s => s.studentId);
  
  // Get all teachers
  const teachers = await Teacher.find({ schoolId });
  
  // Get challenges
  const challenges = await Challenge.find({
    studentId: { $in: studentIds },
    createdAt: { $gte: startDate }
  });
  
  const evaluatedChallenges = challenges.filter(c => c.status === 'evaluated');
  
  // Calculate metrics
  const totalChallenges = challenges.length;
  const averageScore = evaluatedChallenges.length > 0
    ? evaluatedChallenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / evaluatedChallenges.length
    : 0;
  
  const activeStudents = new Set(challenges.map(c => c.studentId)).size;
  
  // Performance by class
  const performanceByClass = await analyzePerformanceByClass(schoolId, period);
  
  // Activity trends
  const activityTrends = analyzeChallengeActivity(challenges, period);
  
  // Competency overview
  const competencyOverview = await analyzeClassCompetencies(studentIds, evaluatedChallenges);
  
  return {
    schoolId,
    schoolName: school.name,
    period,
    overview: {
      totalStudents: students.length,
      activeStudents,
      totalTeachers: teachers.length,
      totalChallenges,
      averageScore: Math.round(averageScore * 100) / 100,
      engagementRate: Math.round((activeStudents / students.length) * 100)
    },
    performanceByClass,
    activityTrends,
    competencyOverview,
    insights: generateSchoolInsights({ overview: { totalStudents: students.length, activeStudents, averageScore }, performanceByClass })
  };
};

/**
 * Analyze performance by class
 * @param {String} schoolId - School ID
 * @param {Number} period - Period in days
 * @returns {Promise<Array>}
 */
const analyzePerformanceByClass = async (schoolId, period) => {
  const students = await Student.find({ schoolId });
  
  const classSections = {};
  students.forEach(student => {
    const key = `${student.class}-${student.section}`;
    if (!classSections[key]) {
      classSections[key] = [];
    }
    classSections[key].push(student.studentId);
  });
  
  const performanceData = [];
  
  for (const [classSection, studentIds] of Object.entries(classSections)) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    
    const challenges = await Challenge.find({
      studentId: { $in: studentIds },
      status: 'evaluated',
      createdAt: { $gte: startDate }
    });
    
    const averageScore = challenges.length > 0
      ? challenges.reduce((sum, c) => sum + (c.evaluation?.score || 0), 0) / challenges.length
      : 0;
    
    performanceData.push({
      class: classSection,
      studentCount: studentIds.length,
      challengeCount: challenges.length,
      averageScore: Math.round(averageScore * 100) / 100
    });
  }
  
  return performanceData.sort((a, b) => {
    const [classA] = a.class.split('-').map(Number);
    const [classB] = b.class.split('-').map(Number);
    return classA - classB;
  });
};

/**
 * Generate school insights
 * @param {Object} data - School data
 * @returns {Array}
 */
const generateSchoolInsights = (data) => {
  const insights = [];
  
  // Engagement
  if (data.overview.engagementRate < 60) {
    insights.push({
      type: 'concern',
      category: 'engagement',
      message: 'School-wide engagement below 60% - review onboarding and communication',
      priority: 'high'
    });
  }
  
  // Performance variance
  if (data.performanceByClass && data.performanceByClass.length > 1) {
    const scores = data.performanceByClass.map(c => c.averageScore);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    if (max - min > 20) {
      insights.push({
        type: 'concern',
        category: 'consistency',
        message: 'Significant performance variance across classes - consider teacher training',
        priority: 'medium'
      });
    }
  }
  
  return insights;
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // NEW: Ledger-based analytics functions
  generateCPI,
  calculateCompetencyTrends,
  smoothCPI,
  calculateConsistency,
  calculateGrowthRate,
  checkForDataDrift,
  
  // Helper functions
  calculateMovingAverage,
  calculateSlope,
  calculateVolatility,
  
  // Existing student analytics
  getStudentAnalytics,
  analyzeCompetencies,
  
  // Class analytics
  getClassAnalytics,
  analyzeClassCompetencies,
  
  // School analytics
  getSchoolAnalytics,
  analyzePerformanceByClass,
  
  // Utilities
  analyzeChallengeBreakdown,
  analyzeChallengeActivity,
  getActivityTimeline
};