/**
 * SIMULATION HELPERS
 * Utility functions for simulation management and validation
 * 
 * @module utils/simulationHelpers
 */

const { 
  PHYSICS_SIMULATIONS, 
  MATH_SIMULATIONS, 
  CHEMISTRY_SIMULATIONS,
  SIMULATION_METADATA,
  SIMULATION_TYPES 
} = require('../config/constants');

// ============================================================================
// CLASS ACCESS MAPPING
// ============================================================================

// Define minClass and maxClass for each simulation
const SIMULATION_CLASS_ACCESS = {
  // Physics Simulations
  'motion-classifier-sim': { minClass: 8, maxClass: 12 },
  'measurement-skills-sim': { minClass: 7, maxClass: 10 },
  'motion-timer-sim': { minClass: 8, maxClass: 11 },
  'projectile-motion-simulator': { minClass: 9, maxClass: 12 },
  'shadow-formation-simulator': { minClass: 6, maxClass: 9 },
  'weather-system-model': { minClass: 7, maxClass: 11 },
  'sound-wave-generator': { minClass: 7, maxClass: 11 },
  'heat-flow-simulator': { minClass: 9, maxClass: 12 },
  'light-path-visualizer': { minClass: 8, maxClass: 12 },
  'newtons-laws-demonstrator': { minClass: 8, maxClass: 11 },
  'magnetic-field-visualizer': { minClass: 10, maxClass: 12 },
  'gas-properties-simulator': { minClass: 9, maxClass: 12 },
  'electrolysis-simulator': { minClass: 11, maxClass: 12 },
  'force-visualizer': { minClass: 8, maxClass: 12 },
  'gravity-simulator': { minClass: 9, maxClass: 12 },
  'electric-field-mapper': { minClass: 10, maxClass: 12 },
  'ray-diagram-builder': { minClass: 8, maxClass: 12 },
  'energy-transformation-visualizer': { minClass: 7, maxClass: 11 },
  'advanced-circuit-simulator': { minClass: 9, maxClass: 12 },
  
  // Math Simulations
  'shape-builder-measurer': { minClass: 6, maxClass: 9 },
  'fraction-pie-visualizer': { minClass: 6, maxClass: 8 },
  'equation-solver-with-steps': { minClass: 7, maxClass: 11 },
  'data-set-analyzer': { minClass: 8, maxClass: 12 },
  'unit-circle-simulator': { minClass: 9, maxClass: 12 },
  'three-d-vector-visualizer': { minClass: 10, maxClass: 12 },
  'polynomial-grapher': { minClass: 9, maxClass: 12 },
  'quadratic-explorer': { minClass: 8, maxClass: 11 },
  'coordinate-plotter': { minClass: 6, maxClass: 10 },
  'equation-balancer': { minClass: 7, maxClass: 9 },
  'geometric-proof-builder': { minClass: 8, maxClass: 12 },
  'calculus-visualizer': { minClass: 11, maxClass: 12 },
  'trigonometry-visualizer': { minClass: 9, maxClass: 12 },
  'probability-simulator': { minClass: 8, maxClass: 12 },
  'interactive-graph-maker': { minClass: 6, maxClass: 11 },
  'ratio-visualizer': { minClass: 6, maxClass: 9 },
  'symmetry-explorer': { minClass: 6, maxClass: 10 }
};

// ============================================================================
// DIFFICULTY CLASSIFICATION
// ============================================================================

const SIMULATION_DIFFICULTY = {
  // Physics
  'motion-classifier-sim': 'medium',
  'measurement-skills-sim': 'easy',
  'motion-timer-sim': 'medium',
  'projectile-motion-simulator': 'hard',
  'shadow-formation-simulator': 'easy',
  'weather-system-model': 'medium',
  'sound-wave-generator': 'medium',
  'heat-flow-simulator': 'hard',
  'light-path-visualizer': 'medium',
  'newtons-laws-demonstrator': 'medium',
  'magnetic-field-visualizer': 'hard',
  'gas-properties-simulator': 'hard',
  'electrolysis-simulator': 'hard',
  'force-visualizer': 'medium',
  'gravity-simulator': 'hard',
  'electric-field-mapper': 'hard',
  'ray-diagram-builder': 'medium',
  'energy-transformation-visualizer': 'medium',
  'advanced-circuit-simulator': 'hard',
  
  // Math
  'shape-builder-measurer': 'easy',
  'fraction-pie-visualizer': 'easy',
  'equation-solver-with-steps': 'medium',
  'data-set-analyzer': 'medium',
  'unit-circle-simulator': 'medium',
  'three-d-vector-visualizer': 'hard',
  'polynomial-grapher': 'hard',
  'quadratic-explorer': 'medium',
  'coordinate-plotter': 'easy',
  'equation-balancer': 'easy',
  'geometric-proof-builder': 'hard',
  'calculus-visualizer': 'hard',
  'trigonometry-visualizer': 'hard',
  'probability-simulator': 'medium',
  'interactive-graph-maker': 'easy',
  'ratio-visualizer': 'easy',
  'symmetry-explorer': 'medium'
};

