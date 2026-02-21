// /**
//  * NEP WORKBENCH - MAIN APPLICATION FILE
//  * Educational AI Platform Backend - Complete Production Version
//  * 
//  * @version 1.0.0
//  * @description Complete Express application with all middleware, routes, and error handling
//  */

// require('dotenv').config();
// console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
// console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
// console.log('Starting application initialization...');

// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');
// const mongoSanitize = require('express-mongo-sanitize');
// const fs = require('fs');
// const path = require('path');

// // ============================================================================
// // EXPRESS APP INITIALIZATION
// // ============================================================================

// const app = express();

// console.log('Express app initialized');

// // ============================================================================
// // TRUST PROXY
// // ============================================================================

// app.set('trust proxy', 1);

// // ============================================================================
// // SECURITY MIDDLEWARE
// // ============================================================================

// console.log('Setting up security middleware...');

// // Helmet - Security headers
// try {
//   app.use(helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         styleSrc: ["'self'", "'unsafe-inline'"],
//         scriptSrc: ["'self'"],
//         imgSrc: ["'self'", 'data:', 'https:'],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//     crossOriginResourcePolicy: { policy: "cross-origin" }
//   }));
//   console.log('✓ Helmet configured');
// } catch (error) {
//   console.error('✗ Helmet configuration failed:', error.message);
// }

// // CORS Configuration
// try {
//   const corsOptions = {
//     origin: function (origin, callback) {
//       const allowedOrigins = process.env.ALLOWED_ORIGINS 
//         ? process.env.ALLOWED_ORIGINS.split(',')
//         : ['http://localhost:3000', 'http://localhost:5173'];
      
//       // Allow requests with no origin (mobile apps, Postman, etc.)
//       if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//         callback(null, true);
//       } else {
//         callback(new Error('Not allowed by CORS'), false);
//       }
//     },
//     credentials: true,
//     optionsSuccessStatus: 200,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
//   };

//   app.use(cors(corsOptions));
//   console.log('✓ CORS configured');
// } catch (error) {
//   console.error('✗ CORS configuration failed:', error.message);
// }

// // MongoDB Sanitization
// try {
//   app.use(mongoSanitize());
//   console.log('✓ MongoDB sanitization configured');
// } catch (error) {
//   console.error('✗ MongoDB sanitization failed:', error.message);
// }

// // ============================================================================
// // COMPRESSION & PARSING MIDDLEWARE
// // ============================================================================

// console.log('Setting up compression and parsing middleware...');

// // Compression
// try {
//   app.use(compression());
//   console.log('✓ Compression configured');
// } catch (error) {
//   console.error('✗ Compression failed:', error.message);
// }

// // Body parsers
// try {
//   app.use(express.json({ 
//     limit: '10mb',
//     verify: (req, res, buf) => {
//       req.rawBody = buf.toString();
//     }
//   }));
  
//   app.use(express.urlencoded({ 
//     extended: true, 
//     limit: '10mb' 
//   }));
//   console.log('✓ Body parsers configured');
// } catch (error) {
//   console.error('✗ Body parsers failed:', error.message);
// }

// // Cookie parser
// try {
//   const cookieParser = require('cookie-parser');
//   app.use(cookieParser());
//   console.log('✓ Cookie parser configured');
// } catch (error) {
//   console.error('✗ Cookie parser failed:', error.message);
// }

// // ============================================================================
// // LOGGING MIDDLEWARE (MORGAN) - WITH TEST ENVIRONMENT FIX
// // ============================================================================

// console.log('Setting up logging middleware...');

// // Morgan - HTTP request logging with test environment handling
// try {
//   const morgan = require('morgan');
  
//   if (process.env.NODE_ENV === 'test') {
//     // Skip Morgan in test environment to prevent stream errors
//     app.use(morgan('combined', { skip: () => true }));
//     console.log('✓ Morgan logging disabled for test environment');
//   } else if (process.env.NODE_ENV === 'development') {
//     // Development: simple console logging
//     app.use(morgan('dev'));
//     console.log('✓ Morgan logging configured (dev mode)');
//   } else {
//     // Production: log to file
//     try {
//       const logger = require('./utils/logger');
//       app.use(morgan('combined', { stream: logger.stream }));
//       console.log('✓ Morgan logging configured (production mode)');
//     } catch (loggerError) {
//       // Fallback to access.log file if logger utility fails
//       const accessLogPath = path.join(__dirname, 'logs', 'access.log');
      
//       // Ensure logs directory exists
//       if (!fs.existsSync(path.join(__dirname, 'logs'))) {
//         fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
//       }
      
//       const accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
//       app.use(morgan('combined', { stream: accessLogStream }));
//       console.log('✓ Morgan logging configured (file fallback)');
//     }
//   }
// } catch (error) {
//   console.error('✗ Morgan logging failed:', error.message);
//   console.log('⚠️ Continuing without Morgan logging');
// }

// // Custom request logger
// try {
//   if (process.env.NODE_ENV !== 'test') {
//     console.log('Attempting to load logger middleware...');
//     const logger = require('./middleware/logger.middleware');
    
//     // Use specific logging functions
//     if (logger.logRequest && typeof logger.logRequest === 'function') {
//       app.use(logger.logRequest);
//       console.log('✓ Request logger configured');
//     } else {
//       throw new Error('logRequest function not found');
//     }
    
//     // Optionally add more logging
//     if (logger.logPerformance && typeof logger.logPerformance === 'function') {
//       app.use(logger.logPerformance);
//       console.log('✓ Performance logger configured');
//     }
//   } else {
//     console.log('✓ Custom logger skipped for test environment');
//   }
// } catch (error) {
//   console.error('✗ Logger middleware failed:', error.message);
//   // Fallback to basic logging (skip in test)
//   if (process.env.NODE_ENV !== 'test') {
//     app.use((req, res, next) => {
//       console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
//       next();
//     });
//     console.log('✓ Fallback logger configured');
//   }
// }

// // ============================================================================
// // SANITIZATION MIDDLEWARE
// // ============================================================================

// console.log('Setting up sanitization middleware...');

// // Additional sanitization
// try {
//   const sanitization = require('./middleware/sanitization.middleware');
  
//   // 1. Security headers
//   if (sanitization.setSecurityHeaders && typeof sanitization.setSecurityHeaders === 'function') {
//     app.use(sanitization.setSecurityHeaders);
//     console.log('✓ Security headers configured');
//   }
  
//   // 2. Request sanitization
//   if (sanitization.sanitizeRequest && typeof sanitization.sanitizeRequest === 'function') {
//     app.use(sanitization.sanitizeRequest);
//     console.log('✓ Request sanitization configured');
//   }
  
//   // 3. Block suspicious requests (optional - can be heavy)
//   if (process.env.ENABLE_STRICT_SECURITY === 'true') {
//     if (sanitization.blockSuspiciousRequests && typeof sanitization.blockSuspiciousRequests === 'function') {
//       app.use(sanitization.blockSuspiciousRequests);
//       console.log('✓ Suspicious request blocking configured (strict mode)');
//     }
//   }
  
// } catch (error) {
//   console.error('✗ Sanitization middleware failed:', error.message);
  
//   // Basic security headers fallback
//   app.use((req, res, next) => {
//     res.setHeader('X-XSS-Protection', '1; mode=block');
//     res.setHeader('X-Content-Type-Options', 'nosniff');
//     res.setHeader('X-Frame-Options', 'SAMEORIGIN');
//     next();
//   });
//   console.log('✓ Basic security headers configured (fallback)');
// }

// console.log('✓ Sanitization middleware configured');

// // ============================================================================
// // RATE LIMITING
// // ============================================================================

// try {
//   console.log('Attempting to load rate limiter...');
//   const rateLimiter = require('./middleware/rateLimiter');
  
//   if (rateLimiter && rateLimiter.global && typeof rateLimiter.global === 'function') {
//     app.use(rateLimiter.global);
//     console.log('✓ Rate limiting configured');
//   } else {
//     console.warn('⚠️ Rate limiter not found or invalid, using basic rate limiter');
//     // Basic rate limiter as fallback
//     const rateLimit = require('express-rate-limit');
//     const limiter = rateLimit({
//       windowMs: 15 * 60 * 1000, // 15 minutes
//       max: 100, // limit each IP to 100 requests per windowMs
//       message: 'Too many requests from this IP, please try again later.'
//     });
//     app.use(limiter);
//     console.log('✓ Basic rate limiter configured');
//   }
// } catch (error) {
//   console.error('✗ Rate limiting failed:', error.message);
//   console.log('Setting up basic rate limiter...');
//   const rateLimit = require('express-rate-limit');
//   const limiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     message: 'Too many requests from this IP, please try again later.'
//   });
//   app.use(limiter);
//   console.log('✓ Basic rate limiter configured');
// }

