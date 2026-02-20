// routes/index.js
/**
 * ROUTES INDEX - UPDATED WITH NEP REPORT SYSTEM
 * Central routing configuration with ledger-anchored NEP reports
 * 
 * @module routes
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes         = require('./auth.routes');
const adminRoutes        = require('./admin.routes');
const teacherRoutes      = require('./teacher.routes');
const studentRoutes      = require('./student.routes');
const parentRoutes       = require('./parent.routes');
const challengeRoutes    = require('./challenge.routes');
const analyticsRoutes    = require('./analytics.routes');
const healthRoutes       = require('./health.routes');
const reportRoutes       = require('./report.routes');
const subscriptionRoutes = require('./subscription.routes');
const researchRoutes     = require('./research.routes');
const kpiRoutes          = require('./kpi.routes');
const developerRoutes    = require('./developer.routes');

// ============================================================================
// ROUTE MOUNTING
// ============================================================================

/**
 * @route   /api/auth/*
 * @desc    Authentication routes
 */
router.use('/auth', authRoutes);

/**
 * @route   /api/admin/*
 * @desc    School admin routes
 */
router.use('/admin', adminRoutes);

/**
 * @route   /api/teacher/*
 * @desc    Teacher routes
 */
router.use('/teacher', teacherRoutes);

/**
 * @route   /api/student/*
 * @desc    Student routes
 */
router.use('/student', studentRoutes);

/**
 * @route   /api/parent/*
 * @desc    Parent routes
 */
router.use('/parent', parentRoutes);

/**
 * @route   /api/challenges/*
 * @desc    Challenge management routes
 */
router.use('/challenges', challengeRoutes);

/**
 * @route   /api/analytics/*
 * @desc    Analytics and reporting routes
 */
router.use('/analytics', analyticsRoutes);

/**
 * @route   /api/health/*
 * @desc    Health check routes
 */
router.use('/health', healthRoutes);

/**
 * @route   /api/reports/*
 * @desc    NEP Report routes (LEDGER-ANCHORED)
 */
router.use('/reports', reportRoutes);

/**
 * @route   /api/subscription/*
 * @desc    Subscription management — plan status, upgrade requests, usage
 */
router.use('/subscription', subscriptionRoutes);

/**
 * @route   /api/research/*
 * @desc    External research API — API key auth (no session JWT)
 * @access  Enterprise / B2B (rsk_ keys)
 */
router.use('/research', researchRoutes);

/**
 * @route   /api/kpi/*
 * @desc    Platform KPIs — superadmin only (operations team)
 */
router.use('/kpi', kpiRoutes);

/**
 * @route   /api/developer/*
 * @desc    Developer portal — API key request form (public, no auth)
 */
router.use('/developer', developerRoutes);

// ============================================================================
// API ROOT - UPDATED WITH NEW FEATURES
// ============================================================================

/**
 * @route   GET /api
 * @desc    API root - returns API information
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NEP Workbench API v2.0 with Ledger-Anchored Reports',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: {
      ledgerAnchoredReports: true,
      aiNarration: true,
      competencyFramework: true,
      qrVerification: true,
      batchOperations: true,
      institutionalAnalytics: true
    },
    endpoints: {
      auth:         '/api/auth',
      admin:        '/api/admin',
      teacher:      '/api/teacher',
      student:      '/api/student',
      parent:       '/api/parent',
      challenges:   '/api/challenges',
      analytics:    '/api/analytics',
      health:       '/api/health',
      reports:      '/api/reports',
      subscription: '/api/subscription',
      research:     '/api/research  (API-key auth)',
      kpi:          '/api/kpi  (superadmin only)',
      developer:    '/api/developer  (public)',
    },
    reportEndpoints: {
      generate: 'POST /api/reports/nep/generate',
      verify: 'GET /api/reports/nep/verify/:reportId',
      download: 'GET /api/reports/nep/:reportId/download',
      qrCode: 'GET /api/reports/nep/:reportId/qrcode',
      share: 'POST /api/reports/nep/:reportId/share',
      batch: 'POST /api/reports/batch/*',
      stats: 'GET /api/reports/stats/*'
    },
    documentation: {
      swagger: '/api-docs',
      postman: '/api/postman',
      version: '2.0.0'
    },
    status: 'operational',
    compliance: 'NEP 2020 Standard',
    lastUpdated: '2024-01-20',
    uptime: process.uptime()
  });
});

/**
 * @route   GET /api/postman
 * @desc    Postman collection endpoint
 * @access  Public
 */
