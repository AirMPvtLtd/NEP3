/**
 * APPLICATION CONSTANTS
 * Central location for all application constants
 * 
 * @module config/constants
 */

// ============================================================================
// USER ROLES
// ============================================================================

const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent'
};

const ROLE_HIERARCHY = {
  admin: 4,
  teacher: 3,
  student: 2,
  parent: 1
};

// ============================================================================
// USER STATUS
// ============================================================================

const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

// ============================================================================
// NEP 2020 COMPETENCIES
// ============================================================================

const NEP_COMPETENCIES = [
  'critical-thinking',
  'problem-solving',
  'scientific-temper',
  'analytical-reasoning',
  'creativity',
  'communication',
  'collaboration',
  'digital-literacy',
  'social-responsibility',
  'innovation',
  'ethical-awareness',
  'cultural-understanding'
];

const COMPETENCY_LABELS = {
  'critical-thinking': 'Critical Thinking',
  'problem-solving': 'Problem Solving',
  'scientific-temper': 'Scientific Temper',
  'analytical-reasoning': 'Analytical Reasoning',
  'creativity': 'Creativity',
  'communication': 'Communication',
  'collaboration': 'Collaboration',
  'digital-literacy': 'Digital Literacy',
  'social-responsibility': 'Social Responsibility',
  'innovation': 'Innovation',
  'ethical-awareness': 'Ethical Awareness',
  'cultural-understanding': 'Cultural Understanding'
};

// ============================================================================
// SIMULATION TYPES
// ============================================================================

const SIMULATION_TYPES = [
  'physics',
  'mathematics'
  // 'chemistry' - Will be added in next phase
];

// Total simulation count
const SIMULATION_COUNT = {
  PHYSICS: 19,
  MATH: 17,
  CHEMISTRY: 0,
  TOTAL: 36
};

