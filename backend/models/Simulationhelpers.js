/**
 * SIMULATION UTILITIES
 * Helper functions for simulation validation and management
 * 
 * @module utils/simulationHelpers
 */

const { 
  SIMULATION_METADATA, 
  PHYSICS_SIMULATIONS, 
  MATH_SIMULATIONS,
  SIMULATION_COUNT 
} = require('../config/constants');

/**
 * Check if simulation exists
 * @param {string} simulationId - Simulation identifier
 * @returns {boolean} True if simulation exists
 */
const isValidSimulation = (simulationId) => {
  return simulationId in SIMULATION_METADATA;
};

/**
 * Get simulation by ID
 * @param {string} simulationId - Simulation identifier
 * @returns {Object|null} Simulation metadata or null
 */
const getSimulation = (simulationId) => {
  return SIMULATION_METADATA[simulationId] || null;
};

/**
 * Get all simulations by type
 * @param {string} type - Simulation type (physics/mathematics/chemistry)
 * @returns {Array} Array of simulation IDs
 */
const getSimulationsByType = (type) => {
  switch (type.toLowerCase()) {
    case 'physics':
      return PHYSICS_SIMULATIONS;
    case 'mathematics':
    case 'math':
      return MATH_SIMULATIONS;
    case 'chemistry':
      return [];
    default:
      return [];
  }
};

/**
 * Get all simulations by difficulty
 * @param {string} difficulty - Difficulty level (easy/medium/hard)
 * @returns {Array} Array of simulation objects
 */
const getSimulationsByDifficulty = (difficulty) => {
  return Object.entries(SIMULATION_METADATA)
    .filter(([_, sim]) => sim.difficulty === difficulty.toLowerCase())
    .map(([id, sim]) => ({ id, ...sim }));
};

/**
 * Get simulation statistics
 * @returns {Object} Simulation statistics
 */
const getSimulationStats = () => {
  const stats = {
    total: SIMULATION_COUNT.TOTAL,
    byType: {
      physics: SIMULATION_COUNT.PHYSICS,
      mathematics: SIMULATION_COUNT.MATH,
      chemistry: SIMULATION_COUNT.CHEMISTRY
    },
    byDifficulty: {
      easy: 0,
      medium: 0,
      hard: 0
    }
  };
  
  // Count by difficulty
  Object.values(SIMULATION_METADATA).forEach(sim => {
    stats.byDifficulty[sim.difficulty]++;
  });
  
  return stats;
};

/**
 * Search simulations by topic
 * @param {string} topic - Topic keyword
 * @returns {Array} Matching simulations
 */
const searchSimulationsByTopic = (topic) => {
  const keyword = topic.toLowerCase();
  return Object.entries(SIMULATION_METADATA)
    .filter(([_, sim]) => 
      sim.topics.some(t => t.toLowerCase().includes(keyword))
    )
    .map(([id, sim]) => ({ id, ...sim }));
};

/**
 * Get random simulation
 * @param {string} type - Optional: Filter by type
 * @param {string} difficulty - Optional: Filter by difficulty
 * @returns {Object} Random simulation with ID
 */
const getRandomSimulation = (type = null, difficulty = null) => {
  let simulations = Object.entries(SIMULATION_METADATA);
  
  // Filter by type
  if (type) {
    simulations = simulations.filter(([_, sim]) => sim.type === type);
  }
  
  // Filter by difficulty
  if (difficulty) {
    simulations = simulations.filter(([_, sim]) => sim.difficulty === difficulty);
  }
  
  if (simulations.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * simulations.length);
  const [id, sim] = simulations[randomIndex];
  
  return { id, ...sim };
};

/**
 * Validate simulation access for student level
 * @param {string} simulationId - Simulation ID
 * @param {number} studentClass - Student's class (6-12)
 * @returns {Object} { allowed: boolean, reason: string }
 */