router.get('/postman', (req, res) => {
  res.json({
    success: true,
    message: 'Postman collection available',
    collection: {
      url: `${req.protocol}://${req.get('host')}/api-docs.json`,
      import: 'Import the Swagger/OpenAPI spec into Postman',
      environment: 'Use NODE_ENV=development for testing'
    },
    examples: {
      generateReport: {
        method: 'POST',
        url: '/api/reports/nep/generate',
        headers: {
          'Authorization': 'Bearer {token}',
          'Content-Type': 'application/json'
        },
        body: {
          studentId: 'STUDENT-001',
          reportType: 'comprehensive'
        }
      },
      verifyReport: {
        method: 'GET',
        url: '/api/reports/nep/verify/REPORT-ABC123',
        note: 'Public endpoint - no auth required'
      }
    }
  });
});

/**
 * @route   GET /api/features
 * @desc    List all API features
 * @access  Public
 */
router.get('/features', (req, res) => {
  res.json({
    success: true,
    features: [
      {
        name: 'Ledger-Anchored NEP Reports',
        description: 'Immutable competency reports with cryptographic verification',
        version: '2.0',
        endpoints: ['/api/reports/nep/*'],
        benefits: [
          'Tamper-proof report storage',
          'QR code verification',
          'AI-powered narration',
          'Batch generation'
        ]
      },
      {
        name: 'Competency Assessment',
        description: 'NEP 2020 competency framework integration',
        version: '1.0',
        endpoints: ['/api/analytics/*', '/api/challenges/*'],
        benefits: [
          '12 core NEP competencies',
          'Progress tracking',
          'Strength/weakness identification'
        ]
      },
      {
        name: 'Role-Based Access',
        description: 'Multi-role authentication system',
        version: '1.0',
        endpoints: ['/api/auth/*'],
        benefits: [
          'Students, Teachers, Parents, Admins',
          'JWT-based authentication',
          'Permission management'
        ]
      },
      {
        name: 'Institutional Analytics',
        description: 'School and class-level analytics',
        version: '1.0',
        endpoints: ['/api/analytics/institutional/*'],
        benefits: [
          'Performance dashboards',
          'Comparative analysis',
          'Trend identification'
        ]
      }
    ]
  });
});

// ============================================================================
// API STATUS AND HEALTH
// ============================================================================

/**
 * @route   GET /api/ping
 * @desc    Simple ping endpoint for load balancers
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

/**
 * @route   GET /api/version
 * @desc    Get API version information
 * @access  Public
 */
router.get('/version', (req, res) => {
  res.json({
    success: true,
    version: '2.0.0',
    name: 'NEP Workbench API',
    description: 'Educational AI Platform with Ledger-Anchored Reports',
    build: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: {
      reports: 'v2.0 (ledger-anchored)',
      auth: 'v1.0',
      analytics: 'v1.0',
      challenges: 'v1.0'
    }
  });
});

// ============================================================================
// SERVICE DISCOVERY
// ============================================================================

/**
 * @route   GET /api/services
 * @desc    List all available services
 * @access  Public
 */
router.get('/services', (req, res) => {
  res.json({
    success: true,
    services: [
      {
        name: 'Authentication Service',
        status: 'active',
        endpoint: '/api/auth',
        health: '/api/health/auth'
      },
      {
        name: 'Report Generation Service',
        status: 'active',
        endpoint: '/api/reports',
        health: '/api/reports/health',
        features: ['generation', 'verification', 'sharing', 'batch']
      },
      {
        name: 'Analytics Service',
        status: 'active',
        endpoint: '/api/analytics',
        health: '/api/health/analytics'
      },
      {
        name: 'Challenge Service',
        status: 'active',
        endpoint: '/api/challenges',
        health: '/api/health/challenges'
      },
      {
        name: 'User Management Service',
        status: 'active',
        endpoint: '/api/admin, /api/teacher, /api/student, /api/parent',
        health: '/api/health/users'
      }
    ],
    externalServices: [
      {
        name: 'AI Narration Service',
        status: process.env.MISTRAL_API_KEY ? 'connected' : 'disabled',
        provider: 'Mistral AI',
        usedBy: 'Report Generation'
      },
      {
        name: 'Email Service',
        status: process.env.SENDGRID_API_KEY ? 'connected' : 'disabled',
        provider: 'SendGrid',
        usedBy: 'Report Sharing'
      },
      {
        name: 'QR Code Service',
        status: 'active',
        provider: 'qrcode',
        usedBy: 'Report Verification'
      }
    ]
  });
});

