/**
 * NEP WORKBENCH - SERVER ENTRY POINT
 * Single-source DB connection + job scheduler + graceful shutdown
 *
 * @version 1.0.0
 */

require('dotenv').config();

// ── Sentry error monitoring (optional — only active when SENTRY_DSN is set) ──
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

const app = require('./app');
const logger = require('./utils/logger');
const jobScheduler = require('./jobs');
const {
  connectDatabase,
  disconnectDatabase,
  mongoose
} = require('./config/database');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// START SERVER
// ============================================================================

const startServer = async () => {
  try {
    // 1️⃣ CONNECT DATABASE (SINGLE SOURCE OF TRUTH)
    await connectDatabase();

    // 2️⃣ START JOB SCHEDULER
    if (jobScheduler && typeof jobScheduler.start === 'function') {
      jobScheduler.start();
      logger.info('Job scheduler started');
    }

    // 3️⃣ START HTTP SERVER
    const server = app.listen(PORT, () => {
      // ── HTTP server hardening for high-concurrency ────────────────────────
      // keepAliveTimeout must be > nginx keepalive_timeout (65s) to avoid
      // nginx getting a "connection reset" when it reuses a keep-alive socket.
      server.keepAliveTimeout  = 70 * 1000;   // 70s  (nginx keepalive_timeout is 65s)
      server.headersTimeout    = 75 * 1000;   // 75s  (must be > keepAliveTimeout)
      server.requestTimeout    = 120 * 1000;  // 120s max per request
      server.maxConnections    = 4096;        // hard cap per process (2 processes = 8192 total)
      server.timeout           = 120 * 1000;  // socket inactivity timeout

      logger.info('Server started successfully', {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        keepAliveTimeout: server.keepAliveTimeout,
        maxConnections: server.maxConnections
      });

      console.log('\n' + '='.repeat(70));
      console.log('🚀 NEP WORKBENCH SERVER STARTED');
      console.log('='.repeat(70));
      console.log(`📍 Server:        http://localhost:${PORT}`);
      console.log(`📚 API Docs:      http://localhost:${PORT}/api-docs`);
      console.log(`💚 Health Check:  http://localhost:${PORT}/health`);
      console.log(`🌍 Environment:   ${NODE_ENV}`);
      console.log(`📊 Database:      ${mongoose.connection.name}`);
      console.log('='.repeat(70) + '\n');
    });

    // ========================================================================
    // GRACEFUL SHUTDOWN
    // ========================================================================

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received — starting graceful shutdown`);

      server.close(async () => {
        try {
          logger.info('HTTP server closed');

          if (jobScheduler && typeof jobScheduler.stop === 'function') {
            jobScheduler.stop();
            logger.info('Job scheduler stopped');
          }

          await disconnectDatabase();
          logger.info('MongoDB connection closed');

          process.exit(0);
        } catch (err) {
          logger.error('Error during graceful shutdown', {
            error: err.message
          });
          process.exit(1);
        }
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error('Graceful shutdown timeout — force exiting');
        process.exit(1);
      }, 10000);
    };

    // OS Signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // ========================================================================
    // GLOBAL PROCESS SAFETY
    // ========================================================================

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection', { reason });
    });

  } catch (error) {
    logger.error('Server startup failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// ============================================================================
// INITIALIZE
// ============================================================================

startServer();

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = app;
