/**
 * CLEAN URL PAGE ROUTES
 * Maps human-readable / ID-style paths to actual HTML files.
 * HTML filenames are never exposed in the browser address bar.
 *
 * Pattern:  GET /clean-path  →  sendFile(actual-html)
 * Mount:    app.use(require('./routes/pages.routes'))   ← one line in app.js
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');

const NEP      = path.join(__dirname, '../../frontend/nep-workbench');
const FRONTEND = path.join(__dirname, '../../frontend');

/** Shorthand: return a handler that sends an HTML file relative to NEP root */
const page = (rel) => (_req, res) => res.sendFile(path.join(NEP, rel));

// ============================================================================
// ROOT / LANDING PAGE
// ============================================================================
router.get('/', (_req, res) => res.sendFile(path.join(FRONTEND, 'home.html')));

// ============================================================================
// AUTH
// ============================================================================
router.get('/login',          page('login.html'));
router.get('/verify-email/:token', page('verify-email.html'));
router.get('/reset-password',        page('password-reset.html'));
router.get('/reset-password/:token', page('password-reset.html'));
router.get('/contact',        page('contact.html'));

// ============================================================================
// DASHBOARDS
// ============================================================================
router.get('/dashboard/admin',   page('dashboards/admin/Admindashboard.html'));
router.get('/dashboard/teacher', page('dashboards/teacher/Teacherdashboard.html'));
router.get('/dashboard/student', page('dashboards/student/StudentWorkbench.html'));
router.get('/dashboard/parent',  page('dashboards/parent/Parentdashboard.html'));

// Short aliases (e.g. /admin  /teacher  /student  /parent)
router.get('/admin',   page('dashboards/admin/Admindashboard.html'));
router.get('/teacher', page('dashboards/teacher/Teacherdashboard.html'));
router.get('/student', page('dashboards/student/StudentWorkbench.html'));
router.get('/parent',  page('dashboards/parent/Parentdashboard.html'));

// ============================================================================
// STUDENT TOOLS
// ============================================================================
router.get('/challenge',   page('dashboards/student/challenge.html'));
router.get('/math-lab',    page('dashboards/student/Mathscratchpad.html'));
router.get('/evaluation',  page('dashboards/student/evaluation-view/Evaluation.html'));
router.get('/inquiry-lab', page('dashboards/student/inquiry-hypothesis-lab/Inquiryhypothesislab.html'));
router.get('/practice',    page('dashboards/student/practice-zone/PracticeZone.html'));
router.get('/projects',    page('dashboards/student/project-builder/ProjectBuilder.html'));
router.get('/journal',     page('dashboards/student/reflection-journal/Reflectionjournal.html'));
router.get('/vocational',  page('dashboards/student/vocational-skills-studio/VocationalSkillsStudio.html'));

// ============================================================================
// CLASS TOOLS (teacher-facing, auth enforced client-side)
// ============================================================================
const TOOLS = path.join(NEP, 'dashboards/teacher/tools');
router.get('/class-tools/notes-builder',     (_req, res) => res.sendFile(path.join(TOOLS, 'notes-builder.html')));
router.get('/class-tools/question-builder',  (_req, res) => res.sendFile(path.join(TOOLS, 'question-builder.html')));
router.get('/class-tools/simulator-builder', (_req, res) => res.sendFile(path.join(TOOLS, 'simulator-builder.html')));

// ============================================================================
// INFO / MARKETING PAGES
// ============================================================================
router.get('/workbench',  page('index.html'));
router.get('/nep',        page('nep.html'));
router.get('/spyral',     page('spyralai.html'));
router.get('/developer',  (_req, res) => res.sendFile(path.join(FRONTEND, 'developer.html')));
router.get('/terms',      page('terms.html'));
router.get('/feedback',   page('feedback.html'));
router.get('/ops',        (_req, res) => res.sendFile(path.join(FRONTEND, 'ops-dashboard.html')));

// ============================================================================
// MATH SIMULATIONS  →  /sim/math/:tool
// ============================================================================
const MATH_SIMS = {
  'vector':         '3DVectorVisualizer.html',
  'calculus':       'CalculusVisualizer.html',
  'coordinates':    'CoordinatePlotter.html',
  'data-analyzer':  'Datasetanalyzer.html',
  'equation-bal':   'Equationbalancer.html',
  'equation-sol':   'Equationsolver.html',
  'fraction-pie':   'Fractionpievisualizer.html',
  'geometry-proof': 'Geometricproofbuilder.html',
  'graph-maker':    'InteractiveGraphMaker.html',
  'polynomial':     'polynomialgrapher.html',
  'probability':    'ProbabilitySimulator.html',
  'quadratic':      'QuadraticExplorer.html',
  'ratio':          'RatioVisualizer.html',
  'shapes':         'shapebuilder.html',
  'symmetry':       'SymmetryExplorer.html',
  'trigonometry':   'TrigonometryVisualizer.html',
  'unit-circle':    'Unitcirclesimulator.html',
};

router.get('/sim/math/:tool', (req, res) => {
  const file = MATH_SIMS[req.params.tool];
  if (!file) return res.status(404).send('Simulation not found');
  res.sendFile(path.join(NEP, 'dashboards/student/sims/math', file));
});

// ============================================================================
// PHYSICS SIMULATIONS  →  /sim/physics/:tool
// ============================================================================
const PHYSICS_SIMS = {
  'electric-field':    'ElectricFieldMapper.html',
  'electrolysis':      'Electrolysissimulator.html',
  'energy-transform':  'EnergyTransformationVisualizer.html',
  'force':             'Forcevisualizer.html',
  'gas-properties':    'Gaspropertiessimulator.html',
  'gravity':           'GravitySimulator.html',
  'heat-flow':         'HeatFlowSimulator.html',
  'light-path':        'Lightpathvisualizer.html',
  'magnetic-field':    'Magneticfieldvisualizer.html',
  'motion-classifier': 'MOTIONCLASSIFIERSIM.html',
  'motion-timer':      'Motiontimersim.html',
  'newtons-laws':      'Newtonslawsdemonstrator.html',
  'projectile':        'Projectilemotionsimulator.html',
  'ray-diagram':       'Raydiagrambuilder.html',
  'shadow-formation':  'ShadowFormationSimulator.html',
  'circuit-builder':   'Simplecircuitbuilder.html',
  'sound-wave':        'SoundWaveGenerator.html',
  'weather':           'WeatherSystemModel.html',
};

router.get('/sim/physics/:tool', (req, res) => {
  const file = PHYSICS_SIMS[req.params.tool];
  if (!file) return res.status(404).send('Simulation not found');
  res.sendFile(path.join(NEP, 'dashboards/student/sims/physics', file));
});

module.exports = router;