// ============================================================================
// MIGRATION AND UPGRADE INFO
// ============================================================================

/**
 * @route   GET /api/migration
 * @desc    Migration information for v1 to v2
 * @access  Public
 */
router.get('/migration', (req, res) => {
  res.json({
    success: true,
    currentVersion: '2.0.0',
    previousVersion: '1.0.0',
    migrationNotes: {
      title: 'Migration from v1 to v2',
      description: 'Added ledger-anchored NEP report system',
      breakingChanges: [
        'New report data structure',
        'Added verification endpoints',
        'Changed analytics calculation methods'
      ],
      newFeatures: [
        'Ledger-anchored report generation',
        'QR code verification',
        'Batch report operations',
        'Enhanced analytics with CPI',
        'AI-powered narration'
      ],
      deprecated: [
        'Old report format (migrated automatically)',
        'Basic analytics endpoints (use enhanced ones)'
      ],
      migrationPath: 'Automatic - existing reports remain accessible'
    },
    support: {
      documentation: '/api-docs',
      contact: 'support@tryspyral.com'
    }
  });
});

// ============================================================================
// ROUTE DISCOVERY
// ============================================================================

/**
 * @route   GET /api/routes
 * @desc    List all available routes
 * @access  Public
 */
router.get('/routes', (req, res) => {
  const routes = [];
  
  // Collect all routes
  router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase());
      routes.push({
        path: middleware.route.path,
        methods,
        description: getRouteDescription(middleware.route.path)
      });
    }
  });
  
  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
    groupedRoutes: {
      authentication: routes.filter(r => r.path.includes('/auth')),
      reports: routes.filter(r => r.path.includes('/reports')),
      analytics: routes.filter(r => r.path.includes('/analytics')),
      users: routes.filter(r => r.path.includes('/admin') || r.path.includes('/teacher') || 
                                r.path.includes('/student') || r.path.includes('/parent')),
      challenges: routes.filter(r => r.path.includes('/challenges')),
      health: routes.filter(r => r.path.includes('/health'))
    }
  });
});

// Helper function to get route descriptions
function getRouteDescription(path) {
  const descriptions = {
    '/api': 'API root with information',
    '/api/auth': 'Authentication endpoints',
    '/api/reports': 'NEP Report endpoints (LEDGER-ANCHORED)',
    '/api/analytics': 'Analytics and insights',
    '/api/challenges': 'Challenge management',
    '/api/admin': 'School administration',
    '/api/teacher': 'Teacher management',
    '/api/student': 'Student management',
    '/api/parent': 'Parent access',
    '/api/health': 'Health checks',
    '/api/ping': 'Simple ping endpoint',
    '/api/version': 'Version information',
    '/api/features': 'Feature list',
    '/api/services': 'Service discovery',
    '/api/migration': 'Migration information',
    '/api/routes': 'Route discovery'
  };
  
  return descriptions[path] || 'Endpoint available';
}

// ============================================================================
// 404 HANDLER (Must be last)
// ============================================================================

/**
 * @route   * (all undefined routes)
 * @desc    404 Not Found handler with suggestions
 * @access  Public
 */
router.use('*', (req, res) => {
  const requestedPath = req.originalUrl;
  const basePath = requestedPath.replace('/api', '');
  
  // Try to suggest correct route
  let suggestion = null;
  if (requestedPath.includes('report')) {
    suggestion = '/api/reports';
  } else if (requestedPath.includes('auth')) {
    suggestion = '/api/auth';
  } else if (requestedPath.includes('analytics')) {
    suggestion = '/api/analytics';
  }
  
  res.status(404).json({
    success: false,
    message: `Route ${requestedPath} not found`,
    error: 'Not Found',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api',
      '/api/auth',
      '/api/admin',
      '/api/teacher',
      '/api/student',
      '/api/parent',
      '/api/challenges',
      '/api/analytics',
      '/api/reports',
      '/api/subscription',
      '/api/research',
      '/api/health',
      '/api/developer',
    ],
    suggestion: suggestion ? `Try: ${suggestion}` : 'Check /api/routes for all available routes',
    documentation: '/api-docs',
    reportFeatures: {
      generate: 'POST /api/reports/nep/generate',
      verify: 'GET /api/reports/nep/verify/{id}',
      qrcode: 'GET /api/reports/nep/{id}/qrcode'
    }
  });
});

module.exports = router;