// Simulation metadata for validation and display
const SIMULATION_METADATA = {
  // Physics Simulations (19)
    'motion-classifier-sim': {
        topics: ["uniform motion", "accelerated motion", "decelerated motion", "circular motion", "velocity", "acceleration", "displacement", "distance traveled", "motion graphs", "velocity-time graphs", "graph interpretation", "speed vs velocity", "constant vs changing velocity", "direction of acceleration"],
        tools: ["motion type selector", "speed controller", "play/pause/reset controls", "motion visualization canvas", "real-time object tracking", "velocity vector display", "grid reference system", "velocity-time graph plotter", "real-time data plotting", "position tracker (coordinates)", "velocity display", "distance calculator", "time elapsed display", "interactive challenge interface", "hint system", "feedback mechanism", "progress tracker"],
        difficulty_factors: ["multiple motion types", "speed variations", "time-based analysis", "graph interpretation", "real-time classification", "adaptive difficulty", "conceptual application", "real-world connection"]
    },
    'measurement-skills-sim': {
        topics: ['precision', 'accuracy', 'units', 'measurement tools', 'error analysis'],
        tools: ['ruler', 'protractor', 'scale', 'measuring instruments'],
        difficulty_factors: ['unit conversion', 'significant figures', 'error propagation']
    },
    'motion-timer-sim': {
        topics: ["motion timing", "uniform motion", "velocity", "distance-time relationship", "kinematics", "measurement techniques", "time intervals", "photogates", "motion sensors", "data collection", "velocity calculations", "acceleration (conceptual)", "motion analysis", "experimental setup", "error analysis", "precision measurement", "calibration", "time measurement", "motion tracking", "constant velocity motion", "motion experiments", "physics lab techniques", "data recording", "analysis methods"],
        tools: ["motion timer", "velocity control", "distance adjustment", "time gate placement", "data recording interface", "time display", "measurement tools", "graphical track", "real-time position tracker", "start/pause/reset controls", "data export tool", "measurement comparison tool", "calibration tools", "error calculation tool", "multiple gate setup", "analysis dashboard", "experimental repeat tool", "velocity calculation tool"],
        difficulty_factors: ["measurement uncertainty", "reaction time errors", "systematic errors", "multiple time gates coordination", "non-uniform motion analysis", "velocity variations", "acceleration effects", "experimental setup calibration", "data precision challenges", "error propagation calculations", "human reaction time factors", "instrument limitations", "environmental factors", "statistical analysis of timing data", "experimental design optimization", "velocity verification methods", "accuracy vs precision analysis", "motion sensor calibration"]
    },
    'projectile-motion-simulator': {
        topics: ["projectile motion", "kinematics", "trajectory", "launch angle", "initial velocity", "time of flight", "maximum height", "range calculation", "gravitational acceleration", "parabolic motion", "horizontal velocity", "vertical velocity", "air resistance (conceptual)", "motion in two dimensions", "vector components", "free fall", "motion equations", "projectile path", "launch parameters", "motion analysis", "height calculations", "distance calculations", "velocity components", "acceleration due to gravity", "motion simulation", "physics calculations"],
        tools: ["velocity control slider", "angle adjustment tool", "height input", "gravity adjustment", "launch button", "pause/reset controls", "trajectory visualizer", "real-time data display", "calculated values panel", "projectile marker", "grid reference system", "motion tracking", "parameter adjustment tools", "simulation speed control", "data recording interface", "comparative analysis tool", "trajectory overlay", "launch history tracker"],
        difficulty_factors: ["air resistance effects", "angled launch from height", "maximum range optimization", "velocity vector decomposition", "projectile optimization", "complex launch conditions", "trajectory calculations", "motion component analysis", "energy considerations", "angular optimization", "multi-projectile systems", "collision scenarios", "non-ideal conditions", "projectile range maximization", "launch parameter optimization", "interactive trajectory planning"]
    },
    'shadow-formation-simulator': {
        topics: ["light propagation", "shadow formation", "ray optics", "light sources", "opaque objects", "transparent objects", "umbra", "penumbra", "point source", "extended source", "light direction", "shadow size", "object distance", "light distance", "shadow length", "geometric optics", "rectilinear propagation", "pinhole camera", "eclipse formation", "shadow types", "light intensity", "object shape effects", "multiple light sources", "shadow overlap", "shadow sharpness"],
        tools: ["light position control", "object shape selector", "light intensity slider", "object placement tool", "shadow visualizer", "clear objects button", "light type toggle", "grid overlay", "measurement tool", "shadow length display", "multiple light sources", "object size control", "ground plane", "distance indicators", "comparison mode", "save setup", "load setup", "shadow recording"],
        difficulty_factors: ["multiple light sources", "extended source shadows", "object transparency", "colored light effects", "shadow overlapping", "complex object shapes", "moving light sources", "quantitative measurements", "shadow area calculation", "penumbra formation", "umbra calculation", "light angle variation", "object rotation", "3D shadow projection", "real-world applications", "experimental setup design"]
    },
    'weather-system-model': {
        topics: ["atmospheric pressure", "temperature effects", "humidity levels", "wind patterns", "weather systems", "cloud formation", "precipitation", "air masses", "fronts", "weather fronts", "climate factors", "meteorology basics", "air pressure systems", "temperature gradients", "wind direction", "weather prediction", "seasonal changes", "microclimates", "weather instruments", "climate zones", "precipitation types", "atmospheric layers", "weather maps", "forecasting", "climate science"],
        tools: ["temperature slider", "humidity control", "wind speed adjustment", "weather pattern selector", "animation controls", "cloud simulation", "rain effects", "lightning simulation", "pressure calculation", "real-time visualization", "weather type buttons", "forecast display", "condition monitoring", "interactive map", "simulation controls", "data recording", "pattern analysis", "comparative weather"],
        difficulty_factors: ["pressure gradient simulation", "front formation modeling", "storm system development", "seasonal pattern analysis", "microclimate creation", "weather forecasting", "climate change effects", "atmospheric dynamics", "coriolis effect", "jet stream simulation", "precipitation calculation", "temperature inversion", "humidity condensation", "extreme weather events", "weather pattern prediction", "multi-variable analysis"]
    },
    'sound-wave-generator': {
        topics: ["wave properties", "frequency", "amplitude", "wavelength", "period", "wave speed", "sound waves", "musical notes", "wave types", "oscillation", "wave equation", "sound production", "wave visualization", "harmonic motion", "acoustics", "pitch perception", "loudness", "timbre", "resonance", "wave interference", "sound frequency", "wave patterns", "audio synthesis", "wave propagation", "sound intensity"],
        tools: ["frequency slider", "amplitude control", "wave type selector", "play sound button", "stop sound button", "musical note presets", "wave visualization canvas", "property display panel", "real-time animation", "audio context control", "oscillator control", "waveform display", "measurement tools", "comparison mode", "save wave preset", "frequency range selector", "amplitude modulation", "time controls"],
        difficulty_factors: ["complex waveforms", "frequency modulation", "amplitude modulation", "harmonic addition", "beat frequency", "resonance simulation", "interference patterns", "standing waves", "doppler effect", "sound intensity calculation", "decibel scale", "harmonic series", "fourier analysis basics", "sound wave synthesis", "musical scales", "real-time audio manipulation"]
    },
    'heat-flow-simulator': {
        topics: ["heat transfer", "thermal conductivity", "temperature gradient", "thermal equilibrium", "heat conduction", "thermodynamics", "heat flow", "thermal diffusion", "heat conduction equations", "thermal properties of materials", "insulation", "thermal resistance", "heat transfer rate", "thermal expansion (conceptual)", "specific heat capacity", "thermal energy", "conduction mechanisms", "thermal contact", "temperature measurement", "heat transfer applications", "thermal management", "energy conservation in heat transfer", "thermal conductivity coefficients", "heat flux", "thermal boundary conditions"],
        tools: ["material selector", "temperature control sliders", "thermal gradient visualizer", "conductivity calculator", "heat flow rate monitor", "temperature gradient display", "simulation start/stop controls", "material property database", "real-time thermal mapping", "comparative analysis tool", "data recording interface", "material comparison tool", "thermal equilibrium tracker", "heat transfer visualization", "simulation speed control", "temperature probe simulation", "thermal resistance calculator", "heat flow direction indicator"],
        difficulty_factors: ["thermal conductivity variations", "transient heat transfer", "composite materials", "non-uniform boundary conditions", "thermal contact resistance", "convection effects", "radiation heat transfer", "thermal conductivity measurements", "material property uncertainty", "temperature-dependent conductivity", "multi-dimensional heat transfer", "thermal interface materials", "heat transfer coefficient calculations", "steady-state vs transient analysis", "thermal circuit analysis", "thermal insulation effectiveness", "energy efficiency calculations", "thermal management design"]
    },
    'light-path-visualizer': {
        topics: ["reflection", "refraction", "lenses", "mirrors", "ray tracing", "Snell's law", "law of reflection", "focal points", "optical axes", "image formation", "converging lenses", "diverging lenses", "concave mirrors", "convex mirrors", "plane mirrors", "refractive index", "critical angle", "total internal reflection", "dispersion", "optical power", "magnification", "real/virtual images", "upright/inverted images", "ray diagrams", "principal rays", "optical systems", "light path geometry", "angular measurement", "optical properties"],
        tools: ["lens/mirror placer", "ray tracer", "focal point marker", "light source control", "angle adjustment tool", "refractive index selector", "object type chooser", "ray visualization tools", "optical axis display", "distance measurement tool", "magnification calculator", "image formation predictor", "tool selection interface", "ray path tracer", "optical component library", "workspace grid", "clear/reset controls", "save/load configuration", "interactive workspace"],
        difficulty_factors: ["compound systems", "aberrations", "magnification calculations", "multiple optical elements", "image location prediction", "ray path complexity", "optical system design", "focal length variations", "chromatic aberration", "spherical aberration", "image distortion", "optical bench alignment", "virtual image analysis", "optical power calculations", "system magnification", "optical axis alignment", "multiple ray tracing", "object-image relationships", "optical system optimization"]
    },
    'newtons-laws-demonstrator': {
        topics: ["Newton's First Law (Inertia)", "Newton's Second Law (F = ma)", "Newton's Third Law (Action-Reaction)", "force", "mass", "acceleration", "velocity", "friction", "inertia", "constant velocity motion", "accelerated motion", "action-reaction pairs", "momentum transfer", "force-mass-acceleration relationship", "vector quantities", "proportional reasoning", "equation application (F = ma)"],
        tools: ["law selector switch", "active law indicator", "initial velocity slider", "friction toggle switch", "moving object visualization", "velocity arrow display", "mass adjuster slider", "force adjuster slider", "box object with force arrow", "acceleration calculator", "real-time acceleration display", "exhaust velocity slider", "rocket and exhaust visualization", "action-reaction arrow pairs", "momentum exchange display", "play/pause/reset controls", "physics canvas with grid", "real-time calculations panel", "key equations reference", "demonstration statistics tracker"],
        difficulty_factors: ["multiple law integration", "vector nature of forces", "inertial reference frames", "action-reaction identification", "parameter adjustment effects", "friction modeling", "real-time data interpretation", "predictive vs. observational analysis", "law isolation vs. combination", "qualitative to quantitative transition", "real-world application transfer", "misconception addressing"]
    },
    'magnetic-field-visualizer': {
        topics: ["magnetic fields", "flux", "field lines", "magnetic materials", "magnetic poles (North/South)", "field strength", "field direction", "vector fields", "magnetic dipoles", "solenoid fields", "Earth's magnetic field", "field patterns", "field visualization", "magnetic field equations", "Biot-Savart law (conceptual)", "field density", "field uniformity", "magnetic shielding", "electromagnetic induction basics", "field measurement"],
        tools: ["magnet placer", "compass tool", "field line visualizer", "vector field display", "field strength slider", "configuration selector (bar/horseshoe/solenoid/earth)", "visualization toggle (vectors/lines)", "strength measurement tool", "pole placement tool", "real-time field calculator", "grid overlay", "color-coded field strength map", "field line density counter", "magnets clearance tool", "configuration presets"],
        difficulty_factors: ["field superposition", "induced currents", "Lorentz force", "3D field extrapolation", "field gradient analysis", "magnetic moment calculations", "field symmetry analysis", "non-uniform field effects", "multiple magnet interactions", "field line density-strength relationship", "inverse square law application", "dipole field modeling", "field energy density concepts", "Maxwell's equations (qualitative)", "magnetic shielding design", "field mapping techniques"]
    },
    'gas-properties-simulator': {
        topics: ["pressure", "volume", "temperature", "ideal gas law", "kinetic theory", "Boyle's law", "Charles's law", "Gay-Lussac's law", "combined gas law", "gas particle motion", "particle collisions", "pressure generation", "temperature-speed relationship", "volume-pressure relationship", "gas density", "particle velocity distribution", "internal energy", "average kinetic energy", "gas constant (R)", "mole concept", "particle count effects", "wall collisions", "collision frequency", "particle speed measurement", "gas expansion/compression", "isothermal processes", "isobaric processes", "isochoric processes", "adiabatic concepts", "real gas deviations"],
        tools: ["pressure gauge", "volume control", "temperature dial", "particle counter", "simulation start/stop controls", "gas law selector (ideal/Boyle/Charles/Gay-Lussac)", "particle motion visualizer", "collision counter", "speed indicator", "real-time calculations display", "container volume marker", "temperature-color mapping", "particle speed histogram tool", "measurement recording tool", "parameter reset control", "data export tool", "comparative analysis tool", "prediction verification system"],
        difficulty_factors: ["gas law relationships", "molecular motion", "real vs ideal gases", "multiple variable interactions", "statistical particle behavior", "energy distribution analysis", "experimental error identification", "theoretical vs experimental comparison", "adiabatic process modeling", "non-ideal gas factors", "particle interaction effects", "measurement accuracy challenges", "microscopic-macroscopic connections", "thermodynamic process visualization", "gas mixture complexities", "pressure-temperature-volume interdependence"]
    },
    'electrolysis-simulator': {
        topics: ["electrolysis", "oxidation", "reduction", "electrodes", "Faraday's law", "electrolytic cells", "electrochemical processes", "anode reactions", "cathode reactions", "ionic compounds", "electrolyte solutions", "water splitting", "hydrogen production", "oxygen production", "electroplating", "electrolytic refining", "electrochemistry", "charge transfer", "ionic migration", "electron flow", "stoichiometry of electrolysis", "electrochemical calculations", "overpotential", "electrochemical series", "decomposition potential", "current efficiency", "half-cell reactions", "ionic conductivity", "electrochemical energy conversion"],
        tools: ["electrode setup", "voltage control", "current meter", "electrolyte solution selector", "gas collection visualizer", "reaction equation display", "charge accumulator", "time tracking tool", "stoichiometry calculator", "electrolysis rate analyzer", "reaction product tracker", "electrode material selector", "bubble generation simulator", "electrical parameter adjuster", "quantitative measurement tool", "data recording interface", "process visualization tools", "safety indicator"],
        difficulty_factors: ["stoichiometry", "electrode reactions", "quantitative analysis", "current efficiency calculations", "overpotential effects", "concentration gradients", "ionic mobility", "electrolysis kinetics", "multiple reaction pathways", "side reactions", "electrode polarization", "electrolyte concentration effects", "temperature effects", "energy efficiency calculations", "industrial scale-up considerations", "cell design optimization", "safety considerations in electrolysis"]
    },
    'force-visualizer': {
        topics: ["force vectors", "resultant force", "equilibrium", "force components", "vector addition", "vector decomposition", "parallelogram law", "triangle law", "polygon law of forces", "coordinate system forces", "resolution of forces", "net force calculation", "static equilibrium conditions", "force magnitude and direction", "force angle measurement", "vector mathematics", "graphical vector addition", "analytical vector addition", "force balance", "concurrent forces", "non-concurrent forces", "force systems"],
        tools: ["force vector arrows", "component analyzer", "equilibrium checker", "magnitude sliders", "angle input controls", "grid coordinate system", "vector sum calculator", "real-time statistics display", "configuration saver/loader", "view mode toggle (2D/components)", "auto-equilibrium detector", "force system randomizer", "measurement tools (protractor, ruler simulation)", "vector label editor", "export/import configuration", "session timer"],
        difficulty_factors: ["vector addition in multiple dimensions", "3D force systems", "torque and moment calculations", "non-concurrent forces", "force couples", "distributed loads", "friction forces", "inclined plane forces", "pulley systems", "truss analysis", "frame structures", "equilibrium of rigid bodies", "virtual work principle", "free body diagrams", "constraint reactions"]
    },
    'gravity-simulator': {
        topics: ["gravitational force", "orbital motion", "escape velocity", "Kepler's laws", "Newton's law of universal gravitation", "centripetal force", "gravitational potential energy", "orbital mechanics", "orbital period calculation", "orbital velocity", "elliptical orbits (conceptual)", "satellite motion", "astronomical units", "solar system mechanics", "conservation of angular momentum", "gravitational acceleration", "tidal forces (conceptual)", "Lagrange points (conceptual)", "Hohmann transfers (conceptual)", "orbital decay", "geostationary orbits", "planetary motion"],
        tools: ["planet/satellite placer", "trajectory visualizer", "mass adjuster", "orbital velocity slider", "distance from star slider", "orbital data calculator", "preset scenarios (Earth/Mercury/Mars)", "real-time physics calculations display", "start/pause/reset controls", "vector visualization (velocity & gravity arrows)", "orbit path tracer", "gravitational force calculator", "orbital period timer", "escape velocity calculator", "scale adjustment tool", "simulation speed control", "energy diagram tool", "configuration saver"],
        difficulty_factors: ["orbital mechanics", "gravitational potential", "three-body problem", "elliptical orbit calculations", "orbital resonance", "gravitational slingshot effects", "orbital perturbations", "multi-planet systems", "orbital inclination", "retrograde vs prograde orbits", "tidal locking", "orbital stability analysis", "energy conservation in orbits", "relativistic effects (conceptual)", "orbital maneuver planning", "gravitational assist calculations", "orbital decay factors", "Lagrange point stability", "orbital transfer mathematics", "N-body simulation challenges"]
    },
    'electric-field-mapper': {
        topics: ["electric field", "field lines", "potential", "Gauss's law", "Coulomb's law", "electric charge", "point charges", "dipole fields", "electric potential energy", "electric field vectors", "field line density", "charge distribution", "electric flux", "electric dipole moment", "superposition principle", "equipotential lines", "electric field magnitude", "field direction", "charge interaction", "conservation of charge", "electric field mapping", "potential difference", "electric field visualization", "charge placement", "field calculations", "charge configuration"],
        tools: ["charge placer", "field line viewer", "potential mapper", "charge magnitude slider", "charge type toggle", "vector field visualizer", "grid-based field measurement", "field strength calculator", "potential contour tool", "charge configuration saver", "clear charges tool", "visualization mode toggle", "real-time field calculations", "charge statistics display", "field line density control", "potential color mapping", "electric flux calculator", "dipole configuration tool", "multiple charge placement", "interactive field exploration"],
        difficulty_factors: ["field superposition", "equipotential surfaces", "conductors", "multiple charge interactions", "complex charge distributions", "3D field extrapolation", "Gauss's law application", "potential gradient calculations", "field line density interpretation", "electric flux calculations", "dipole field analysis", "charge configuration symmetry", "boundary conditions", "conducting surfaces", "charge induction effects", "field mapping accuracy", "vector field mathematics", "potential energy calculations", "continuous charge distributions", "field visualization in 3D"]
    },
    'ray-diagram-builder': {
        topics: ["reflection", "refraction", "lenses", "mirrors", "ray tracing", "Snell's law", "law of reflection", "focal points", "optical axes", "image formation", "converging lenses", "diverging lenses", "concave mirrors", "convex mirrors", "plane mirrors", "refractive index", "critical angle", "total internal reflection", "dispersion", "optical power", "magnification", "real/virtual images", "upright/inverted images", "ray diagrams", "principal rays", "optical systems", "light path geometry", "angular measurement", "optical properties"],
        tools: ["lens/mirror placer", "ray tracer", "focal point marker", "light source control", "angle adjustment tool", "refractive index selector", "object type chooser", "ray visualization tools", "optical axis display", "distance measurement tool", "magnification calculator", "image formation predictor", "tool selection interface", "ray path tracer", "optical component library", "workspace grid", "clear/reset controls", "save/load configuration", "interactive workspace"],
        difficulty_factors: ["compound systems", "aberrations", "magnification calculations", "multiple optical elements", "image location prediction", "ray path complexity", "optical system design", "focal length variations", "chromatic aberration", "spherical aberration", "image distortion", "optical bench alignment", "virtual image analysis", "optical power calculations", "system magnification", "optical axis alignment", "multiple ray tracing", "object-image relationships", "optical system optimization"]
    },
    'energy-transformation-visualizer': {
        topics: ["energy conservation", "kinetic energy", "potential energy", "energy transfer", "thermal energy", "spring energy", "gravitational potential energy", "elastic potential energy", "mechanical energy", "energy transformation", "energy conversion efficiency", "pendulum motion", "free fall physics", "spring oscillations", "roller coaster physics", "conservation of mechanical energy", "energy dissipation", "friction losses", "work-energy theorem", "energy bar charts", "energy flow diagrams", "system energy analysis", "energy storage mechanisms", "renewable energy concepts (basic)", "power calculations", "energy transfer rates"],
        tools: ["energy bar charts", "system configurator", "efficiency calculator", "height adjustment slider", "scenario selector", "real-time energy value displays", "energy distribution visualization bar", "interactive simulation controls", "energy transformation animator", "system parameter tuner", "energy conservation verifier", "scenario comparison tool", "energy loss tracker", "thermal energy calculator", "simulation speed control", "data recording tool", "energy flow diagram generator", "efficiency percentage calculator"],
        difficulty_factors: ["multi-step transformations", "energy losses", "power calculations", "efficiency analysis", "complex system interactions", "multiple energy types conversion", "real-time energy conservation verification", "dissipation modeling", "non-conservative forces", "thermal energy generation", "friction coefficient effects", "system optimization challenges", "energy transfer rate analysis", "dynamic system analysis", "energy storage capacity calculations"]
    },
    'advanced-circuit-simulator': {
        topics: ["Ohm's law", "series/parallel circuits", "voltage", "current", "resistance", "electric circuits", "circuit components", "circuit connections", "battery terminals", "resistors", "light bulbs", "switches", "conductors", "insulators", "electrical measurements", "voltage drop", "current flow", "circuit diagrams", "electrical symbols", "short circuits", "open circuits", "closed circuits", "power calculations", "energy transfer in circuits", "electrical safety", "circuit troubleshooting", "electrical conductivity", "circuit analysis", "load calculations", "electrical power (P=VI)", "energy conversion in circuits"],
        tools: ["component placer", "multimeter", "wire connector", "circuit simulator", "battery voltage selector", "resistor value adjuster", "bulb brightness controller", "switch toggle", "wire connection tool", "circuit analyzer", "measurement display (V/I/R)", "circuit testing tool", "component library", "circuit configuration saver", "circuit diagram generator", "troubleshooting assistant", "connection status indicator", "power calculator", "circuit validation checker"],
        difficulty_factors: ["Kirchhoff's laws", "complex circuits", "AC circuits", "circuit analysis methods", "multi-loop circuits", "network theorems", "capacitor/inductor circuits", "transient analysis", "frequency response", "impedance matching", "power factor", "reactive power", "three-phase systems", "circuit optimization", "fault analysis", "circuit design constraints", "component tolerance effects", "temperature effects on resistance", "non-linear components", "electromagnetic interference"]
    },
    
    // MATH SIMULATIONS
    'shape-builder-measurer': {
        topics: ["geometric shapes", "shape construction", "distance measurement", "angle calculation", "area calculation", "perimeter calculation", "coordinate geometry", "shape properties", "geometric transformations", "similar shapes", "congruent shapes", "shape classification", "polygons", "triangles", "quadrilaterals", "circles", "geometric proofs", "measurement units", "scale factor", "symmetry", "transformations", "coordinate system", "shape attributes", "geometric relationships", "mathematical precision"],
        tools: ["shape drawing tools", "measurement ruler", "angle protractor", "coordinate display", "grid system", "shape selector", "angle slider", "clear canvas", "undo/redo", "measurement buttons", "property calculator", "challenge system", "point tracking", "distance calculator", "area calculator", "perimeter calculator", "challenge verification", "precision tools"],
        difficulty_factors: ["complex shape construction", "precision drawing", "multiple measurements", "challenge problems", "coordinate calculations", "angle precision", "area formulas", "perimeter formulas", "scale conversions", "real-world applications", "geometric proofs", "shape transformations", "symmetry analysis", "composite shapes", "challenge validation", "mathematical reasoning"]
    },
    'fraction-pie-visualizer': {
        topics: ["fractions", "pie charts", "fraction representation", "numerator", "denominator", "fraction operations", "addition of fractions", "subtraction of fractions", "multiplication of fractions", "division of fractions", "simplifying fractions", "equivalent fractions", "fraction visualization", "pie chart fractions", "fraction comparison", "decimal conversion", "percentage conversion", "proper fractions", "improper fractions", "mixed numbers", "fraction equivalence", "fraction simplification", "common denominators", "fraction arithmetic", "visual mathematics"],
        tools: ["pie chart canvas", "fraction input controls", "operation buttons", "simplification tool", "decimal converter", "percentage converter", "comparison tool", "visual fraction display", "real-time calculation", "result display", "fraction sliders", "visual feedback", "color-coded segments", "interactive pie charts", "fraction library", "export visualization", "save configuration"],
        difficulty_factors: ["mixed operations", "complex fractions", "improper fractions", "fraction simplification", "equivalent fractions", "comparison tasks", "word problems", "multiple operations", "fraction conversions", "real-world applications", "visual interpretation", "abstract concepts", "mathematical reasoning", "problem solving", "application of rules", "conceptual understanding"]
    },
    'equation-solver-with-steps': {
        topics: ["algebraic equations", "linear equations", "quadratic equations", "equation solving", "step-by-step solutions", "algebraic manipulation", "variables", "coefficients", "distributive property", "combining like terms", "isolating variables", "zero product property", "factoring", "equation types", "solution verification", "algebraic expressions", "equation simplification", "parentheses in equations", "fractional equations", "multi-step equations", "equation solving strategies", "mathematical reasoning", "problem solving", "algebraic methods", "solution checking"],
        tools: ["equation input", "step-by-step display", "example equations", "equation type detection", "solution display", "interactive solving", "algebraic manipulation tools", "simplification tools", "variable isolation", "factoring tool", "solution verification", "real-time calculation", "step navigation", "equation library", "error checking", "visual equation editor", "hint system"],
        difficulty_factors: ["complex equations", "multiple variables", "fractional coefficients", "radical equations", "systems of equations", "word problems", "inequalities", "absolute value equations", "rational equations", "exponential equations", "logarithmic equations", "quadratic formula", "completing the square", "polynomial equations", "real-world applications", "abstract reasoning"]
    },
    'data-set-analyzer': {
        topics: ["data analysis", "descriptive statistics", "mean calculation", "median calculation", "mode calculation", "range calculation", "standard deviation", "variance", "quartiles", "interquartile range", "data visualization", "histograms", "box plots", "line charts", "data distribution", "data interpretation", "statistical measures", "data patterns", "data spread", "central tendency", "data variability", "data outliers", "statistical summaries", "data representation", "data characteristics"],
        tools: ["data input field", "statistical calculator", "chart visualizer", "histogram generator", "box plot creator", "line chart drawer", "data analyzer", "real-time statistics", "quartile calculator", "standard deviation calculator", "variance calculator", "data validator", "chart switcher", "sample data loader", "clear data function", "export results", "data comparison"],
        difficulty_factors: ["large datasets", "outlier detection", "complex distributions", "multiple chart types", "advanced statistics", "data interpretation", "real-world data", "statistical inference", "hypothesis testing", "probability distributions", "confidence intervals", "regression analysis", "correlation analysis", "time series analysis", "multivariate data", "statistical modeling"]
    },
    'unit-circle-simulator': {
        topics: ["unit circle", "trigonometry", "sine function", "cosine function", "tangent function", "radians", "degrees", "coordinate geometry", "special angles", "angle measurement", "circular functions", "trigonometric ratios", "quadrants", "angle rotation", "trigonometric values", "circle geometry", "angular velocity", "periodic functions", "reference angles", "trigonometric identities", "circular motion", "polar coordinates", "angle conversion", "graphical representation", "trigonometric visualization"],
        tools: ["angle slider", "unit circle visualization", "coordinate display", "trigonometric values display", "special angle buttons", "animation controls", "label toggle", "reset button", "real-time calculation", "quadrant display", "radian converter", "point tracking", "visual angle measurement", "function graph", "comparison tools", "export visualization"],
        difficulty_factors: ["radian conversion", "reference angles", "inverse trigonometric functions", "periodicity", "trigonometric identities", "graph transformations", "amplitude changes", "phase shifts", "complex angles", "trigonometric equations", "real-world applications", "wave functions", "circular motion problems", "coordinate transformations", "advanced trigonometry", "calculus applications"]
    },
    'three-d-vector-visualizer': {
        topics: ["vector algebra", "3D coordinates", "vector addition", "vector subtraction", "dot product", "cross product", "vector magnitude", "vector direction", "scalar multiplication", "vector projection", "orthogonal vectors", "vector decomposition", "vector visualization", "3D space", "coordinate systems", "linear algebra", "vector operations", "unit vectors", "vector notation", "position vectors", "direction vectors", "vector components", "vector properties", "vector space", "matrix operations"],
        tools: ["vector input fields", "3D visualization canvas", "rotation controls", "operation buttons", "reset view", "grid toggle", "axes toggle", "real-time calculation", "property display", "magnitude calculation", "angle calculation", "vector labeling", "interactive manipulation", "coordinate system", "visual feedback", "operation history", "comparison tools", "export visualization"],
        difficulty_factors: ["3D visualization", "vector transformations", "advanced operations", "coordinate system conversion", "vector spaces", "linear combinations", "basis vectors", "vector applications", "physics applications", "geometric interpretation", "abstract concepts", "multi-dimensional thinking", "visual-spatial reasoning", "mathematical abstraction", "coordinate transformations", "real-world modeling"]
    },
    'polynomial-grapher': {
        topics: ["polynomial functions", "graphing functions", "coefficients", "degree of polynomial", "cubic functions", "quadratic functions", "linear functions", "function visualization", "coordinate plane", "end behavior", "roots", "y-intercept", "curve sketching", "polynomial properties", "function analysis", "graph transformations", "zeros of polynomial", "turning points", "local maxima/minima", "asymptotes", "domain and range", "function notation", "algebraic expressions", "graph interpretation", "mathematical modeling"],
        tools: ["coefficient input", "function plotter", "graphing canvas", "zoom controls", "reset view", "clear functions", "function list", "analysis panel", "real-time graphing", "function display", "coordinate system", "grid display", "root finder", "end behavior analyzer", "degree calculator", "y-intercept calculator", "export graph"],
        difficulty_factors: ["higher degree polynomials", "complex coefficients", "multiple functions", "function transformations", "root finding", "calculus applications", "optimization problems", "real-world modeling", "parametric functions", "piecewise functions", "rational functions", "exponential functions", "logarithmic functions", "trigonometric functions", "conic sections", "3D graphing"]
    },
    'quadratic-explorer': {
        topics: ["quadratic functions", "parabolas", "vertex form", "standard form", "coefficients", "graphing quadratics", "parabola properties", "vertex calculation", "axis of symmetry", "roots of quadratic", "discriminant", "y-intercept", "parabola direction", "minimum/maximum values", "quadratic formula", "completing the square", "parabola transformations", "quadratic equations", "graph interpretation", "function properties", "real-world applications", "algebraic manipulation", "mathematical modeling", "graph analysis", "coordinate geometry"],
        tools: ["coefficient sliders", "parabola grapher", "vertex calculator", "root finder", "discriminant calculator", "preset equations", "axis display", "real-time graphing", "interactive visualization", "property display", "equation editor", "grid system", "zoom controls", "coordinate system", "analysis panel", "export graph", "comparison mode"],
        difficulty_factors: ["vertex form conversion", "complex coefficients", "real-world applications", "systems of equations", "word problems", "optimization problems", "calculus applications", "conic sections", "parametric equations", "inequality graphing", "transformations", "multiple parabolas", "advanced algebra", "theoretical concepts", "mathematical proofs", "extended analysis"]
    },
    'coordinate-plotter': {
        topics: ["coordinate plane", "cartesian coordinates", "ordered pairs", "quadrants", "x-axis", "y-axis", "origin", "coordinate plotting", "graph points", "coordinate geometry", "distance formula", "midpoint formula", "slope calculation", "coordinate pairs", "grid system", "axis labeling", "coordinate transformations", "point plotting", "graph interpretation", "coordinate system", "mathematical visualization", "geometric representation", "coordinate calculations", "graph analysis", "spatial reasoning"],
        tools: ["coordinate input", "point plotter", "grid toggle", "labels toggle", "connect points", "distance calculator", "midpoint calculator", "slope calculator", "point remover", "clear canvas", "click-to-plot", "coordinate display", "quadrant indicator", "visual feedback", "export coordinates", "save configuration", "load points"],
        difficulty_factors: ["negative coordinates", "multiple quadrants", "complex shapes", "distance calculations", "slope interpretation", "real-world mapping", "coordinate transformations", "reflections", "rotations", "translations", "polygon plotting", "function plotting", "parametric equations", "3D coordinates", "polar coordinates", "advanced geometry"]
    },
    'equation-balancer': {
        topics: ["algebraic equations", "equation solving", "balance method", "inverse operations", "variable isolation", "linear equations", "one-step equations", "two-step equations", "algebraic manipulation", "addition property", "subtraction property", "multiplication property", "division property", "equation properties", "mathematical equality", "solution checking", "equation verification", "step-by-step solving", "algebraic reasoning", "mathematical operations", "balance concept", "equation transformation", "problem solving", "algebraic thinking", "mathematical logic"],
        tools: ["operation buttons", "number input", "step-by-step display", "solution checker", "new problem generator", "equation display", "feedback system", "progress tracking", "visual equation editor", "balance visualization", "operation selector", "value input", "reset equation", "hint system", "solution display", "export solution", "save progress"],
        difficulty_factors: ["multi-step equations", "fractional coefficients", "negative solutions", "decimal coefficients", "equations with parentheses", "variables on both sides", "word problems", "inequalities", "absolute value equations", "rational equations", "systems of equations", "real-world applications", "complex operations", "advanced algebra", "theoretical concepts", "abstract reasoning"]
    },
    'geometric-proof-builder': {
        topics: ["geometric proofs", "theorems", "postulates", "axioms", "proof structure", "deductive reasoning", "geometric properties", "triangle proofs", "congruent triangles", "parallel lines", "angle properties", "Pythagorean theorem", "proof statements", "proof reasons", "two-column proofs", "flow proofs", "paragraph proofs", "coordinate proofs", "geometric constructions", "mathematical reasoning", "logical arguments", "theorem proving", "proof validation", "geometry concepts", "mathematical proofs"],
        tools: ["theorem selector", "diagram canvas", "step-by-step editor", "proof step adder", "statement input", "reason input", "proof validator", "theorem library", "visual diagram", "proof template", "step management", "reason library", "save proof", "export proof", "visual feedback", "construction tools", "angle measurement"],
        difficulty_factors: ["multi-step proofs", "complex theorems", "indirect proofs", "coordinate proofs", "transformational proofs", "advanced geometry", "proof by contradiction", "theorem applications", "real-world proofs", "abstract reasoning", "formal logic", "mathematical rigor", "creative problem solving", "deductive chains", "theorem development", "proof generalization"]
    },
    'calculus-visualizer': {
        topics: ["derivatives", "integrals", "limits", "functions", "tangent lines", "rate of change", "area under curve", "instantaneous rate", "differentiation", "integration", "slope of curve", "calculus concepts", "function analysis", "graphical interpretation", "numerical methods", "symbolic computation", "application of calculus", "fundamental theorem", "optimization", "related rates", "motion analysis", "area calculation", "volume calculation", "mathematical modeling", "advanced calculus"],
        tools: ["function input", "graph visualization", "derivative display", "integral display", "tangent line drawer", "limit analyzer", "zoom controls", "point calculator", "preset functions", "real-time graphing", "numerical analysis", "symbolic calculation", "mode selector", "coordinate display", "analysis panel", "export graph", "save configuration"],
        difficulty_factors: ["complex functions", "multiple variables", "partial derivatives", "differential equations", "integration techniques", "advanced limits", "series convergence", "vector calculus", "multivariable calculus", "real-world applications", "theoretical concepts", "mathematical proofs", "advanced analysis", "optimization problems", "rate problems", "volume calculations"]
    },
    'trigonometry-visualizer': {
        topics: ["trigonometric functions", "unit circle", "sine function", "cosine function", "tangent function", "reciprocal functions", "radian measure", "degree measure", "special angles", "trigonometric ratios", "right triangle trigonometry", "angle measurement", "coordinate geometry", "quadrant analysis", "trigonometric identities", "function periodicity", "graphical representation", "amplitude", "frequency", "phase shift", "inverse trigonometric functions", "trigonometric equations", "applications of trigonometry", "mathematical modeling", "wave functions"],
        tools: ["angle slider", "unit circle display", "function toggles", "value displays", "special angle buttons", "degree/radian toggle", "visual components", "coordinate display", "real-time calculation", "graph visualization", "reciprocal functions", "quadrant analysis", "export visualization", "save configuration", "animation controls", "comparison tools"],
        difficulty_factors: ["radian conversion", "inverse functions", "trigonometric equations", "identities proofs", "phase shifts", "amplitude changes", "period calculation", "complex angles", "applications in physics", "wave analysis", "harmonic motion", "polar coordinates", "complex numbers", "Fourier series", "advanced identities", "calculus applications"]
    },
    'probability-simulator': {
        topics: ["probability concepts", "experimental probability", "theoretical probability", "random experiments", "outcomes", "sample space", "law of large numbers", "frequency distribution", "probability simulations", "coin flips", "dice rolls", "card draws", "spinner experiments", "probability calculations", "statistical analysis", "probability distributions", "binomial probability", "conditional probability", "independent events", "dependent events", "probability rules", "expected value", "probability modeling", "real-world applications", "data analysis"],
        tools: ["experiment selector", "trial controller", "simulation runner", "results visualizer", "probability calculator", "distribution display", "multiple run feature", "reset simulator", "statistics panel", "visual outcomes", "real-time updates", "experimental vs theoretical", "export results", "save simulation", "comparison mode", "custom probability"],
        difficulty_factors: ["complex probability rules", "conditional probability", "Bayesian probability", "multiple events", "probability trees", "combinations and permutations", "binomial distributions", "normal distributions", "statistical inference", "hypothesis testing", "real-world modeling", "advanced statistics", "probability paradoxes", "theoretical frameworks", "mathematical proofs", "research applications"]
    },
    'interactive-graph-maker': {
        topics: ["data visualization", "graph types", "bar charts", "line graphs", "pie charts", "scatter plots", "data representation", "graph interpretation", "axes labeling", "scales", "data analysis", "graph construction", "visual communication", "data patterns", "graph properties", "chart elements", "data presentation", "graphical analysis", "coordinate systems", "visual interpretation", "data comparison", "graph design", "mathematical visualization", "statistical graphs", "real-world data"],
        tools: ["chart type selector", "data point editor", "color picker", "title input", "axis label input", "graph canvas", "data point adder", "data point remover", "random data generator", "export graph", "clear data", "real-time preview", "customization tools", "save configuration", "graph layout", "visual feedback"],
        difficulty_factors: ["multiple data sets", "complex graphs", "advanced visualizations", "data interpretation", "graph transformations", "real-world data", "statistical analysis", "correlation analysis", "trend lines", "data smoothing", "interactive features", "export formatting", "professional design", "advanced analysis", "presentation quality", "analytical skills"]
    },
    'ratio-visualizer': {
        topics: ["ratios", "proportions", "ratio simplification", "ratio comparison", "part-to-part ratio", "part-to-whole ratio", "equivalent ratios", "ratio models", "bar models", "grid models", "ratio scaling", "ratio properties", "real-world ratios", "fractional ratios", "ratio visualization", "ratio calculation", "ratio interpretation", "ratio applications", "mathematical comparison", "proportional reasoning", "ratio analysis", "ratio problems", "ratio concepts", "ratio manipulation", "ratio relationships"],
        tools: ["ratio input fields", "bar model visualizer", "grid model display", "ratio simplifier", "ratio scaler", "example scenarios", "ratio properties calculator", "total parts calculator", "fraction converter", "decimal converter", "visual feedback", "reset button", "example selector", "real-time visualization", "export visualization", "save configuration"],
        difficulty_factors: ["complex ratios", "multiple part ratios", "proportional reasoning", "ratio word problems", "scale factors", "rate problems", "mixture problems", "proportional relationships", "real-world applications", "advanced ratio concepts", "ratio in geometry", "ratio in algebra", "ratio transformations", "ratio proofs", "theoretical concepts", "advanced problems"]
    },
    'symmetry-explorer': {
        topics: ["symmetry", "reflection symmetry", "rotational symmetry", "line of symmetry", "symmetry axes", "symmetric shapes", "geometric symmetry", "transformations", "mirror images", "symmetry in nature", "symmetry patterns", "symmetry detection", "symmetry properties", "shape analysis", "symmetry operations", "symmetry types", "geometric properties", "pattern recognition", "visual symmetry", "mathematical beauty", "symmetry applications", "art and symmetry", "symmetry in architecture", "symmetry concepts", "symmetry exploration"],
        tools: ["shape selector", "symmetry canvas", "color picker", "mirror tools", "rotation tools", "clear canvas", "symmetry line display", "grid system", "interactive drawing", "shape library", "symmetry type toggles", "visual feedback", "export symmetry", "save configuration", "real-time manipulation", "undo/redo"],
        difficulty_factors: ["multiple symmetry axes", "complex shapes", "tessellations", "fractal symmetry", "symmetry groups", "transformation matrices", "advanced geometry", "symmetry in physics", "crystal symmetry", "group theory", "theoretical concepts", "artistic applications", "pattern design", "symmetry proofs", "advanced transformations", "3D symmetry"]
    }
};

