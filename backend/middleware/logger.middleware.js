// middleware/logger.middleware.js
/**
 * LOGGER MIDDLEWARE - COMPLETE PRODUCTION VERSION
 * Request logging, activity tracking, and audit trail
 * 
 * @module middleware/logger.middleware
 */

const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const { Activity } = require('../models');

// ============================================================================
// LOG DIRECTORY SETUP
// ============================================================================

const logDir = path.join(__dirname, '../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ============================================================================
// LOG STREAMS
// ============================================================================

const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logDir, 'error.log'),
  { flags: 'a' }
);

const activityLogStream = fs.createWriteStream(
  path.join(logDir, 'activity.log'),
  { flags: 'a' }
);

const auditLogStream = fs.createWriteStream(
  path.join(logDir, 'audit.log'),
  { flags: 'a' }
);

// ============================================================================
// MORGAN FORMATS
// ============================================================================

morgan.token('user-id', (req) => req.user?.userId || 'anonymous');
morgan.token('user-type', (req) => req.user?.userType || 'anonymous');
morgan.token('school-id', (req) => req.user?.schoolId || 'none');
morgan.token('body', (req) => JSON.stringify(req.body));
morgan.token('error', (req, res) => res.locals.error || '');

const devFormat = ':method :url :status :response-time ms - :res[content-length]';

const combinedFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

const customFormat = JSON.stringify({
  timestamp: ':date[iso]',
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time',
  userId: ':user-id',
  userType: ':user-type',
  schoolId: ':school-id',
  ip: ':remote-addr',
  userAgent: ':user-agent'
});

// ============================================================================
// MORGAN MIDDLEWARE
// ============================================================================

const morganDev = morgan(devFormat, {
  skip: (req, res) => process.env.NODE_ENV === 'production'
});

const morganCombined = morgan(combinedFormat, {
  stream: accessLogStream,
  skip: (req, res) => process.env.NODE_ENV !== 'production'
});

const morganCustom = morgan(customFormat, {
  stream: accessLogStream
});

// ============================================================================
// ACTIVITY LOGGER
// ============================================================================

const logActivity = async (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    try {
      const duration = Date.now() - startTime;
      
      const activity = {
        type: 'request',
        userId: req.user?.userId || 'anonymous',
        userType: req.user?.userType || 'anonymous',
        schoolId: req.user?.schoolId,
        action: `${req.method} ${req.originalUrl}`,
        details: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        metadata: {
          params: req.params,
          query: req.query,
          headers: {
            'content-type': req.headers['content-type'],
            'accept': req.headers['accept']
          }
        }
      };
      
      await Activity.create(activity);
      
      const logEntry = `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - User: ${activity.userId}\n`;
      activityLogStream.write(logEntry);
      
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  });
  
  next();
};

// ============================================================================
// AUDIT LOGGER
// ============================================================================

const logAudit = (action, details = {}) => {
  return async (req, res, next) => {
    try {
      const auditLog = {
        type: 'audit',
        userId: req.user?.userId,
        userType: req.user?.userType,
        schoolId: req.user?.schoolId,
        action,
        details: {
          ...details,
          timestamp: new Date(),
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        metadata: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          params: req.params,
          query: req.query
        }
      };
      
      await Activity.create(auditLog);
      
      const logEntry = `${new Date().toISOString()} - AUDIT - ${action} - User: ${auditLog.userId} - Details: ${JSON.stringify(details)}\n`;
      auditLogStream.write(logEntry);
      
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
    
    next();
  };
};

// ============================================================================
// SPECIFIC AUDIT LOGGERS
// ============================================================================

const logLogin = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId || req.body.email,
          userType: req.user?.userType || 'unknown',
          schoolId: req.user?.schoolId,
          action: 'login',
          details: {
            timestamp: new Date(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            success: true
          }
        });
      } catch (error) {
        console.error('Failed to log login:', error);
      }
    }
  });
  next();
};

const logLogout = async (req, res, next) => {
  try {
    await Activity.create({
      type: 'audit',
      userId: req.user?.userId,
      userType: req.user?.userType,
      schoolId: req.user?.schoolId,
      action: 'logout',
      details: {
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
  } catch (error) {
    console.error('Failed to log logout:', error);
  }
  next();
};

const logChallengeGeneration = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'challenge_generation',
          details: {
            simulationType: req.body.simulationType,
            difficulty: req.body.difficulty,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log challenge generation:', error);
      }
    }
  });
  next();
};

const logChallengeSubmission = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'challenge_submission',
          details: {
            challengeId: req.params.challengeId,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log challenge submission:', error);
      }
    }
  });
  next();
};

const logScoreOverride = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'score_override',
          details: {
            challengeId: req.params.challengeId,
            newScore: req.body.score,
            reason: req.body.reason,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log score override:', error);
      }
    }
  });
  next();
};

const logDataExport = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'data_export',
          details: {
            exportType: req.params.exportType || req.query.type,
            format: req.query.format,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log data export:', error);
      }
    }
  });
  next();
};

const logSettingsChange = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'settings_change',
          details: {
            changes: req.body,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log settings change:', error);
      }
    }
  });
  next();
};

const logUserCreation = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'user_creation',
          details: {
            newUserType: req.body.userType,
            newUserEmail: req.body.email,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log user creation:', error);
      }
    }
  });
  next();
};

const logUserDeletion = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await Activity.create({
          type: 'audit',
          userId: req.user?.userId,
          userType: req.user?.userType,
          schoolId: req.user?.schoolId,
          action: 'user_deletion',
          details: {
            deletedUserId: req.params.userId,
            timestamp: new Date()
          }
        });
      } catch (error) {
        console.error('Failed to log user deletion:', error);
      }
    }
  });
  next();
};