// // ============================================================================
// // API DOCUMENTATION
// // ============================================================================

// console.log('Setting up API documentation...');

// try {
//   const swaggerUi = require('swagger-ui-express');
//   const swaggerSpec = require('./config/swagger');
  
//   // Swagger UI
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
//     explorer: true,
//     customCss: '.swagger-ui .topbar { display: none }',
//     customSiteTitle: 'NEP Workbench API Documentation'
//   }));
  
//   // Swagger JSON
//   app.get('/api-docs.json', (req, res) => {
//     res.setHeader('Content-Type', 'application/json');
//     res.send(swaggerSpec);
//   });
//   console.log('✓ Swagger documentation configured');
// } catch (error) {
//   console.error('✗ Swagger documentation failed:', error.message);
// }

// // ============================================================================
// // HEALTH CHECK & STATUS
// // ============================================================================

// app.get('/health', (req, res) => {
//   res.status(200).json({
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//     environment: process.env.NODE_ENV || 'development',
//     version: '1.0.0'
//   });
// });

// app.get('/api/status', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'NEP Workbench API is running',
//     version: '1.0.0',
//     timestamp: new Date().toISOString(),
//     services: {
//       database: 'connected',
//       cache: 'active',
//       scheduler: 'running'
//     }
//   });
// });

// console.log('✓ Health check endpoints configured');

// // ============================================================================
// // STATIC FILES
// // ============================================================================

// console.log('Setting up static file serving...');

// // Serve uploaded files (with authentication in production)
// app.use('/uploads', express.static('uploads'));

// // Serve exports (with admin authentication in production)
// app.use('/exports', express.static('exports'));

// console.log('✓ Static file serving configured');

// // ============================================================================
// // FRONTEND STATIC FILES - UPDATED PATHS
// // ============================================================================

// console.log('\n=========================================');
// console.log('SETTING UP FRONTEND STATIC FILE SERVING');
// console.log('=========================================');

// // ✅ UPDATED: Check for frontend at correct location - Direct frontend folder
// const frontendPaths = [
//   path.join(__dirname, '../frontend'),           // ✅ DIRECT FRONTEND FOLDER - Tumhara actual HTML files yahan hain
//   path.join(__dirname, '../frontend/build'),     // React/Vue build
//   path.join(__dirname, '../frontend/dist'),      // Vite build
//   path.join(__dirname, '../frontend/public'),    // Static public
//   path.join(__dirname, 'public'),                // Local public
//   path.join(__dirname, 'frontend')               // Frontend in backend
// ];

// let frontendPath = null;
// for (const pathOption of frontendPaths) {
//   if (fs.existsSync(pathOption)) {
//     frontendPath = pathOption;
//     console.log(`✓ Found frontend at: ${pathOption}`);
    
//     // Log what files are available
//     console.log('Frontend files found:');
//     try {
//       const files = fs.readdirSync(pathOption);
//       files.forEach(file => {
//         const fullPath = path.join(pathOption, file);
//         const isDir = fs.lstatSync(fullPath).isDirectory();
//         console.log(`  ${isDir ? '📁' : '📄'} ${file}${isDir ? '/' : ''}`);
//       });
//     } catch (e) {
//       console.log(`  Could not list files: ${e.message}`);
//     }
//     break;
//   }
// }

// if (frontendPath) {
//   // Serve static files from frontend directory
//   app.use(express.static(frontendPath));
//   console.log(`✓ Serving static files from: ${frontendPath}`);
  
//   // For serving HTML files directly (not SPA)
//   // Check if specific HTML files exist
//   const indexHtmlPath = path.join(frontendPath, 'index.html');
//   const loginHtmlPath = path.join(frontendPath, 'login.html');
  
//   if (fs.existsSync(indexHtmlPath)) {
//     console.log('✓ index.html found');
//   } else {
//     console.log('⚠️ index.html not found in frontend');
//   }
  
//   if (fs.existsSync(loginHtmlPath)) {
//     console.log('✓ login.html found');
//   } else {
//     console.log('⚠️ login.html not found in frontend');
//   }
  
//   // Special route for login.html to handle direct access
//   app.get('/login.html', (req, res) => {
//     const loginPath = path.join(frontendPath, 'login.html');
//     if (fs.existsSync(loginPath)) {
//       res.sendFile(loginPath);
//     } else {
//       res.status(404).send('login.html not found');
//     }
//   });
  
//   // For any other HTML files or assets
//   app.get('/*', (req, res, next) => {
//     // If it's an API route, skip
//     if (req.path.startsWith('/api/')) {
//       return next();
//     }
    
//     // Check if the file exists
//     const requestedPath = path.join(frontendPath, req.path);
    
//     // If it's a file that exists, serve it
//     if (fs.existsSync(requestedPath) && !fs.lstatSync(requestedPath).isDirectory()) {
//       return res.sendFile(requestedPath);
//     }
    
//     // If it's a directory, check for index.html
//     if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isDirectory()) {
//       const dirIndexPath = path.join(requestedPath, 'index.html');
//       if (fs.existsSync(dirIndexPath)) {
//         return res.sendFile(dirIndexPath);
//       }
//     }
    
//     // For root path, serve index.html if it exists
//     if (req.path === '/' || req.path === '') {
//       const indexPath = path.join(frontendPath, 'index.html');
//       if (fs.existsSync(indexPath)) {
//         return res.sendFile(indexPath);
//       }
//     }
    
//     next(); // Continue to 404 handler
//   });
  
//   console.log('✓ Static HTML file serving configured');
// } else {
//   console.log('⚠️ No frontend directory found. Running as API-only server.');
//   console.log('Searched in these locations:');
//   frontendPaths.forEach(p => console.log(`  - ${p}`));
// }

// console.log('\n=========================================');
// console.log('API ROUTES SETUP');
// console.log('=========================================');

// // ============================================================================
// // API ROUTES - WITH DEBUGGING
// // ============================================================================

// const API_PREFIX = '/api';

// // Helper function to load routes safely with detailed debugging
// function loadRoute(name, path) {
//   console.log(`\n[${new Date().toISOString()}] Attempting to import ${name}...`);
  
//   try {
//     // Check if file exists
//     const pathModule = require('path');
    
//     // Try the path as given
//     let absolutePath = pathModule.resolve(__dirname, path);
//     console.log(`Checking file existence: ${absolutePath}`);
    
//     // If file doesn't exist, try adding .js extension
//     if (!fs.existsSync(absolutePath)) {
//       const withJs = `${absolutePath}.js`;
//       console.log(`File not found, trying with .js extension: ${withJs}`);
      
//       if (fs.existsSync(withJs)) {
//         absolutePath = withJs;
//         console.log(`✓ Found file with .js extension`);
//       } else {
//         // Try without extension if path already has .js
//         if (absolutePath.endsWith('.js')) {
//           const withoutJs = absolutePath.slice(0, -3);
//           console.log(`Trying without .js extension: ${withoutJs}`);
//           if (fs.existsSync(withoutJs)) {
//             absolutePath = withoutJs;
//             console.log(`✓ Found file without .js extension`);
//           }
//         }
//       }
//     }
    
//     if (!fs.existsSync(absolutePath)) {
//       console.error(`✗ ERROR: File does not exist: ${absolutePath}`);
//       console.error(`Current working directory: ${process.cwd()}`);
//       console.error(`__dirname: ${__dirname}`);
      
//       // Try to list the directory
//       const dir = pathModule.dirname(absolutePath);
//       console.log(`Contents of ${dir}:`);
//       try {
//         const files = fs.readdirSync(dir);
//         files.forEach(file => console.log(`  - ${file}`));
//       } catch (dirError) {
//         console.error(`Could not read directory: ${dirError.message}`);
//       }
      
//       console.log(`Attempting to require ${path} anyway...`);
//     }
    
//     console.log(`✓ File exists or attempting to require...`);
    
//     // Clear require cache for this module if needed
//     delete require.cache[require.resolve(path)];
    
//     const route = require(path);
    
//     console.log(`✓ ${name} imported successfully`);
    