const PHYSICS_SIMULATIONS = [
  'motion-classifier-sim',
  'measurement-skills-sim',
  'motion-timer-sim',
  'projectile-motion-simulator',
  'shadow-formation-simulator',
  'weather-system-model',
  'sound-wave-generator',
  'heat-flow-simulator',
  'light-path-visualizer',
  'newtons-laws-demonstrator',
  'magnetic-field-visualizer',
  'gas-properties-simulator',
  'electrolysis-simulator',
  'force-visualizer',
  'gravity-simulator',
  'electric-field-mapper',
  'ray-diagram-builder',
  'energy-transformation-visualizer',
  'advanced-circuit-simulator'
];

const MATH_SIMULATIONS = [
  'shape-builder-measurer',
  'fraction-pie-visualizer',
  'equation-solver-with-steps',
  'data-set-analyzer',
  'unit-circle-simulator',
  'three-d-vector-visualizer',
  'polynomial-grapher',
  'quadratic-explorer',
  'coordinate-plotter',
  'equation-balancer',
  'geometric-proof-builder',
  'calculus-visualizer',
  'trigonometry-visualizer',
  'probability-simulator',
  'interactive-graph-maker',
  'ratio-visualizer',
  'symmetry-explorer'
];

const CHEMISTRY_SIMULATIONS = [
  // Chemistry simulations will be added in next phase
];