// ============================================================================
// ERROR LOGGER
// ============================================================================

const logError = (error, req) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      user: req.user?.userId || 'anonymous'
    }
  };
  
  errorLogStream.write(JSON.stringify(errorLog) + '\n');
};

// ============================================================================
// REQUEST LOGGER
// ============================================================================

const logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    user: req.user?.userId || 'anonymous',
    body: req.method !== 'GET' ? req.body : undefined
  };
  
  console.log(`
┌─────────────────────────────────────────────────────────────────
│ 📨 Incoming Request
├─────────────────────────────────────────────────────────────────
│ ⏰ Time:     ${requestLog.timestamp}
│ 🌐 Method:   ${requestLog.method}
│ 🔗 URL:      ${requestLog.url}
│ 👤 User:     ${requestLog.user}
│ 📍 IP:       ${requestLog.ip}
└─────────────────────────────────────────────────────────────────
  `);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const emoji = res.statusCode >= 400 ? '❌' : '✅';
    
    console.log(`
┌─────────────────────────────────────────────────────────────────
│ ${emoji} Response Sent
├─────────────────────────────────────────────────────────────────
│ 📊 Status:   ${res.statusCode}
│ ⏱️  Duration: ${duration}ms
│ 📦 Size:     ${res.get('content-length') || 0} bytes
└─────────────────────────────────────────────────────────────────
  `);
  });
  
  next();
};

// ============================================================================
// PERFORMANCE LOGGER
// ============================================================================

const logPerformance = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1e6;
    
    if (duration > 1000) {
      console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
    }
    
    res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
};

// ============================================================================
// QUERY LOGGER
// ============================================================================

const logQuery = (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log('🔍 Query Parameters:', req.query);
  }
  next();
};

// ============================================================================
// BODY LOGGER
// ============================================================================

const logBody = (req, res, next) => {
  if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = '[REDACTED]';
    
    console.log('📦 Request Body:', sanitizedBody);
  }
  next();
};

// ============================================================================
// RESPONSE LOGGER
// ============================================================================

const logResponse = (req, res, next) => {
  const oldSend = res.send;
  
  res.send = function(data) {
    if (process.env.LOG_RESPONSES === 'true') {
      try {
        const response = JSON.parse(data);
        console.log('📤 Response:', response);
      } catch (error) {
        // Not JSON, skip logging
      }
    }
    
    oldSend.apply(res, arguments);
  };
  
  next();
};

// ============================================================================
// SECURITY LOGGER
// ============================================================================

const logSecurityEvent = (event, details = {}) => {
  return async (req, res, next) => {
    try {
      const securityLog = {
        type: 'security',
        userId: req.user?.userId || 'anonymous',
        userType: req.user?.userType || 'anonymous',
        schoolId: req.user?.schoolId,
        action: event,
        details: {
          ...details,
          timestamp: new Date(),
          ip: req.ip,
          userAgent: req.headers['user-agent']
        },
        metadata: {
          url: req.originalUrl,
          method: req.method
        }
      };
      
      await Activity.create(securityLog);
      
      console.warn(`🔒 SECURITY EVENT: ${event} - User: ${securityLog.userId} - IP: ${req.ip}`);
      
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
    
    next();
  };
};

// ============================================================================
// CLEANUP OLD LOGS
// ============================================================================

const cleanupOldLogs = (daysToKeep = 30) => {
  const logFiles = fs.readdirSync(logDir);
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  logFiles.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtimeMs < cutoffDate) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old log file: ${file}`);
    }
  });
};

// ============================================================================
// LOG ROTATION
// ============================================================================

const rotateLog = (logStream, logPath) => {
  const date = new Date().toISOString().split('T')[0];
  const archivePath = logPath.replace('.log', `-${date}.log`);
  
  logStream.end();
  fs.renameSync(logPath, archivePath);
  
  return fs.createWriteStream(logPath, { flags: 'a' });
};

const scheduleLogRotation = () => {
  setInterval(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const now = new Date();
    const msUntilMidnight = midnight - now;
    
    setTimeout(() => {
      console.log('Rotating logs...');
      
      accessLogStream = rotateLog(accessLogStream, path.join(logDir, 'access.log'));
      errorLogStream = rotateLog(errorLogStream, path.join(logDir, 'error.log'));
      activityLogStream = rotateLog(activityLogStream, path.join(logDir, 'activity.log'));
      auditLogStream = rotateLog(auditLogStream, path.join(logDir, 'audit.log'));
      
      cleanupOldLogs(30);
      
    }, msUntilMidnight);
  }, 24 * 60 * 60 * 1000);
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Morgan middleware
  morganDev,
  morganCombined,
  morganCustom,
  
  // Activity logging
  logActivity,
  
  // Audit logging
  logAudit,
  logLogin,
  logLogout,
  logChallengeGeneration,
  logChallengeSubmission,
  logScoreOverride,
  logDataExport,
  logSettingsChange,
  logUserCreation,
  logUserDeletion,
  
  // Request/Response logging
  logRequest,
  logQuery,
  logBody,
  logResponse,
  
  // Error logging
  logError,
  
  // Performance logging
  logPerformance,
  
  // Security logging
  logSecurityEvent,
  
  // Utilities
  cleanupOldLogs,
  scheduleLogRotation,
  
  // Streams
  accessLogStream,
  errorLogStream,
  activityLogStream,
  auditLogStream
};