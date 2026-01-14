// utils/mathUtils.js
/**
 * MATH UTILS - COMPLETE PRODUCTION VERSION
 * Mathematical calculations, statistics, and utility functions
 * 
 * @module utils/mathUtils
 */

// ============================================================================
// BASIC MATH OPERATIONS
// ============================================================================

/**
 * Round number to decimal places
 * @param {Number} number - Number to round
 * @param {Number} decimals - Decimal places
 * @returns {Number} Rounded number
 */
const round = (number, decimals = 2) => {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Clamp number between min and max
 * @param {Number} number - Number to clamp
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @returns {Number} Clamped number
 */
const clamp = (number, min, max) => {
  return Math.min(Math.max(number, min), max);
};

/**
 * Calculate percentage
 * @param {Number} value - Value
 * @param {Number} total - Total
 * @returns {Number} Percentage
 */
const percentage = (value, total) => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Linear interpolation
 * @param {Number} start - Start value
 * @param {Number} end - End value
 * @param {Number} t - Interpolation factor (0-1)
 * @returns {Number} Interpolated value
 */
const lerp = (start, end, t) => {
  return start + (end - start) * t;
};

/**
 * Map value from one range to another
 * @param {Number} value - Value to map
 * @param {Number} inMin - Input minimum
 * @param {Number} inMax - Input maximum
 * @param {Number} outMin - Output minimum
 * @param {Number} outMax - Output maximum
 * @returns {Number} Mapped value
 */
const mapRange = (value, inMin, inMax, outMin, outMax) => {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate mean (average)
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Mean
 */
const mean = (numbers) => {
  if (numbers.length === 0) return 0;
  return sum(numbers) / numbers.length;
};

/**
 * Calculate median
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Median
 */
const median = (numbers) => {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * Calculate mode (most frequent value)
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Mode
 */
const mode = (numbers) => {
  if (numbers.length === 0) return null;
  
  const frequency = {};
  let maxFreq = 0;
  let mode = numbers[0];
  
  numbers.forEach(num => {
    frequency[num] = (frequency[num] || 0) + 1;
    if (frequency[num] > maxFreq) {
      maxFreq = frequency[num];
      mode = num;
    }
  });
  
  return mode;
};

/**
 * Calculate sum
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Sum
 */
const sum = (numbers) => {
  return numbers.reduce((acc, num) => acc + num, 0);
};

/**
 * Calculate variance
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Variance
 */
const variance = (numbers) => {
  if (numbers.length === 0) return 0;
  
  const avg = mean(numbers);
  const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
  return mean(squaredDiffs);
};

/**
 * Calculate standard deviation
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Standard deviation
 */
const standardDeviation = (numbers) => {
  return Math.sqrt(variance(numbers));
};

/**
 * Calculate range (max - min)
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Number} Range
 */
const range = (numbers) => {
  if (numbers.length === 0) return 0;
  return Math.max(...numbers) - Math.min(...numbers);
};

/**
 * Calculate percentile
 * @param {Array<Number>} numbers - Array of numbers
 * @param {Number} percentile - Percentile (0-100)
 * @returns {Number} Percentile value
 */
const getPercentile = (numbers, percentile) => {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

/**
 * Calculate quartiles (Q1, Q2, Q3)
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Object} Quartiles
 */
const quartiles = (numbers) => {
  return {
    q1: getPercentile(numbers, 25),
    q2: getPercentile(numbers, 50),
    q3: getPercentile(numbers, 75)
  };
};

/**
 * Calculate correlation coefficient
 * @param {Array<Number>} x - First array
 * @param {Array<Number>} y - Second array
 * @returns {Number} Correlation (-1 to 1)
 */
const correlation = (x, y) => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }
  
  return numerator / Math.sqrt(denomX * denomY);
};

/**
 * Calculate z-score
 * @param {Number} value - Value
 * @param {Number} mean - Mean
 * @param {Number} stdDev - Standard deviation
 * @returns {Number} Z-score
 */
const zScore = (value, mean, stdDev) => {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
};

// ============================================================================
// LINEAR REGRESSION
// ============================================================================

/**
 * Calculate linear regression
 * @param {Array<Number>} x - X values
 * @param {Array<Number>} y - Y values
 * @returns {Object} Regression coefficients
 */
const linearRegression = (x, y) => {
  if (x.length !== y.length || x.length === 0) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  
  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY);
    denominator += Math.pow(x[i] - meanX, 2);
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  
  // Calculate R²
  let ssRes = 0;
  let ssTot = 0;
  
  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssRes += Math.pow(y[i] - predicted, 2);
    ssTot += Math.pow(y[i] - meanY, 2);
  }
  
  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  
  return {
    slope: round(slope, 4),
    intercept: round(intercept, 4),
    rSquared: round(rSquared, 4)
  };
};