const validateSimulationAccess = (simulationId, studentClass) => {
  const simulation = getSimulation(simulationId);
  
  if (!simulation) {
    return {
      allowed: false,
      reason: 'Simulation not found'
    };
  }
  
  // Difficulty-based access rules
  const accessRules = {
    easy: 6,      // Class 6+
    medium: 8,    // Class 8+
    hard: 10      // Class 10+
  };
  
  const requiredClass = accessRules[simulation.difficulty];
  
  if (studentClass < requiredClass) {
    return {
      allowed: false,
      reason: `This simulation is recommended for Class ${requiredClass} and above`
    };
  }
  
  return {
    allowed: true,
    reason: 'Access granted'
  };
};

/**
 * Get recommended simulations for student
 * @param {Object} student - Student object with class and performance
 * @returns {Array} Recommended simulation IDs
 */
const getRecommendedSimulations = (student) => {
  const recommendations = [];
  const studentClass = student.class;
  const performanceIndex = student.performanceIndex || 50;
  
  // Determine appropriate difficulty
  let targetDifficulty;
  if (performanceIndex >= 80) {
    targetDifficulty = 'hard';
  } else if (performanceIndex >= 60) {
    targetDifficulty = 'medium';
  } else {
    targetDifficulty = 'easy';
  }
  
  // Get simulations of target difficulty
  const candidates = getSimulationsByDifficulty(targetDifficulty);
  
  // Filter by class access
  const accessible = candidates.filter(sim => {
    const access = validateSimulationAccess(sim.id, studentClass);
    return access.allowed;
  });
  
  // Return up to 5 recommendations
  return accessible.slice(0, 5).map(sim => sim.id);
};

/**
 * Get simulation completion statistics
 * @param {Array} completedSimulations - Array of completed simulation IDs
 * @returns {Object} Completion statistics
 */
const getCompletionStats = (completedSimulations) => {
  const stats = {
    total: completedSimulations.length,
    byType: {
      physics: 0,
      mathematics: 0,
      chemistry: 0
    },
    byDifficulty: {
      easy: 0,
      medium: 0,
      hard: 0
    },
    completionRate: {
      overall: 0,
      physics: 0,
      mathematics: 0,
      chemistry: 0
    }
  };
  
  // Count completions
  completedSimulations.forEach(simId => {
    const sim = getSimulation(simId);
    if (sim) {
      stats.byType[sim.type]++;
      stats.byDifficulty[sim.difficulty]++;
    }
  });
  
  // Calculate completion rates
  stats.completionRate.overall = (stats.total / SIMULATION_COUNT.TOTAL * 100).toFixed(1);
  stats.completionRate.physics = (stats.byType.physics / SIMULATION_COUNT.PHYSICS * 100).toFixed(1);
  stats.completionRate.mathematics = (stats.byType.mathematics / SIMULATION_COUNT.MATH * 100).toFixed(1);
  
  return stats;
};

/**
 * Get simulation display name
 * @param {string} simulationId - Simulation ID
 * @returns {string} Human-readable name
 */
const getSimulationName = (simulationId) => {
  const sim = getSimulation(simulationId);
  return sim ? sim.name : simulationId;
};

/**
 * Get all simulation IDs
 * @returns {Array} All simulation IDs
 */
const getAllSimulationIds = () => {
  return Object.keys(SIMULATION_METADATA);
};

/**
 * Get simulation topics
 * @param {string} simulationId - Simulation ID
 * @returns {Array} Array of topics
 */
const getSimulationTopics = (simulationId) => {
  const sim = getSimulation(simulationId);
  return sim ? sim.topics : [];
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Validation
  isValidSimulation,
  validateSimulationAccess,
  
  // Getters
  getSimulation,
  getSimulationsByType,
  getSimulationsByDifficulty,
  getSimulationName,
  getSimulationTopics,
  getAllSimulationIds,
  
  // Search & Random
  searchSimulationsByTopic,
  getRandomSimulation,
  
  // Recommendations
  getRecommendedSimulations,
  
  // Statistics
  getSimulationStats,
  getCompletionStats
};