// ============================================================================
// SIMULATION NAMES
// ============================================================================

const SIMULATION_NAMES = {
  // Physics
  'motion-classifier-sim': 'Motion Classifier Simulation',
  'measurement-skills-sim': 'Measurement Skills Simulation',
  'motion-timer-sim': 'Motion Timer Simulation',
  'projectile-motion-simulator': 'Projectile Motion Simulator',
  'shadow-formation-simulator': 'Shadow Formation Simulator',
  'weather-system-model': 'Weather System Model',
  'sound-wave-generator': 'Sound Wave Generator',
  'heat-flow-simulator': 'Heat Flow Simulator',
  'light-path-visualizer': 'Light Path Visualizer',
  'newtons-laws-demonstrator': "Newton's Laws Demonstrator",
  'magnetic-field-visualizer': 'Magnetic Field Visualizer',
  'gas-properties-simulator': 'Gas Properties Simulator',
  'electrolysis-simulator': 'Electrolysis Simulator',
  'force-visualizer': 'Force Visualizer',
  'gravity-simulator': 'Gravity Simulator',
  'electric-field-mapper': 'Electric Field Mapper',
  'ray-diagram-builder': 'Ray Diagram Builder',
  'energy-transformation-visualizer': 'Energy Transformation Visualizer',
  'advanced-circuit-simulator': 'Advanced Circuit Simulator',
  
  // Math
  'shape-builder-measurer': 'Shape Builder & Measurer',
  'fraction-pie-visualizer': 'Fraction Pie Visualizer',
  'equation-solver-with-steps': 'Equation Solver with Steps',
  'data-set-analyzer': 'Data Set Analyzer',
  'unit-circle-simulator': 'Unit Circle Simulator',
  'three-d-vector-visualizer': '3D Vector Visualizer',
  'polynomial-grapher': 'Polynomial Grapher',
  'quadratic-explorer': 'Quadratic Explorer',
  'coordinate-plotter': 'Coordinate Plotter',
  'equation-balancer': 'Equation Balancer',
  'geometric-proof-builder': 'Geometric Proof Builder',
  'calculus-visualizer': 'Calculus Visualizer',
  'trigonometry-visualizer': 'Trigonometry Visualizer',
  'probability-simulator': 'Probability Simulator',
  'interactive-graph-maker': 'Interactive Graph Maker',
  'ratio-visualizer': 'Ratio Visualizer',
  'symmetry-explorer': 'Symmetry Explorer'
};

// ============================================================================
// SUBJECT TYPE MAPPING
// ============================================================================