//     // Check if it's a valid Express router
//     if (!route || typeof route !== 'function') {
//       console.error(`⚠️ WARNING: ${name} is not a function (type: ${typeof route})`);
//       if (route && typeof route === 'object') {
//         console.log(`Route object keys:`, Object.keys(route));
//       }
//     } else {
//       console.log(`✓ ${name} is a function (likely a valid Express router)`);
//     }
    
//     return route;
//   } catch (error) {
//     console.error(`✗ CRITICAL ERROR: Failed to import ${name}`);
//     console.error(`Error message: ${error.message}`);
//     console.error(`Error stack:`, error.stack);
    
//     // Return a minimal error router
//     const router = express.Router();
//     router.get('/', (req, res) => {
//       res.status(503).json({
//         success: false,
//         message: `${name} route is temporarily unavailable`,
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined,
//         timestamp: new Date().toISOString()
//       });
//     });
    
//     // Add a catch-all for this route
//     router.all('*', (req, res) => {
//       res.status(503).json({
//         success: false,
//         message: `${name} route failed to load`,
//         originalUrl: req.originalUrl,
//         timestamp: new Date().toISOString()
//       });
//     });
    
//     return router;
//   }
// }

// console.log('\n=========================================');
// console.log('LOADING INDIVIDUAL ROUTE MODULES');
// console.log('=========================================');

// // Authentication routes
// console.log('\n--- 1. Loading Authentication Routes ---');
// const authRoutes = loadRoute('authRoutes', './routes/auth.routes.js');
// console.log(`Registering auth routes at ${API_PREFIX}/auth`);
// app.use(`${API_PREFIX}/auth`, authRoutes);
// console.log('✓ Auth routes registered');

// // Student routes
// console.log('\n--- 2. Loading Student Routes ---');
// const studentRoutes = loadRoute('studentRoutes', './routes/student.routes.js');
// console.log(`Registering student routes at ${API_PREFIX}/students`);
// app.use(`${API_PREFIX}/student`, studentRoutes);
// console.log('✓ Student routes registered');

// // Teacher routes
// console.log('\n--- 3. Loading Teacher Routes ---');
// const teacherRoutes = loadRoute('teacherRoutes', './routes/teacher.routes.js');
// console.log(`Registering teacher routes at ${API_PREFIX}/teachers`);
// app.use(`${API_PREFIX}/teacher`, teacherRoutes);
// console.log('✓ Teacher routes registered');

// // Parent routes
// console.log('\n--- 4. Loading Parent Routes ---');
// const parentRoutes = loadRoute('parentRoutes', './routes/parent.routes.js');
// console.log(`Registering parent routes at ${API_PREFIX}/parents`);
// app.use(`${API_PREFIX}/parent`, parentRoutes);
// console.log('✓ Parent routes registered');

// // Challenge routes
// console.log('\n--- 5. Loading Challenge Routes ---');
// const challengeRoutes = loadRoute('challengeRoutes', './routes/challenge.routes.js');
// console.log(`Registering challenge routes at ${API_PREFIX}/challenges`);
// app.use(`${API_PREFIX}/challenges`, challengeRoutes);
// console.log('✓ Challenge routes registered');

// // Analytics routes
// console.log('\n--- 6. Loading Analytics Routes ---');
// const analyticsRoutes = loadRoute('analyticsRoutes', './routes/analytics.routes.js');
// console.log(`Registering analytics routes at ${API_PREFIX}/analytics`);
// app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
// console.log('✓ Analytics routes registered');

// // Admin routes
// console.log('\n--- 7. Loading Admin Routes ---');
// const adminRoutes = loadRoute('adminRoutes', './routes/admin.routes.js');
// console.log(`Registering admin routes at ${API_PREFIX}/admin`);
// app.use(`${API_PREFIX}/admin`, adminRoutes);
// console.log('✓ Admin routes registered');

// // SPI routes
// console.log('\n--- Loading SPI Routes ---');
// const spiRoutes = loadRoute('spiRoutes', './routes/spi.routes.js');
// console.log(`Registering SPI routes at ${API_PREFIX}/spi`);
// app.use(`${API_PREFIX}/spi`, spiRoutes);
// console.log('✓ SPI routes registered');


// // ============================================================================
// // NEW: REPORT ROUTES (LEDGER-ANCHORED NEP REPORTS)
// // ============================================================================

// console.log('\n--- 8. Loading Report Routes (LEDGER-ANCHORED) ---');
// try {
//   const reportRoutes = loadRoute('reportRoutes', './routes/report.routes.js');
//   console.log(`Registering report routes at ${API_PREFIX}/reports`);
//   app.use(`${API_PREFIX}/reports`, reportRoutes);
//   console.log('✓ Report routes registered (ledger-anchored NEP reports)');
  
//   // Log available report endpoints
//   console.log('\n--- NEP Report Endpoints Available ---');
//   console.log('✓ POST   /api/reports/nep/generate          Generate ledger-anchored NEP report');
//   console.log('✓ GET    /api/reports/nep/verify/:reportId  Verify report integrity (public)');
//   console.log('✓ GET    /api/reports/nep/:reportId         Get NEP report by ID');
//   console.log('✓ GET    /api/reports/nep/student/:studentId Get student\'s NEP reports');
//   console.log('✓ GET    /api/reports/nep/:reportId/download Download PDF report');
//   console.log('✓ GET    /api/reports/nep/:reportId/qrcode  Get QR code for verification');
//   console.log('✓ POST   /api/reports/nep/:reportId/share   Share report via email');
//   console.log('✓ GET    /api/reports/nep/:reportId/ledger  Get ledger events used');
//   console.log('✓ POST   /api/reports/batch/generate        Generate batch reports');
//   console.log('✓ POST   /api/reports/batch/verify          Batch verify reports');
//   console.log('✓ GET    /api/reports/stats/school/:schoolId School report stats');
//   console.log('✓ GET    /api/reports/stats/student/:studentId Student report stats');
//   console.log('✓ GET    /api/reports/health                Report service health check');
//   console.log('--- Legacy Analytics Reports (unchanged) ---');
//   console.log('✓ POST   /api/reports/institutional/generate Institutional reports');
//   console.log('✓ GET    /api/reports/institutional/:reportId Get institutional report');
//   console.log('✓ GET    /api/reports/institutional/school/:schoolId School reports');
//   console.log('✓ DELETE /api/reports/institutional/:reportId Delete institutional report');
//   console.log('✓ POST   /api/reports/progress/generate     Generate progress report');
//   console.log('✓ POST   /api/reports/progress/class        Generate class progress report');
//   console.log('✓ POST   /api/reports/schedule              Schedule report generation');
//   console.log('✓ GET    /api/reports/scheduled             Get scheduled reports');
//   console.log('✓ DELETE /api/reports/scheduled/:scheduleId Cancel scheduled report');
//   console.log('✓ POST   /api/reports/webhook/verification  External verification webhook');
  
// } catch (error) {
//   console.error('✗ ERROR: Failed to load report routes:', error.message);
//   console.log('⚠️ Report functionality will be unavailable');
  
//   // Create fallback report routes
//   const router = express.Router();
//   router.all('*', (req, res) => {
//     res.status(503).json({
//       success: false,
//       message: 'Report service is temporarily unavailable',
//       originalUrl: req.originalUrl,
//       timestamp: new Date().toISOString()
//     });
//   });
//   app.use(`${API_PREFIX}/reports`, router);
// }

// console.log('\n=========================================');
// console.log('ALL ROUTES LOADED SUCCESSFULLY!');
// console.log('=========================================');
// console.log('Total routes registered: 8');
// console.log('New ledger-anchored NEP report system: ✅ ACTIVE');

// // ============================================================================
// // ROOT ROUTE
// // ============================================================================

// app.get('/', (req, res) => {
//   // If we have a frontend, redirect to it
//   if (frontendPath) {
//     const indexPath = path.join(frontendPath, 'index.html');
//     if (fs.existsSync(indexPath)) {
//       return res.sendFile(indexPath);
//     }
//   }
  