// ============================================================================
// CHALLENGE SETTINGS
// ============================================================================

const CHALLENGE_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
};

const CHALLENGE_TYPES = {
  MCQ: 'mcq',
  NUMERICAL: 'numerical',
  SHORT_ANSWER: 'short_answer'
};

const CHALLENGE_LIMITS = {
  DAILY_LIMIT: parseInt(process.env.CHALLENGE_DAILY_LIMIT) || 10,
  PER_SIMULATION_LIMIT: parseInt(process.env.CHALLENGE_PER_SIMULATION_LIMIT) || 3,
  COOLDOWN_MS: parseInt(process.env.CHALLENGE_COOLDOWN_MS) || 1800000, // 30 minutes
  QUESTIONS_PER_CHALLENGE: 5,
  MIN_PASSING_SCORE: 70
};

const CHALLENGE_POINTS = {
  ANSWER_CORRECT: 70,
  REASONING_MAX: 30,
  TOTAL_PER_QUESTION: 100
};

// ============================================================================
// PERFORMANCE INDEX (SPI) CONFIGURATION
// ============================================================================

const SPI_WEIGHTS = {
  CHALLENGE_SCORE: parseFloat(process.env.SPI_CHALLENGE_WEIGHT) || 0.60,
  COMPETENCY_SCORE: parseFloat(process.env.SPI_COMPETENCY_WEIGHT) || 0.25,
  CONSISTENCY_SCORE: parseFloat(process.env.SPI_CONSISTENCY_WEIGHT) || 0.15
};

