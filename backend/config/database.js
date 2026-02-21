/**
 * DATABASE CONFIGURATION
 * MongoDB Connection Setup with Mongoose
 * 
 * FIXES:
 * - Disable query buffering (root cause of timeout)
 * - Fail fast if DB not connected
 * - Single source of truth for DB state
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * 🔥 CRITICAL FIX — DISABLE BUFFERING
 * This prevents `buffering timed out after 10000ms`
 */
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

/**
 * MongoDB Connection Options
 */
const options = {
  maxPoolSize:   parseInt(process.env.DB_MAX_POOL_SIZE)  || 100,  // was 10 — 10 connections crash at ~50 users
  minPoolSize:   parseInt(process.env.DB_MIN_POOL_SIZE)  || 10,   // was 2  — warm pool ready for burst

  socketTimeoutMS:           20000,  // was 45000 — fail faster, free sockets sooner
  serverSelectionTimeoutMS:  10000,  // was 5000  — slightly more tolerant of transient issues
  connectTimeoutMS:          15000,  // new — max time to establish a new connection
  waitQueueTimeoutMS:        30000,  // new — max time a request waits for a pool slot before error
  maxIdleTimeMS:             60000,  // new — close idle connections after 60s to reclaim resources
  heartbeatFrequencyMS:      10000,  // new — detect dead connections faster

  autoIndex: process.env.NODE_ENV !== 'production',
  retryWrites: true,
  w: 'majority',

  family: 4
};

// ============================================================================
// CONNECTION
// ============================================================================

const connectDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined');
    }

    logger.info('Attempting to connect to MongoDB...');

    await mongoose.connect(MONGODB_URI, options);

    logger.info('✅ MongoDB connected successfully');
    logger.info(`📦 Database: ${mongoose.connection.name}`);
    logger.info(`🌐 Host: ${mongoose.connection.host}`);
    logger.info(`🔢 Port: ${mongoose.connection.port}`);

  } catch (error) {
    logger.error('❌ MongoDB connection error', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error.message);
  }
};

// ============================================================================
// STATUS
// ============================================================================

const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    status: states[mongoose.connection.readyState],
    readyState: mongoose.connection.readyState,
    name: mongoose.connection.name,
    host: mongoose.connection.host,
    port: mongoose.connection.port
  };
};

// ============================================================================
// EVENTS
// ============================================================================

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose reconnected');
});

mongoose.connection.on('close', () => {
  logger.warn('Mongoose connection closed');
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

// ============================================================================
// INDEXES
// ============================================================================

const createIndexes = async () => {
  try {
    logger.info('Creating database indexes...');
    for (const name of mongoose.modelNames()) {
      await mongoose.model(name).ensureIndexes();
      logger.info(`✅ Indexes ensured for ${name}`);
    }
  } catch (err) {
    logger.error('Index creation failed:', err.message);
  }
};

// ============================================================================
// HEALTH
// ============================================================================

const checkHealth = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        healthy: false,
        status: 'not_connected'
      };
    }

    await mongoose.connection.db.admin().ping();

    return {
      healthy: true,
      status: 'connected',
      database: mongoose.connection.name,
      host: mongoose.connection.host
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnectionStatus,
  createIndexes,
  checkHealth,
  mongoose
};