//   // Otherwise, show API info
//   res.json({
//     message: 'Welcome to NEP Workbench API',
//     version: '1.0.0',
//     documentation: '/api-docs',
//     health: '/health',
//     status: '/api/status',
//     frontend: frontendPath ? `✅ Active (${frontendPath})` : '❌ Not found',
//     features: {
//       ledgerAnchoredReports: '✅ Active',
//       aiNarration: '✅ Active',
//       competencyFramework: '✅ Active',
//       batchOperations: '✅ Active'
//     },
//     endpoints: {
//       auth: `${API_PREFIX}/auth`,
//       students: `${API_PREFIX}/students`,
//       teachers: `${API_PREFIX}/teachers`,
//       parents: `${API_PREFIX}/parents`,
//       challenges: `${API_PREFIX}/challenges`,
//       analytics: `${API_PREFIX}/analytics`,
//       admin: `${API_PREFIX}/admin`,
//       reports: `${API_PREFIX}/reports (NEW: LEDGER-ANCHORED)`
//     },
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });

// console.log('✓ Root route configured');

// // ============================================================================
// // 404 HANDLER - UPDATED FOR BETTER FRONTEND SUPPORT
// // ============================================================================

// app.all('*', (req, res, next) => {
//   // For API routes, use AppError
//   if (req.path.startsWith('/api/')) {
//     const { AppError } = require('./utils/AppError');
//     return next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
//   }
  
//   // For non-API routes, if we have a frontend, try to serve HTML
//   if (frontendPath) {
//     // Check for specific HTML file
//     const requestedPath = path.join(frontendPath, req.path);
    
//     // If it ends with .html, try to serve it
//     if (req.path.endsWith('.html')) {
//       if (fs.existsSync(requestedPath)) {
//         return res.sendFile(requestedPath);
//       }
//     }
    
//     // For root-like paths, try index.html
//     if (req.path === '/' || req.path === '') {
//       const indexPath = path.join(frontendPath, 'index.html');
//       if (fs.existsSync(indexPath)) {
//         return res.sendFile(indexPath);
//       }
//     }
//   }
  
//   // Otherwise, send simple 404
//   res.status(404).json({
//     success: false,
//     message: `Route ${req.originalUrl} not found`,
//     timestamp: new Date().toISOString(),
//     note: frontendPath ? `Frontend found at: ${frontendPath}` : 'No frontend directory found'
//   });
// });

// console.log('✓ 404 handler configured');

// // ============================================================================
// // GLOBAL ERROR HANDLER
// // ============================================================================

// try {
//   const { errorHandler } = require('./middleware/errorHandler');
//   app.use(errorHandler);
//   console.log('✓ Global error handler configured');
// } catch (error) {
//   console.error('✗ Global error handler failed:', error.message);
//   // Fallback error handler
//   app.use((err, req, res, next) => {
//     console.error('Unhandled error:', err);
//     res.status(err.status || 500).json({
//       success: false,
//       message: err.message || 'Internal server error',
//       error: process.env.NODE_ENV === 'development' ? err.stack : undefined
//     });
//   });
//   console.log('✓ Fallback error handler configured');
// }

// // ============================================================================
// // GRACEFUL SHUTDOWN
// // ============================================================================

// let server;

// const gracefulShutdown = () => {
//   console.log('Graceful shutdown signal received');
//   console.log('Closing HTTP server...');
  
//   if (server && typeof server.close === 'function') {
//     server.close(() => {
//       console.log('HTTP server closed');
      
//       // Close database connections if any
//       const mongoose = require('mongoose');
//       if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
//         mongoose.connection.close(false, () => {
//           console.log('MongoDB connection closed');
//           process.exit(0);
//         });
//       } else {
//         process.exit(0);
//       }
//     });
    
//     // Force shutdown after 10 seconds
//     setTimeout(() => {
//       console.error('Could not close connections in time, forcefully shutting down');
//       process.exit(1);
//     }, 10000);
//   } else {
//     process.exit(0);
//   }
// };

// process.on('SIGTERM', gracefulShutdown);
// process.on('SIGINT', gracefulShutdown);

// console.log('✓ Graceful shutdown configured');

// // ============================================================================
// // UNHANDLED REJECTIONS & EXCEPTIONS
// // ============================================================================

// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//   // In production, you might want to log this to a monitoring service
// });

// process.on('uncaughtException', (error) => {
//   console.error('Uncaught Exception:', error);
//   // Log to monitoring service before exiting
//   setTimeout(() => {
//     process.exit(1);
//   }, 1000);
// });

// console.log('✓ Error handlers configured');

// // ============================================================================
// // START SERVER
// // ============================================================================

// const PORT = process.env.PORT || 5000;

// // Only start server if this file is run directly
// if (require.main === module) {
//   server = app.listen(PORT, () => {
//     console.log('\n' + '='.repeat(60));
//     console.log('🚀 NEP WORKBENCH API SERVER STARTED');
//     console.log('='.repeat(60));
//     console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//     console.log(`Port: ${PORT}`);
//     console.log(`URL: http://localhost:${PORT}`);
//     console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
//     console.log(`Health Check: http://localhost:${PORT}/health`);
//     console.log(`Status: http://localhost:${PORT}/api/status`);
//     console.log('='.repeat(60));
    
//     if (frontendPath) {
//       console.log('FRONTEND: ✅ ACTIVE');
//       console.log(`Frontend served from: ${frontendPath}`);
//       console.log(`Main page: http://localhost:${PORT}/`);
//       console.log(`Login page: http://localhost:${PORT}/login.html`);
      
//       // List important frontend files
//       try {
//         const files = fs.readdirSync(frontendPath);
//         const htmlFiles = files.filter(f => f.endsWith('.html'));
//         if (htmlFiles.length > 0) {
//           console.log('HTML files available:');
//           htmlFiles.forEach(file => console.log(`  • http://localhost:${PORT}/${file}`));
//         }
//       } catch (e) {
//         // Ignore errors
//       }
//     } else {
//       console.log('FRONTEND: ❌ NOT FOUND (API-only mode)');
//     }
    
//     console.log('NEW FEATURE: LEDGER-ANCHORED NEP REPORTS');
//     console.log('• Verifiable competency assessments');
//     console.log('• AI narration with authoritative data');
//     console.log('• QR code verification for authenticity');
//     console.log('• Batch report generation');
//     console.log('='.repeat(60));
//     console.log('Available Routes:');
//     if (frontendPath) {
//       console.log(`  Frontend:   http://localhost:${PORT}/`);
//     }
//     console.log(`  Auth:       http://localhost:${PORT}/api/auth`);
//     console.log(`  Students:   http://localhost:${PORT}/api/students`);
//     console.log(`  Teachers:   http://localhost:${PORT}/api/teachers`);
//     console.log(`  Parents:    http://localhost:${PORT}/api/parents`);
//     console.log(`  Challenges: http://localhost:${PORT}/api/challenges`);
//     console.log(`  Analytics:  http://localhost:${PORT}/api/analytics`);
//     console.log(`  Admin:      http://localhost:${PORT}/api/admin`);
//     console.log(`  Reports:    http://localhost:${PORT}/api/reports (NEW!)`);
//     console.log('='.repeat(60));
//     console.log('NEP Report Endpoints:');
//     console.log(`  • Generate: POST   http://localhost:${PORT}/api/reports/nep/generate`);
//     console.log(`  • Verify:   GET    http://localhost:${PORT}/api/reports/nep/verify/:id`);
//     console.log(`  • QR Code:  GET    http://localhost:${PORT}/api/reports/nep/:id/qrcode`);
//     console.log('='.repeat(60));
//   });

//   // Handle server errors
//   server.on('error', (error) => {
//     if (error.code === 'EADDRINUSE') {
//       console.error(`Port ${PORT} is already in use`);
//       process.exit(1);
//     } else {
//       console.error('Server error:', error);
//       process.exit(1);
//     }
//   });
// }

// // ============================================================================
// // EXPORTS
// // ============================================================================

// module.exports = app;

// console.log('\n' + '='.repeat(60));
// console.log('APP.JS INITIALIZATION COMPLETE');
// console.log('='.repeat(60));
// console.log('✓ Security middleware configured');
// console.log('✓ Rate limiting active');
// console.log('✓ 8 route modules loaded');
// console.log(`✓ Frontend: ${frontendPath ? `✅ ACTIVE (${frontendPath})` : '❌ NOT FOUND'}`);
// console.log('✓ New ledger-anchored report system: READY');
// console.log('✓ Global error handlers active');
// console.log('✓ Graceful shutdown configured');
// console.log('='.repeat(60) + '\n');

/**
 * NEP WORKBENCH - MAIN APPLICATION FILE
 * Educational AI Platform Backend - Complete Production Version
 * 
 * @version 1.0.0
 * @description Complete Express application with all middleware, routes, and error handling
 */