const SPI_GRADES = {
  'A+': { min: 90, max: 100 },
  'A': { min: 80, max: 89 },
  'B': { min: 70, max: 79 },
  'C': { min: 60, max: 69 },
  'D': { min: 50, max: 59 },
  'F': { min: 0, max: 49 }
};

const MASTERY_LEVELS = {
  BEGINNER: 'Beginner',
  DEVELOPING: 'Developing',
  PROFICIENT: 'Proficient',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert'
};

// ============================================================================
// ALGORITHM PARAMETERS
// ============================================================================

const KALMAN_FILTER = {
  INITIAL_ABILITY: 50,
  INITIAL_UNCERTAINTY: 100,
  PROCESS_NOISE: parseInt(process.env.KALMAN_PROCESS_NOISE) || 5,
  MEASUREMENT_NOISE: parseInt(process.env.KALMAN_MEASUREMENT_NOISE) || 15
};

const PID_CONTROLLER = {
  KP: parseFloat(process.env.PID_KP) || 0.5,
  KI: parseFloat(process.env.PID_KI) || 0.1,
  KD: parseFloat(process.env.PID_KD) || 0.2,
  INTEGRAL_MAX: 50,
  INTEGRAL_MIN: -50
};

const META_LEARNING = {
  LEARNING_RATE: parseFloat(process.env.META_LEARNING_RATE) || 0.05,
  INITIAL_WEIGHTS: {
    formulaImportance: 0.30,
    calculationImportance: 0.25,
    explanationImportance: 0.25,
    unitsImportance: 0.20
  }
};