/**
 * Predict value using linear regression
 * @param {Number} x - X value
 * @param {Object} regression - Regression object
 * @returns {Number} Predicted y value
 */
const predict = (x, regression) => {
  return regression.slope * x + regression.intercept;
};

// ============================================================================
// NORMALIZATION
// ============================================================================

/**
 * Min-max normalization (0-1)
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Array<Number>} Normalized array
 */
const normalize = (numbers) => {
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min;
  
  if (range === 0) return numbers.map(() => 0);
  
  return numbers.map(num => (num - min) / range);
};

/**
 * Z-score normalization
 * @param {Array<Number>} numbers - Array of numbers
 * @returns {Array<Number>} Normalized array
 */
const standardize = (numbers) => {
  const avg = mean(numbers);
  const stdDev = standardDeviation(numbers);
  
  if (stdDev === 0) return numbers.map(() => 0);
  
  return numbers.map(num => (num - avg) / stdDev);
};

// ============================================================================
// DISTANCE METRICS
// ============================================================================

/**
 * Euclidean distance
 * @param {Array<Number>} a - First vector
 * @param {Array<Number>} b - Second vector
 * @returns {Number} Distance
 */
const euclideanDistance = (a, b) => {
  if (a.length !== b.length) return 0;
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  
  return Math.sqrt(sum);
};

/**
 * Manhattan distance
 * @param {Array<Number>} a - First vector
 * @param {Array<Number>} b - Second vector
 * @returns {Number} Distance
 */
const manhattanDistance = (a, b) => {
  if (a.length !== b.length) return 0;
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  
  return sum;
};

/**
 * Cosine similarity
 * @param {Array<Number>} a - First vector
 * @param {Array<Number>} b - Second vector
 * @returns {Number} Similarity (0-1)
 */