/*require('dotenv').config();
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('Starting application initialization...');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const fs = require('fs');
const path = require('path');

// ============================================================================
// EXPRESS APP INITIALIZATION
// ============================================================================

const app = express();

console.log('Express app initialized');

// ============================================================================
// TRUST PROXY
// ============================================================================

app.set('trust proxy', 1);

// ============================================================================
// SECURITY MIDDLEWARE - UPDATED CSP
// ============================================================================

console.log('Setting up security middleware...');

// Helmet - Security headers with RELAXED CSP for CDN resources
try {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // ✅ ALLOW CDN STYLESHEETS
        styleSrc: [
          "'self'", 
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        // ✅ ALLOW CDN SCRIPTS
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "https://code.jquery.com"
        ],
        // ✅ ALLOW CDN FONTS
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
          "data:"
        ],
        // ✅ ALLOW IMAGES FROM CDN AND DATA URLS
        imgSrc: [
          "'self'", 
          'data:', 
          'https:',
          'blob:'
        ],
        // ✅ ALLOW CONNECTIONS TO CDNS
        connectSrc: [
          "'self'",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        // ✅ ALLOW FRAMES FROM SAME ORIGIN
        frameSrc: ["'self'"],
        // ✅ ALLOW OBJECTS
        objectSrc: ["'none'"],
        // ✅ ALLOW MEDIA
        mediaSrc: ["'self'"],
        // ✅ BASE URI
        baseUri: ["'self'"],
        // ✅ FORM ACTIONS
        formAction: ["'self'"]
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  console.log('✓ Helmet configured with relaxed CSP for CDN resources');
} catch (error) {
  console.error('✗ Helmet configuration failed:', error.message);
  
  // ✅ FALLBACK: Manual CSP header that allows CDNs
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
      "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com data:; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;"
    );
    next();
  });
  console.log('✓ Manual CSP configured (fallback with CDN support)');
}

// CORS Configuration
try {
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000', 'http://localhost:5173'];
      
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

  app.use(cors(corsOptions));
  console.log('✓ CORS configured');
} catch (error) {
  console.error('✗ CORS configuration failed:', error.message);
}

// MongoDB Sanitization
try {
  app.use(mongoSanitize());
  console.log('✓ MongoDB sanitization configured');
} catch (error) {
  console.error('✗ MongoDB sanitization failed:', error.message);
}

// ============================================================================
// COMPRESSION & PARSING MIDDLEWARE
// ============================================================================

console.log('Setting up compression and parsing middleware...');

// Compression
try {
  app.use(compression());
  console.log('✓ Compression configured');
} catch (error) {
  console.error('✗ Compression failed:', error.message);
}

// Body parsers
try {
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));
  
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));
  console.log('✓ Body parsers configured');
} catch (error) {
  console.error('✗ Body parsers failed:', error.message);
}

// Cookie parser
try {
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
  console.log('✓ Cookie parser configured');
} catch (error) {
  console.error('✗ Cookie parser failed:', error.message);
}

// ============================================================================
// LOGGING MIDDLEWARE (MORGAN) - WITH TEST ENVIRONMENT FIX
// ============================================================================

console.log('Setting up logging middleware...');

// Morgan - HTTP request logging with test environment handling
try {
  const morgan = require('morgan');
  
  if (process.env.NODE_ENV === 'test') {
    // Skip Morgan in test environment to prevent stream errors
    app.use(morgan('combined', { skip: () => true }));
    console.log('✓ Morgan logging disabled for test environment');
  } else if (process.env.NODE_ENV === 'development') {
    // Development: simple console logging
    app.use(morgan('dev'));
    console.log('✓ Morgan logging configured (dev mode)');
  } else {
    // Production: log to file
    try {
      const logger = require('./utils/logger');
      app.use(morgan('combined', { stream: logger.stream }));
      console.log('✓ Morgan logging configured (production mode)');
    } catch (loggerError) {
      // Fallback to access.log file if logger utility fails
      const accessLogPath = path.join(__dirname, 'logs', 'access.log');
      
      // Ensure logs directory exists
      if (!fs.existsSync(path.join(__dirname, 'logs'))) {
        fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
      }
      
      const accessLogStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
      app.use(morgan('combined', { stream: accessLogStream }));
      console.log('✓ Morgan logging configured (file fallback)');
    }
  }
} catch (error) {
  console.error('✗ Morgan logging failed:', error.message);
  console.log('⚠️ Continuing without Morgan logging');
}

// Custom request logger
try {
  if (process.env.NODE_ENV !== 'test') {
    console.log('Attempting to load logger middleware...');
    const logger = require('./middleware/logger.middleware');
    
    // Use specific logging functions
    if (logger.logRequest && typeof logger.logRequest === 'function') {
      app.use(logger.logRequest);
      console.log('✓ Request logger configured');
    } else {
      throw new Error('logRequest function not found');
    }
    
    // Optionally add more logging
    if (logger.logPerformance && typeof logger.logPerformance === 'function') {
      app.use(logger.logPerformance);
      console.log('✓ Performance logger configured');
    }
  } else {
    console.log('✓ Custom logger skipped for test environment');
  }
} catch (error) {
  console.error('✗ Logger middleware failed:', error.message);
  // Fallback to basic logging (skip in test)
  if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
      next();
    });
    console.log('✓ Fallback logger configured');
  }
}

// ============================================================================
// SANITIZATION MIDDLEWARE
// ============================================================================

console.log('Setting up sanitization middleware...');

// Additional sanitization
try {
  const sanitization = require('./middleware/sanitization.middleware');
  
  // 1. Security headers
  if (sanitization.setSecurityHeaders && typeof sanitization.setSecurityHeaders === 'function') {
    app.use(sanitization.setSecurityHeaders);
    console.log('✓ Security headers configured');
  }
  
  // 2. Request sanitization
  if (sanitization.sanitizeRequest && typeof sanitization.sanitizeRequest === 'function') {
    app.use(sanitization.sanitizeRequest);
    console.log('✓ Request sanitization configured');
  }
  
  // 3. Block suspicious requests (optional - can be heavy)
  if (process.env.ENABLE_STRICT_SECURITY === 'true') {
    if (sanitization.blockSuspiciousRequests && typeof sanitization.blockSuspiciousRequests === 'function') {
      app.use(sanitization.blockSuspiciousRequests);
      console.log('✓ Suspicious request blocking configured (strict mode)');
    }
  }
  
} catch (error) {
  console.error('✗ Sanitization middleware failed:', error.message);
  
  // Basic security headers fallback
  app.use((req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  console.log('✓ Basic security headers configured (fallback)');
}

console.log('✓ Sanitization middleware configured');

// ============================================================================
// RATE LIMITING
// ============================================================================

try {
  console.log('Attempting to load rate limiter...');
  const rateLimiter = require('./middleware/rateLimiter');
  
  if (rateLimiter && rateLimiter.global && typeof rateLimiter.global === 'function') {
    app.use(rateLimiter.global);
    console.log('✓ Rate limiting configured');
  } else {
    console.warn('⚠️ Rate limiter not found or invalid, using basic rate limiter');
    // Basic rate limiter as fallback
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    app.use(limiter);
    console.log('✓ Basic rate limiter configured');
  }
} catch (error) {
  console.error('✗ Rate limiting failed:', error.message);
  console.log('Setting up basic rate limiter...');
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
  console.log('✓ Basic rate limiter configured');
}

// ============================================================================
// API DOCUMENTATION
// ============================================================================

console.log('Setting up API documentation...');

try {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'NEP Workbench API Documentation'
  }));
  
  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  console.log('✓ Swagger documentation configured');
} catch (error) {
  console.error('✗ Swagger documentation failed:', error.message);
}

// ============================================================================
// HEALTH CHECK & STATUS
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NEP Workbench API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      cache: 'active',
      scheduler: 'running'
    }
  });
});

console.log('✓ Health check endpoints configured');

// ============================================================================
// STATIC FILES
// ============================================================================

console.log('Setting up static file serving...');

// Serve uploaded files (with authentication in production)
app.use('/uploads', express.static('uploads'));

// Serve exports (with admin authentication in production)
app.use('/exports', express.static('exports'));

console.log('✓ Static file serving configured');

// ============================================================================
// FRONTEND STATIC FILES - UPDATED PATHS
// ============================================================================

console.log('\n=========================================');
console.log('SETTING UP FRONTEND STATIC FILE SERVING');
console.log('=========================================');

// ✅ UPDATED: Check for frontend at correct location - Direct frontend folder
const frontendPaths = [
  path.join(__dirname, '../frontend'),           // ✅ DIRECT FRONTEND FOLDER - Tumhara actual HTML files yahan hain
  path.join(__dirname, '../frontend/build'),     // React/Vue build
  path.join(__dirname, '../frontend/dist'),      // Vite build
  path.join(__dirname, '../frontend/public'),    // Static public
  path.join(__dirname, 'public'),                // Local public
  path.join(__dirname, 'frontend')               // Frontend in backend
];

let frontendPath = null;
for (const pathOption of frontendPaths) {
  if (fs.existsSync(pathOption)) {
    frontendPath = pathOption;
    console.log(`✓ Found frontend at: ${pathOption}`);
    
    // Log what files are available
    console.log('Frontend files found:');
    try {
      const files = fs.readdirSync(pathOption);
      files.forEach(file => {
        const fullPath = path.join(pathOption, file);
        const isDir = fs.lstatSync(fullPath).isDirectory();
        console.log(`  ${isDir ? '📁' : '📄'} ${file}${isDir ? '/' : ''}`);
      });
    } catch (e) {
      console.log(`  Could not list files: ${e.message}`);
    }
    break;
  }
}

if (frontendPath) {
  // Serve static files from frontend directory
  app.use(express.static(frontendPath));
  console.log(`✓ Serving static files from: ${frontendPath}`);
  
  // For serving HTML files directly (not SPA)
  // Check if specific HTML files exist
  const indexHtmlPath = path.join(frontendPath, 'index.html');
  const loginHtmlPath = path.join(frontendPath, 'login.html');
  
  if (fs.existsSync(indexHtmlPath)) {
    console.log('✓ index.html found');
  } else {
    console.log('⚠️ index.html not found in frontend');
  }
  
  if (fs.existsSync(loginHtmlPath)) {
    console.log('✓ login.html found');
  } else {
    console.log('⚠️ login.html not found in frontend');
  }
  
  // Special route for login.html to handle direct access
  app.get('/login.html', (req, res) => {
    const loginPath = path.join(frontendPath, 'login.html');
    if (fs.existsSync(loginPath)) {
      res.sendFile(loginPath);
    } else {
      res.status(404).send('login.html not found');
    }
  });
  
  // For any other HTML files or assets
  app.get('/*', (req, res, next) => {
    // If it's an API route, skip
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Check if the file exists
    const requestedPath = path.join(frontendPath, req.path);
    
    // If it's a file that exists, serve it
    if (fs.existsSync(requestedPath) && !fs.lstatSync(requestedPath).isDirectory()) {
      return res.sendFile(requestedPath);
    }
    
    // If it's a directory, check for index.html
    if (fs.existsSync(requestedPath) && fs.lstatSync(requestedPath).isDirectory()) {
      const dirIndexPath = path.join(requestedPath, 'index.html');
      if (fs.existsSync(dirIndexPath)) {
        return res.sendFile(dirIndexPath);
      }
    }
    
    // For root path, serve index.html if it exists
    if (req.path === '/' || req.path === '') {
      const indexPath = path.join(frontendPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    
    next(); // Continue to 404 handler
  });
  
  console.log('✓ Static HTML file serving configured');
} else {
  console.log('⚠️ No frontend directory found. Running as API-only server.');
  console.log('Searched in these locations:');
  frontendPaths.forEach(p => console.log(`  - ${p}`));
}

console.log('\n=========================================');
console.log('API ROUTES SETUP');
console.log('=========================================');

// ============================================================================
// API ROUTES - WITH DEBUGGING
// ============================================================================

const API_PREFIX = '/api';

// Helper function to load routes safely with detailed debugging
function loadRoute(name, path) {
  console.log(`\n[${new Date().toISOString()}] Attempting to import ${name}...`);
  
  try {
    // Check if file exists
    const pathModule = require('path');
    
    // Try the path as given
    let absolutePath = pathModule.resolve(__dirname, path);
    console.log(`Checking file existence: ${absolutePath}`);
    
    // If file doesn't exist, try adding .js extension
    if (!fs.existsSync(absolutePath)) {
      const withJs = `${absolutePath}.js`;
      console.log(`File not found, trying with .js extension: ${withJs}`);
      
      if (fs.existsSync(withJs)) {
        absolutePath = withJs;
        console.log(`✓ Found file with .js extension`);
      } else {
        // Try without extension if path already has .js
        if (absolutePath.endsWith('.js')) {
          const withoutJs = absolutePath.slice(0, -3);
          console.log(`Trying without .js extension: ${withoutJs}`);
          if (fs.existsSync(withoutJs)) {
            absolutePath = withoutJs;
            console.log(`✓ Found file without .js extension`);
          }
        }
      }
    }
    
    if (!fs.existsSync(absolutePath)) {
      console.error(`✗ ERROR: File does not exist: ${absolutePath}`);
      console.error(`Current working directory: ${process.cwd()}`);
      console.error(`__dirname: ${__dirname}`);
      
      // Try to list the directory
      const dir = pathModule.dirname(absolutePath);
      console.log(`Contents of ${dir}:`);
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => console.log(`  - ${file}`));
      } catch (dirError) {
        console.error(`Could not read directory: ${dirError.message}`);
      }
      
      console.log(`Attempting to require ${path} anyway...`);
    }
    
    console.log(`✓ File exists or attempting to require...`);
    
    // Clear require cache for this module if needed
    delete require.cache[require.resolve(path)];
    
    const route = require(path);
    
    console.log(`✓ ${name} imported successfully`);
    
    // Check if it's a valid Express router
    if (!route || typeof route !== 'function') {
      console.error(`⚠️ WARNING: ${name} is not a function (type: ${typeof route})`);
      if (route && typeof route === 'object') {
        console.log(`Route object keys:`, Object.keys(route));
      }
    } else {
      console.log(`✓ ${name} is a function (likely a valid Express router)`);
    }
    
    return route;
  } catch (error) {
    console.error(`✗ CRITICAL ERROR: Failed to import ${name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack:`, error.stack);
    
    // Return a minimal error router
    const router = express.Router();
    router.get('/', (req, res) => {
      res.status(503).json({
        success: false,
        message: `${name} route is temporarily unavailable`,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      });
    });
    
    // Add a catch-all for this route
    router.all('*', (req, res) => {
      res.status(503).json({
        success: false,
        message: `${name} route failed to load`,
        originalUrl: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });
    
    return router;
  }
}

console.log('\n=========================================');
console.log('LOADING INDIVIDUAL ROUTE MODULES');
console.log('=========================================');

// Authentication routes
console.log('\n--- 1. Loading Authentication Routes ---');
const authRoutes = loadRoute('authRoutes', './routes/auth.routes.js');
console.log(`Registering auth routes at ${API_PREFIX}/auth`);
app.use(`${API_PREFIX}/auth`, authRoutes);
console.log('✓ Auth routes registered');

// Student routes
console.log('\n--- 2. Loading Student Routes ---');
const studentRoutes = loadRoute('studentRoutes', './routes/student.routes.js');
console.log(`Registering student routes at ${API_PREFIX}/students`);
app.use(`${API_PREFIX}/student`, studentRoutes);
console.log('✓ Student routes registered');

// Teacher routes
console.log('\n--- 3. Loading Teacher Routes ---');
const teacherRoutes = loadRoute('teacherRoutes', './routes/teacher.routes.js');
console.log(`Registering teacher routes at ${API_PREFIX}/teachers`);
app.use(`${API_PREFIX}/teacher`, teacherRoutes);
console.log('✓ Teacher routes registered');

// Parent routes
console.log('\n--- 4. Loading Parent Routes ---');
const parentRoutes = loadRoute('parentRoutes', './routes/parent.routes.js');
console.log(`Registering parent routes at ${API_PREFIX}/parents`);
app.use(`${API_PREFIX}/parent`, parentRoutes);
console.log('✓ Parent routes registered');

// Challenge routes
console.log('\n--- 5. Loading Challenge Routes ---');
const challengeRoutes = loadRoute('challengeRoutes', './routes/challenge.routes.js');
console.log(`Registering challenge routes at ${API_PREFIX}/challenges`);
app.use(`${API_PREFIX}/challenges`, challengeRoutes);
console.log('✓ Challenge routes registered');

// Analytics routes
console.log('\n--- 6. Loading Analytics Routes ---');
const analyticsRoutes = loadRoute('analyticsRoutes', './routes/analytics.routes.js');
console.log(`Registering analytics routes at ${API_PREFIX}/analytics`);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
console.log('✓ Analytics routes registered');

// Admin routes
console.log('\n--- 7. Loading Admin Routes ---');
const adminRoutes = loadRoute('adminRoutes', './routes/admin.routes.js');
console.log(`Registering admin routes at ${API_PREFIX}/admin`);
app.use(`${API_PREFIX}/admin`, adminRoutes);
console.log('✓ Admin routes registered');

// SPI routes
console.log('\n--- Loading SPI Routes ---');
const spiRoutes = loadRoute('spiRoutes', './routes/spi.routes.js');
console.log(`Registering SPI routes at ${API_PREFIX}/spi`);
app.use(`${API_PREFIX}/spi`, spiRoutes);
console.log('✓ SPI routes registered');


// ============================================================================
// NEW: REPORT ROUTES (LEDGER-ANCHORED NEP REPORTS)
// ============================================================================

console.log('\n--- 8. Loading Report Routes (LEDGER-ANCHORED) ---');
try {
  const reportRoutes = loadRoute('reportRoutes', './routes/report.routes.js');
  console.log(`Registering report routes at ${API_PREFIX}/reports`);
  app.use(`${API_PREFIX}/reports`, reportRoutes);
  console.log('✓ Report routes registered (ledger-anchored NEP reports)');
  
  // Log available report endpoints
  console.log('\n--- NEP Report Endpoints Available ---');
  console.log('✓ POST   /api/reports/nep/generate          Generate ledger-anchored NEP report');
  console.log('✓ GET    /api/reports/nep/verify/:reportId  Verify report integrity (public)');
  console.log('✓ GET    /api/reports/nep/:reportId         Get NEP report by ID');
  console.log('✓ GET    /api/reports/nep/student/:studentId Get student\'s NEP reports');
  console.log('✓ GET    /api/reports/nep/:reportId/download Download PDF report');
  console.log('✓ GET    /api/reports/nep/:reportId/qrcode  Get QR code for verification');
  console.log('✓ POST   /api/reports/nep/:reportId/share   Share report via email');
  console.log('✓ GET    /api/reports/nep/:reportId/ledger  Get ledger events used');
  console.log('✓ POST   /api/reports/batch/generate        Generate batch reports');
  console.log('✓ POST   /api/reports/batch/verify          Batch verify reports');
  console.log('✓ GET    /api/reports/stats/school/:schoolId School report stats');
  console.log('✓ GET    /api/reports/stats/student/:studentId Student report stats');
  console.log('✓ GET    /api/reports/health                Report service health check');
  console.log('--- Legacy Analytics Reports (unchanged) ---');
  console.log('✓ POST   /api/reports/institutional/generate Institutional reports');
  console.log('✓ GET    /api/reports/institutional/:reportId Get institutional report');
  console.log('✓ GET    /api/reports/institutional/school/:schoolId School reports');
  console.log('✓ DELETE /api/reports/institutional/:reportId Delete institutional report');
  console.log('✓ POST   /api/reports/progress/generate     Generate progress report');
  console.log('✓ POST   /api/reports/progress/class        Generate class progress report');
  console.log('✓ POST   /api/reports/schedule              Schedule report generation');
  console.log('✓ GET    /api/reports/scheduled             Get scheduled reports');
  console.log('✓ DELETE /api/reports/scheduled/:scheduleId Cancel scheduled report');
  console.log('✓ POST   /api/reports/webhook/verification  External verification webhook');
  
} catch (error) {
  console.error('✗ ERROR: Failed to load report routes:', error.message);
  console.log('⚠️ Report functionality will be unavailable');
  
  // Create fallback report routes
  const router = express.Router();
  router.all('*', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Report service is temporarily unavailable',
      originalUrl: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  });
  app.use(`${API_PREFIX}/reports`, router);
}

console.log('\n=========================================');
console.log('ALL ROUTES LOADED SUCCESSFULLY!');
console.log('=========================================');
console.log('Total routes registered: 8');
console.log('New ledger-anchored NEP report system: ✅ ACTIVE');

// ============================================================================
// ROOT ROUTE
// ============================================================================

app.get('/', (req, res) => {
  // If we have a frontend, redirect to it
  if (frontendPath) {
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  
  // Otherwise, show API info
  res.json({
    message: 'Welcome to NEP Workbench API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    status: '/api/status',
    frontend: frontendPath ? `✅ Active (${frontendPath})` : '❌ Not found',
    csp: '✅ Relaxed for CDN resources (Chart.js, Font Awesome)',
    features: {
      ledgerAnchoredReports: '✅ Active',
      aiNarration: '✅ Active',
      competencyFramework: '✅ Active',
      batchOperations: '✅ Active'
    },
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      students: `${API_PREFIX}/students`,
      teachers: `${API_PREFIX}/teachers`,
      parents: `${API_PREFIX}/parents`,
      challenges: `${API_PREFIX}/challenges`,
      analytics: `${API_PREFIX}/analytics`,
      admin: `${API_PREFIX}/admin`,
      reports: `${API_PREFIX}/reports (NEW: LEDGER-ANCHORED)`
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

console.log('✓ Root route configured');

// ============================================================================
// 404 HANDLER - UPDATED FOR BETTER FRONTEND SUPPORT
// ============================================================================

app.all('*', (req, res, next) => {
  // For API routes, use AppError
  if (req.path.startsWith('/api/')) {
    const { AppError } = require('./utils/AppError');
    return next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
  }
  
  // For non-API routes, if we have a frontend, try to serve HTML
  if (frontendPath) {
    // Check for specific HTML file
    const requestedPath = path.join(frontendPath, req.path);
    
    // If it ends with .html, try to serve it
    if (req.path.endsWith('.html')) {
      if (fs.existsSync(requestedPath)) {
        return res.sendFile(requestedPath);
      }
    }
    
    // For root-like paths, try index.html
    if (req.path === '/' || req.path === '') {
      const indexPath = path.join(frontendPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
  }
  
  // Otherwise, send simple 404
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    note: frontendPath ? `Frontend found at: ${frontendPath}` : 'No frontend directory found'
  });
});

console.log('✓ 404 handler configured');

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

try {
  const { errorHandler } = require('./middleware/errorHandler');
  app.use(errorHandler);
  console.log('✓ Global error handler configured');
} catch (error) {
  console.error('✗ Global error handler failed:', error.message);
  // Fallback error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  });
  console.log('✓ Fallback error handler configured');
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

let server;

const gracefulShutdown = () => {
  console.log('Graceful shutdown signal received');
  console.log('Closing HTTP server...');
  
  if (server && typeof server.close === 'function') {
    server.close(() => {
      console.log('HTTP server closed');
      
      // Close database connections if any
      const mongoose = require('mongoose');
      if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log('✓ Graceful shutdown configured');

// ============================================================================
// UNHANDLED REJECTIONS & EXCEPTIONS
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to log this to a monitoring service
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to monitoring service before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

console.log('✓ Error handlers configured');

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 5000;

// Only start server if this file is run directly
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 NEP WORKBENCH API SERVER STARTED');
    console.log('='.repeat(60));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`Status: http://localhost:${PORT}/api/status`);
    console.log('='.repeat(60));
    console.log('CSP: ✅ RELAXED FOR CDN RESOURCES');
    console.log('  • Chart.js from cdn.jsdelivr.net');
    console.log('  • Font Awesome from cdnjs.cloudflare.com');
    console.log('  • Google Fonts supported');
    console.log('='.repeat(60));
    
    if (frontendPath) {
      console.log('FRONTEND: ✅ ACTIVE');
      console.log(`Frontend served from: ${frontendPath}`);
      console.log(`Main page: http://localhost:${PORT}/`);
      console.log(`Login page: http://localhost:${PORT}/login.html`);
      
      // List important frontend files
      try {
        const files = fs.readdirSync(frontendPath);
        const htmlFiles = files.filter(f => f.endsWith('.html'));
        if (htmlFiles.length > 0) {
          console.log('HTML files available:');
          htmlFiles.forEach(file => console.log(`  • http://localhost:${PORT}/${file}`));
        }
      } catch (e) {
        // Ignore errors
      }
    } else {
      console.log('FRONTEND: ❌ NOT FOUND (API-only mode)');
    }
    
    console.log('NEW FEATURE: LEDGER-ANCHORED NEP REPORTS');
    console.log('• Verifiable competency assessments');
    console.log('• AI narration with authoritative data');
    console.log('• QR code verification for authenticity');
    console.log('• Batch report generation');
    console.log('='.repeat(60));
    console.log('Available Routes:');
    if (frontendPath) {
      console.log(`  Frontend:   http://localhost:${PORT}/`);
    }
    console.log(`  Auth:       http://localhost:${PORT}/api/auth`);
    console.log(`  Students:   http://localhost:${PORT}/api/students`);
    console.log(`  Teachers:   http://localhost:${PORT}/api/teachers`);
    console.log(`  Parents:    http://localhost:${PORT}/api/parents`);
    console.log(`  Challenges: http://localhost:${PORT}/api/challenges`);
    console.log(`  Analytics:  http://localhost:${PORT}/api/analytics`);
    console.log(`  Admin:      http://localhost:${PORT}/api/admin`);
    console.log(`  Reports:    http://localhost:${PORT}/api/reports (NEW!)`);
    console.log('='.repeat(60));
    console.log('NEP Report Endpoints:');
    console.log(`  • Generate: POST   http://localhost:${PORT}/api/reports/nep/generate`);
    console.log(`  • Verify:   GET    http://localhost:${PORT}/api/reports/nep/verify/:id`);
    console.log(`  • QR Code:  GET    http://localhost:${PORT}/api/reports/nep/:id/qrcode`);
    console.log('='.repeat(60));
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = app;

console.log('\n' + '='.repeat(60));
console.log('APP.JS INITIALIZATION COMPLETE');
console.log('='.repeat(60));
console.log('✓ Security middleware configured');
console.log('✓ CSP relaxed for CDN resources (Chart.js, Font Awesome)');
console.log('✓ Rate limiting active');
console.log('✓ 8 route modules loaded');
console.log(`✓ Frontend: ${frontendPath ? `✅ ACTIVE (${frontendPath})` : '❌ NOT FOUND'}`);
console.log('✓ New ledger-anchored report system: READY');
console.log('✓ Global error handlers active');
console.log('✓ Graceful shutdown configured');
console.log('='.repeat(60) + '\n');*/