// ============================================================================
// CLASS & SECTION
// ============================================================================

const CLASS_LEVELS = [6, 7, 8, 9, 10, 11, 12];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const SUBJECTS = [
  'Physics',
  'Chemistry',
  'Mathematics',
  'Biology',
  'Computer Science',
  'English',
  'Hindi',
  'Social Science'
];

// ============================================================================
// FILE UPLOAD
// ============================================================================

const FILE_UPLOAD = {
  MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10 MB
  ALLOWED_TYPES: (process.env.ALLOWED_FILE_TYPES || 'csv,jpg,jpeg,png,pdf,doc,docx').split(','),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/',
  MIME_TYPES: {
    'csv': 'text/csv',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
};

// ============================================================================
// SECURITY
// ============================================================================

const SECURITY = {
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  ACCOUNT_LOCKOUT: {
    MAX_ATTEMPTS: parseInt(process.env.ACCOUNT_LOCKOUT_ATTEMPTS) || 5,
    DURATION_MS: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION) || 1800000 // 30 minutes
  },
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
  },
  SESSION: {
    MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 86400000 // 24 hours
  }
};

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  LOGIN: {
    WINDOW_MS: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 900000,
    MAX_REQUESTS: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS) || 5
  },
  CHALLENGE: {
    WINDOW_MS: parseInt(process.env.CHALLENGE_RATE_LIMIT_WINDOW_MS) || 60000,
    MAX_REQUESTS: parseInt(process.env.CHALLENGE_RATE_LIMIT_MAX_REQUESTS) || 3
  }
};