const cosineSimilarity = (a, b) => {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(magnitudeA * magnitudeB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate weighted average
 * @param {Array<Number>} values - Values
 * @param {Array<Number>} weights - Weights
 * @returns {Number} Weighted average
 */
const weightedAverage = (values, weights) => {
  if (values.length !== weights.length || values.length === 0) return 0;
  
  let sum = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < values.length; i++) {
    sum += values[i] * weights[i];
    totalWeight += weights[i];
  }
  
  return totalWeight === 0 ? 0 : sum / totalWeight;
};

/**
 * Calculate grade based on score
 * @param {Number} score - Score (0-100)
 * @returns {String} Grade letter
 */
const getGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

/**
 * Calculate GPA from grades
 * @param {Array<String>} grades - Array of letter grades
 * @returns {Number} GPA (0-4)
 */
const calculateGPA = (grades) => {
  const gradePoints = {
    'A': 4.0,
    'B': 3.0,
    'C': 2.0,
    'D': 1.0,
    'F': 0.0
  };
  
  const points = grades.map(grade => gradePoints[grade] || 0);
  return round(mean(points), 2);
};

// ============================================================================
// RANDOM NUMBERS
// ============================================================================

/**
 * Generate random integer between min and max (inclusive)
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @returns {Number} Random integer
 */
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generate random float between min and max
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @returns {Number} Random float
 */
const randomFloat = (min, max) => {
  return Math.random() * (max - min) + min;
};

/**
 * Shuffle array randomly
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffle = (array) => {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Sample random elements from array
 * @param {Array} array - Source array
 * @param {Number} count - Number of samples
 * @returns {Array} Sampled elements
 */
const sample = (array, count) => {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
};

// ============================================================================
// COMBINATORICS
// ============================================================================

/**
 * Calculate factorial
 * @param {Number} n - Number
 * @returns {Number} Factorial
 */
const factorial = (n) => {
  if (n < 0) return 0;
  if (n === 0 || n === 1) return 1;
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  
  return result;
};

/**
 * Calculate permutations (nPr)
 * @param {Number} n - Total items
 * @param {Number} r - Items to arrange
 * @returns {Number} Permutations
 */
const permutations = (n, r) => {
  if (r > n) return 0;
  return factorial(n) / factorial(n - r);
};

/**
 * Calculate combinations (nCr)
 * @param {Number} n - Total items
 * @param {Number} r - Items to choose
 * @returns {Number} Combinations
 */
const combinations = (n, r) => {
  if (r > n) return 0;
  return factorial(n) / (factorial(r) * factorial(n - r));
};

// ============================================================================
// PHYSICS UTILITIES (for challenges)
// ============================================================================

/**
 * Calculate projectile motion
 * @param {Number} velocity - Initial velocity (m/s)
 * @param {Number} angle - Launch angle (degrees)
 * @param {Number} height - Initial height (m)
 * @param {Number} g - Gravity (m/s²)
 * @returns {Object} Motion parameters
 */
const projectileMotion = (velocity, angle, height = 0, g = 9.81) => {
  const radians = angle * Math.PI / 180;
  const vx = velocity * Math.cos(radians);
  const vy = velocity * Math.sin(radians);
  
  const timeToApex = vy / g;
  const maxHeight = height + (vy * vy) / (2 * g);
  const totalTime = (vy + Math.sqrt(vy * vy + 2 * g * height)) / g;
  const horizontalRange = vx * totalTime;
  
  return {
    maxHeight: round(maxHeight, 2),
    range: round(horizontalRange, 2),
    timeOfFlight: round(totalTime, 2),
    timeToApex: round(timeToApex, 2)
  };
};

/**
 * Calculate kinetic energy
 * @param {Number} mass - Mass (kg)
 * @param {Number} velocity - Velocity (m/s)
 * @returns {Number} Kinetic energy (J)
 */
const kineticEnergy = (mass, velocity) => {
  return round(0.5 * mass * velocity * velocity, 2);
};

/**
 * Calculate potential energy
 * @param {Number} mass - Mass (kg)
 * @param {Number} height - Height (m)
 * @param {Number} g - Gravity (m/s²)
 * @returns {Number} Potential energy (J)
 */
const potentialEnergy = (mass, height, g = 9.81) => {
  return round(mass * g * height, 2);
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if number is in range
 * @param {Number} number - Number to check
 * @param {Number} min - Minimum
 * @param {Number} max - Maximum
 * @returns {Boolean} In range
 */
const isInRange = (number, min, max) => {
  return number >= min && number <= max;
};

/**
 * Check if number is integer
 * @param {Number} number - Number to check
 * @returns {Boolean} Is integer
 */
const isInteger = (number) => {
  return Number.isInteger(number);
};

/**
 * Check if number is finite
 * @param {Number} number - Number to check
 * @returns {Boolean} Is finite
 */
const isFinite = (number) => {
  return Number.isFinite(number);
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Basic operations
  round,
  clamp,
  percentage,
  lerp,
  mapRange,
  
  // Statistics
  mean,
  median,
  mode,
  sum,
  variance,
  standardDeviation,
  range,
  getPercentile,
  quartiles,
  correlation,
  zScore,
  
  // Regression
  linearRegression,
  predict,
  
  // Normalization
  normalize,
  standardize,
  
  // Distance
  euclideanDistance,
  manhattanDistance,
  cosineSimilarity,
  
  // Scoring
  weightedAverage,
  getGrade,
  calculateGPA,
  
  // Random
  randomInt,
  randomFloat,
  shuffle,
  sample,
  
  // Combinatorics
  factorial,
  permutations,
  combinations,
  
  // Physics
  projectileMotion,
  kineticEnergy,
  potentialEnergy,
  
  // Validation
  isInRange,
  isInteger,
  isFinite
};