const SIMULATION_SUBJECT = {
  // Physics - all simulations mapped to 'physics'
  ...Object.fromEntries(PHYSICS_SIMULATIONS.map(id => [id, 'physics'])),
  // Math - all simulations mapped to 'mathematics'
  ...Object.fromEntries(MATH_SIMULATIONS.map(id => [id, 'mathematics'])),
  // Chemistry - all simulations mapped to 'chemistry'
  ...Object.fromEntries(CHEMISTRY_SIMULATIONS.map(id => [id, 'chemistry']))
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all simulation IDs
 * @returns {Array<string>} Array of all simulation IDs
 */
exports.getAllSimulationIds = () => {
  return [...PHYSICS_SIMULATIONS, ...MATH_SIMULATIONS, ...CHEMISTRY_SIMULATIONS];
};

/**
 * Check if simulation type is valid
 * @param {string} simulationType - Simulation ID to validate
 * @returns {boolean} True if valid
 */
exports.isValidSimulation = (simulationType) => {
  return SIMULATION_METADATA.hasOwnProperty(simulationType);
};

/**
 * Get simulation metadata (enriched with name, difficulty, class access)
 * @param {string} simulationType - Simulation ID
 * @returns {Object|null} Simulation metadata or null
 */
exports.getSimulation = (simulationType) => {
  if (!SIMULATION_METADATA[simulationType]) {
    return null;
  }
  
  const baseMetadata = SIMULATION_METADATA[simulationType];
  const classAccess = SIMULATION_CLASS_ACCESS[simulationType] || { minClass: 6, maxClass: 12 };
  
  return {
    ...baseMetadata,
    name: SIMULATION_NAMES[simulationType] || simulationType,
    type: SIMULATION_SUBJECT[simulationType] || 'unknown',
    difficulty: SIMULATION_DIFFICULTY[simulationType] || 'medium',
    minClass: classAccess.minClass,
    maxClass: classAccess.maxClass
  };
};

/**
 * Get simulations by subject
 * @param {string} subject - Subject type (physics, mathematics, chemistry)
 * @returns {Array<Object>} Array of simulations
 */
exports.getSimulationsBySubject = (subject) => {
  const subjectMap = {
    'physics': PHYSICS_SIMULATIONS,
    'mathematics': MATH_SIMULATIONS,
    'chemistry': CHEMISTRY_SIMULATIONS
  };
  
  const simIds = subjectMap[subject] || [];
  return simIds.map(simId => {
    const sim = exports.getSimulation(simId);
    return sim ? { id: simId, ...sim } : null;
  }).filter(sim => sim !== null);
};

/**
 * Validate simulation access based on class level
 * @param {string} simulationType - Simulation ID
 * @param {number} studentClass - Student's class (6-12)
 * @returns {Object} Access validation result
 */
exports.validateSimulationAccess = (simulationType, studentClass) => {
  const simulation = exports.getSimulation(simulationType);
  
  if (!simulation) {
    return {
      allowed: false,
      reason: 'Simulation not found'
    };
  }
  
  if (studentClass < simulation.minClass) {
    return {
      allowed: false,
      reason: `Available from Class ${simulation.minClass}`
    };
  }
  
  if (studentClass > simulation.maxClass) {
    return {
      allowed: false,
      reason: `Only available up to Class ${simulation.maxClass}`
    };
  }
  
  return {
    allowed: true,
    reason: 'Accessible'
  };
};

/**
 * Get recommended simulations for student
 * @param {Object} student - Student object with class and competencies
 * @returns {Array<string>} Array of recommended simulation IDs
 */
exports.getRecommendedSimulations = (student) => {
  const studentClass = student.class;
  const weakCompetencies = student.weakCompetencies || [];
  
  // Get all accessible simulations
  const allSimIds = exports.getAllSimulationIds();
  const accessible = allSimIds.filter(simId => {
    const access = exports.validateSimulationAccess(simId, studentClass);
    return access.allowed;
  });
  
  // Sort by difficulty (easier first for weaker students)
  const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
  
  accessible.sort((a, b) => {
    const simA = exports.getSimulation(a);
    const simB = exports.getSimulation(b);
    return difficultyOrder[simA.difficulty] - difficultyOrder[simB.difficulty];
  });
  
  // Return top 5 recommendations
  return accessible.slice(0, 5);
};

/**
 * Get simulations by difficulty
 * @param {string} difficulty - easy, medium, or hard
 * @returns {Array<string>} Array of simulation IDs
 */
exports.getSimulationsByDifficulty = (difficulty) => {
  return Object.keys(SIMULATION_DIFFICULTY).filter(simId => {
    return SIMULATION_DIFFICULTY[simId] === difficulty;
  });
};

/**
 * Search simulations by topic
 * @param {string} topic - Topic to search for
 * @returns {Array<Object>} Array of matching simulations
 */
exports.searchSimulationsByTopic = (topic) => {
  const lowerTopic = topic.toLowerCase();
  
  return exports.getAllSimulationIds()
    .filter(simId => {
      const metadata = SIMULATION_METADATA[simId];
      if (!metadata || !metadata.topics) return false;
      
      return metadata.topics.some(t => t.toLowerCase().includes(lowerTopic));
    })
    .map(simId => ({
      id: simId,
      ...exports.getSimulation(simId)
    }));
};

/**
 * Get simulation statistics
 * @returns {Object} Statistics about simulations
 */
exports.getSimulationStats = () => {
  const allSimIds = exports.getAllSimulationIds();
  
  return {
    total: allSimIds.length,
    byType: {
      physics: PHYSICS_SIMULATIONS.length,
      mathematics: MATH_SIMULATIONS.length,
      chemistry: CHEMISTRY_SIMULATIONS.length
    },
    byDifficulty: {
      easy: exports.getSimulationsByDifficulty('easy').length,
      medium: exports.getSimulationsByDifficulty('medium').length,
      hard: exports.getSimulationsByDifficulty('hard').length
    }
  };
};

// Export metadata for external use
exports.SIMULATION_METADATA = SIMULATION_METADATA;