// ============================================================================
// TIME CONSTANTS
// ============================================================================

const TIME = {
  ONE_SECOND: 1000,
  ONE_MINUTE: 60000,
  FIVE_MINUTES: 300000,
  FIFTEEN_MINUTES: 900000,
  THIRTY_MINUTES: 1800000,
  ONE_HOUR: 3600000,
  ONE_DAY: 86400000,
  ONE_WEEK: 604800000
};

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// ============================================================================
// ERROR MESSAGES
// ============================================================================

const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to access this resource',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  ACCOUNT_LOCKED: 'Account temporarily locked due to multiple failed login attempts',
  ACCOUNT_NOT_VERIFIED: 'Please verify your email address',
  
  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this email already exists',
  
  // Student
  STUDENT_NOT_FOUND: 'Student not found',
  STUDENT_ID_EXISTS: 'Student ID already exists',
  
  // Teacher
  TEACHER_NOT_FOUND: 'Teacher not found',
  TEACHER_NOT_APPROVED: 'Teacher account pending approval',
  
  // Challenge
  CHALLENGE_NOT_FOUND: 'Challenge not found',
  CHALLENGE_LIMIT_EXCEEDED: 'Daily challenge limit exceeded',
  CHALLENGE_COOLDOWN: 'Please wait before generating another challenge',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PASSWORD: 'Password does not meet requirements',
  
  // Server
  SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database error',
  AI_SERVICE_ERROR: 'AI service temporarily unavailable'
};

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