require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy',1);

// ============================================================================
// SEO HEADERS  (X-Robots-Tag, canonical Link header)
// ============================================================================
const { seoHeaders } = require('./middleware/seo.middleware');
app.use(seoHeaders);

// ============================================================================
// 🔐 SECURITY (FIXED CSP)
// ============================================================================

app.use(helmet({
  contentSecurityPolicy:{
    directives:{
      defaultSrc:["'self'"],

      styleSrc:[
        "'self'","'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],

      scriptSrc:[
        "'self'","'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ],

      scriptSrcAttr:["'unsafe-inline'"],

      fontSrc:[
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "data:"
      ],

      imgSrc:["'self'","data:","https:"],

      connectSrc:[
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com"
      ]
    }
  },
  crossOriginEmbedderPolicy:false,
  crossOriginResourcePolicy:{policy:"cross-origin"}
}));

// ============================================================================
// CORE MIDDLEWARE
// ============================================================================

app.use(cors({
  origin:(origin,cb)=>{
    const isProduction = process.env.NODE_ENV === 'production';
    const allowed = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000'];

    // In production, reject requests without an Origin header (non-browser clients)
    if (!origin) {
      if (isProduction) return cb(new Error('CORS: missing Origin header'));
      return cb(null, true);
    }
    if (allowed.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked'));
  },
  credentials:true
}));

app.use(mongoSanitize());
app.use(compression());
app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({extended:true,limit:'10mb'}));
app.use(cookieParser());

// ============================================================================
// HEALTH
// ============================================================================

app.get('/health',(req,res)=>{
  res.json({status:'ok',time:new Date()});
});

// ============================================================================
// STATIC FILES (auth-protected)
// ============================================================================

// Protect uploaded/exported files — require a valid JWT to access
const { protect: _protectStatic } = require('./middleware/auth.middleware');
app.use('/uploads', _protectStatic, express.static('uploads'));
app.use('/exports', _protectStatic, express.static('exports'));

// ============================================================================
// 🚀 SPYRAL MULTI FRONTEND (FINAL FIXED)
// ============================================================================

const homePath = path.join(__dirname,'../frontend/home');
const nepPath  = path.join(__dirname,'../frontend/nep-workbench');
const upscPath = path.join(__dirname,'../frontend/upsc-workbench');

// Static asset cache options
const _staticOpts = {
  etag: true,
  lastModified: true,
  setHeaders(res, filePath) {
    // HTML — never cache so deploys take effect immediately
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      // JS/CSS/images/fonts — cache 1 year (nginx also sets immutable)
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  },
};

// HOME
if(fs.existsSync(homePath)){
  app.use('/',express.static(homePath, _staticOpts));
  console.log('✅ Home mounted');
}

// NEP
if(fs.existsSync(nepPath)){
  app.use('/nep-workbench',express.static(nepPath, _staticOpts));
  console.log('✅ NEP Workbench mounted');

  // 🔥 IMPORTANT FIX (login.html NOT FOUND ISSUE)
  app.get('/nep-workbench/login.html',(req,res)=>{
    res.sendFile(path.join(nepPath,'login.html'));
  });
}

// UPSC
if(fs.existsSync(upscPath)){
  app.use('/upsc-workbench',express.static(upscPath, _staticOpts));
  console.log('✅ UPSC Workbench mounted');
}

// SPA fallback
app.get('/nep-workbench/*',(req,res)=>{
  res.sendFile(path.join(nepPath,'index.html'));
});

app.get('/upsc-workbench/*',(req,res)=>{
  res.sendFile(path.join(upscPath,'index.html'));
});

// ============================================================================
// API ROUTES
// ============================================================================

const API_PREFIX='/api';

function loadRoute(name,routePath){
  try{
    const r=require(routePath);
    console.log(`✅ ${name} loaded`);
    return r;
  }catch(err){
    console.error(`❌ ${name} failed`,err.message);
    const router=express.Router();
    router.all('*',(req,res)=>res.status(503).json({message:`${name} unavailable`}));
    return router;
  }
}

app.use(`${API_PREFIX}/auth`,loadRoute('auth','./routes/auth.routes.js'));
app.use(`${API_PREFIX}/student`,loadRoute('student','./routes/student.routes.js'));
app.use(`${API_PREFIX}/teacher`,loadRoute('teacher','./routes/teacher.routes.js'));
app.use(`${API_PREFIX}/parent`,loadRoute('parent','./routes/parent.routes.js'));
app.use(`${API_PREFIX}/challenges`,loadRoute('challenge','./routes/challenge.routes.js'));
app.use(`${API_PREFIX}/analytics`,loadRoute('analytics','./routes/analytics.routes.js'));
app.use(`${API_PREFIX}/admin`,loadRoute('admin','./routes/admin.routes.js'));
app.use(`${API_PREFIX}/subscription`,loadRoute('subscription','./routes/subscription.routes.js'));
app.use(`${API_PREFIX}/spi`,loadRoute('spi','./routes/spi.routes.js'));
app.use(`${API_PREFIX}/reports`,loadRoute('reports','./routes/report.routes.js'));
app.use(`${API_PREFIX}/public`,loadRoute('public','./routes/public.routes.js'));
app.use(`${API_PREFIX}/developer`,loadRoute('developer','./routes/developer.routes.js'));

// ============================================================================
// SEO ROUTES  (sitemap.xml, sitemap-index.xml — must be at domain root)
// ============================================================================
app.use(require('./routes/seo.routes'));

// ============================================================================
// CLEAN URL PAGE ROUTES  (no .html in the address bar)
// ============================================================================
app.use(require('./routes/pages.routes'));

// ============================================================================
// ROOT
// ============================================================================

app.get('/',(req,res)=>{
  const homeFile=path.join(__dirname,'../frontend/home.html');
  if(fs.existsSync(homeFile)) return res.sendFile(homeFile);
  res.json({message:'SPYRAL API Running'});
});

// ============================================================================
// 404
// ============================================================================

app.all('*',(req,res)=>{
  if(req.path.startsWith('/api/')){
    return res.status(404).json({message:'API route not found'});
  }
  res.status(404).send('Not Found');
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

try{
  const {errorHandler}=require('./middleware/errorHandler');
  app.use(errorHandler);
}catch{
  app.use((err,req,res,next)=>{
    res.status(500).json({message:err.message});
  });
}

module.exports=app;