const SUCCESS_MESSAGES = {
  SIGNUP_SUCCESS: 'Account created successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  EMAIL_SENT: 'Email sent successfully',
  PASSWORD_RESET: 'Password reset successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  CHALLENGE_GENERATED: 'Challenge generated successfully',
  CHALLENGE_SUBMITTED: 'Challenge submitted successfully'
};

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  STUDENT_ID: /^STU-\d{5}$/,
  TEACHER_ID: /^TCH-\d{5}$/,
  SCHOOL_ID: /^SCH-\d{4}-\d{5}$/,
  CHALLENGE_ID: /^CHL-\d+$/
};

// ============================================================================
// PAGINATION
// ============================================================================

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// ============================================================================
// LOGGING LEVELS
// ============================================================================

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// ============================================================================
// REPORT TYPES
// ============================================================================

const REPORT_TYPES = {
  STUDENT_NEP: 'student_nep',
  INSTITUTIONAL: 'institutional',
  CLASS_PERFORMANCE: 'class_performance',
  TEACHER_ANALYTICS: 'teacher_analytics',
  PARENT_SUMMARY: 'parent_summary'
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // User
  USER_ROLES,
  ROLE_HIERARCHY,
  USER_STATUS,
  
  // NEP
  NEP_COMPETENCIES,
  COMPETENCY_LABELS,
  
  // Simulations
  SIMULATION_TYPES,
  PHYSICS_SIMULATIONS,
  MATH_SIMULATIONS,
  CHEMISTRY_SIMULATIONS,
  SIMULATION_COUNT,
  SIMULATION_METADATA,
  
  // Challenges
  CHALLENGE_DIFFICULTY,
  CHALLENGE_TYPES,
  CHALLENGE_LIMITS,
  CHALLENGE_POINTS,
  
  // Performance
  SPI_WEIGHTS,
  SPI_GRADES,
  MASTERY_LEVELS,
  
  // Algorithms
  KALMAN_FILTER,
  PID_CONTROLLER,
  META_LEARNING,
  
  // Academic
  CLASS_LEVELS,
  SECTIONS,
  SUBJECTS,
  
  // Files
  FILE_UPLOAD,
  
  // Security
  SECURITY,
  RATE_LIMITS,
  
  // Time
  TIME,
  
  // HTTP
  HTTP_STATUS,
  
  // Messages
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  
  // Patterns
  REGEX,
  
  // Pagination
  PAGINATION,
  
  // Logging
  LOG_LEVELS,
  
  // Reports
  REPORT_TYPES
};