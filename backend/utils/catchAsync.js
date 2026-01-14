// utils/catchAsync.js
/**
 * CATCH ASYNC - COMPLETE PRODUCTION VERSION
 * Async wrapper for error handling in Express routes
 * 
 * @module utils/catchAsync
 */

// ============================================================================
// BASIC CATCH ASYNC
// ============================================================================

/**
 * Wrap async function to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} Express middleware
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================================================
// ADVANCED WRAPPERS
// ============================================================================

/**
 * Wrap async function with timeout
 * @param {Function} fn - Async function
 * @param {Number} timeout - Timeout in milliseconds
 * @returns {Function} Express middleware
 */
const catchAsyncWithTimeout = (fn, timeout = 30000) => {
  return async (req, res, next) => {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
    
    try {
      await Promise.race([
        fn(req, res, next),
        timeoutPromise
      ]);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Wrap async function with retry logic
 * @param {Function} fn - Async function
 * @param {Number} maxRetries - Maximum retry attempts
 * @param {Number} retryDelay - Delay between retries (ms)
 * @returns {Function} Express middleware
 */
const catchAsyncWithRetry = (fn, maxRetries = 3, retryDelay = 1000) => {
  return async (req, res, next) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await fn(req, res, next);
        return;
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          next(error);
          return;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
    
    next(lastError);
  };
};

/**
 * Wrap async function with logging
 * @param {Function} fn - Async function
 * @param {String} label - Log label
 * @returns {Function} Express middleware
 */
const catchAsyncWithLogging = (fn, label = 'Handler') => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      console.log(`[${label}] Started: ${req.method} ${req.path}`);
      await fn(req, res, next);
      const duration = Date.now() - startTime;
      console.log(`[${label}] Completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${label}] Failed after ${duration}ms:`, error.message);
      next(error);
    }
  };
};

/**
 * Wrap async function with circuit breaker
 * @param {Function} fn - Async function
 * @param {Object} options - Circuit breaker options
 * @returns {Function} Express middleware
 */
const catchAsyncWithCircuitBreaker = (fn, options = {}) => {
  const {
    failureThreshold = 5,
    resetTimeout = 60000,
    monitoringPeriod = 60000
  } = options;
  
  let failures = 0;
  let lastFailureTime = 0;
  let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  
  return async (req, res, next) => {
    const now = Date.now();
    
    // Reset failures after monitoring period
    if (now - lastFailureTime > monitoringPeriod) {
      failures = 0;
    }
    
    // Circuit is open
    if (state === 'OPEN') {
      if (now - lastFailureTime > resetTimeout) {
        state = 'HALF_OPEN';
      } else {
        return next(new Error('Circuit breaker is open'));
      }
    }
    
    try {
      await fn(req, res, next);
      
      // Success in HALF_OPEN state closes circuit
      if (state === 'HALF_OPEN') {
        state = 'CLOSED';
        failures = 0;
      }
    } catch (error) {
      failures++;
      lastFailureTime = now;
      
      // Open circuit if threshold reached
      if (failures >= failureThreshold) {
        state = 'OPEN';
        console.warn(`Circuit breaker opened after ${failures} failures`);
      }
      
      next(error);
    }
  };
};

/**
 * Wrap multiple async handlers
 * @param {Array<Function>} handlers - Array of async handlers
 * @returns {Array<Function>} Wrapped handlers
 */
const catchAsyncMultiple = (handlers) => {
  return handlers.map(handler => catchAsync(handler));
};

/**
 * Wrap async middleware chain
 * @param {Array<Function>} middleware - Array of middleware
 * @returns {Array<Function>} Wrapped middleware
 */
const catchAsyncChain = (middleware) => {
  return middleware.map(mw => {
    if (typeof mw === 'function' && mw.constructor.name === 'AsyncFunction') {
      return catchAsync(mw);
    }
    return mw;
  });
};

// ============================================================================
// SPECIALIZED WRAPPERS
// ============================================================================

/**
 * Wrap async validator
 * @param {Function} validator - Validation function
 * @returns {Function} Express middleware
 */
const catchAsyncValidator = (validator) => {
  return catchAsync(async (req, res, next) => {
    const errors = await validator(req);
    
    if (errors && errors.length > 0) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.errors = errors;
      throw error;
    }
    
    next();
  });
};

/**
 * Wrap async authorization check
 * @param {Function} authCheck - Authorization function
 * @returns {Function} Express middleware
 */
const catchAsyncAuth = (authCheck) => {
  return catchAsync(async (req, res, next) => {
    const authorized = await authCheck(req);
    
    if (!authorized) {
      const error = new Error('Access denied');
      error.statusCode = 403;
      throw error;
    }
    
    next();
  });
};

/**
 * Wrap async rate limiter
 * @param {Function} rateLimitCheck - Rate limit function
 * @returns {Function} Express middleware
 */
const catchAsyncRateLimit = (rateLimitCheck) => {
  return catchAsync(async (req, res, next) => {
    const { allowed, retryAfter } = await rateLimitCheck(req);
    
    if (!allowed) {
      const error = new Error('Rate limit exceeded');
      error.statusCode = 429;
      error.retryAfter = retryAfter;
      throw error;
    }
    
    next();
  });
};

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Wrap async handler with JSON response
 * @param {Function} fn - Async function that returns data
 * @returns {Function} Express middleware
 */
const catchAsyncJson = (fn) => {
  return catchAsync(async (req, res) => {
    const data = await fn(req);
    res.json({
      success: true,
      data
    });
  });
};

/**
 * Wrap async handler with paginated response
 * @param {Function} fn - Async function that returns paginated data
 * @returns {Function} Express middleware
 */
const catchAsyncPaginated = (fn) => {
  return catchAsync(async (req, res) => {
    const { data, pagination } = await fn(req);
    res.json({
      success: true,
      data,
      pagination
    });
  });
};

/**
 * Wrap async handler with file response
 * @param {Function} fn - Async function that returns file path
 * @returns {Function} Express middleware
 */
const catchAsyncFile = (fn) => {
  return catchAsync(async (req, res) => {
    const { filepath, filename, mimetype } = await fn(req);
    
    res.setHeader('Content-Type', mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filepath);
  });
};

// ============================================================================
// ERROR TRANSFORMATION
// ============================================================================

/**
 * Transform errors before passing to error handler
 * @param {Function} fn - Async function
 * @param {Function} transformer - Error transformer
 * @returns {Function} Express middleware
 */
const catchAsyncWithTransform = (fn, transformer) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const transformedError = transformer(error, req);
      next(transformedError);
    }
  };
};

/**
 * Wrap async function with custom error handler
 * @param {Function} fn - Async function
 * @param {Function} errorHandler - Custom error handler
 * @returns {Function} Express middleware
 */
const catchAsyncWithHandler = (fn, errorHandler) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      errorHandler(error, req, res, next);
    }
  };
};

// ============================================================================
// CONDITIONAL WRAPPERS
// ============================================================================

/**
 * Conditionally wrap async function
 * @param {Function} fn - Async function
 * @param {Function} condition - Condition function
 * @returns {Function} Express middleware
 */
const catchAsyncIf = (fn, condition) => {
  return catchAsync(async (req, res, next) => {
    if (await condition(req)) {
      await fn(req, res, next);
    } else {
      next();
    }
  });
};

/**
 * Wrap async function with fallback
 * @param {Function} fn - Primary async function
 * @param {Function} fallback - Fallback function
 * @returns {Function} Express middleware
 */
const catchAsyncWithFallback = (fn, fallback) => {
  return catchAsync(async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.warn('Primary handler failed, using fallback:', error.message);
      await fallback(req, res, next);
    }
  });
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Wrap async function for batch operations
 * @param {Function} fn - Async function
 * @param {Number} batchSize - Batch size
 * @returns {Function} Express middleware
 */
const catchAsyncBatch = (fn, batchSize = 100) => {
  return catchAsync(async (req, res, next) => {
    const items = req.body.items || [];
    const results = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await fn(batch, req);
      results.push(...batchResults);
    }
    
    res.json({
      success: true,
      data: results,
      processed: results.length
    });
  });
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Wrap async function with performance monitoring
 * @param {Function} fn - Async function
 * @param {Number} slowThreshold - Slow request threshold (ms)
 * @returns {Function} Express middleware
 */
const catchAsyncWithMonitoring = (fn, slowThreshold = 1000) => {
  return catchAsync(async (req, res, next) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    await fn(req, res, next);
    
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    if (duration > slowThreshold) {
      console.warn(`Slow request detected: ${req.method} ${req.path}`);
      console.warn(`Duration: ${duration}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Basic
  catchAsync,
  
  // Advanced
  catchAsyncWithTimeout,
  catchAsyncWithRetry,
  catchAsyncWithLogging,
  catchAsyncWithCircuitBreaker,
  
  // Multiple handlers
  catchAsyncMultiple,
  catchAsyncChain,
  
  // Specialized
  catchAsyncValidator,
  catchAsyncAuth,
  catchAsyncRateLimit,
  
  // Response helpers
  catchAsyncJson,
  catchAsyncPaginated,
  catchAsyncFile,
  
  // Error transformation
  catchAsyncWithTransform,
  catchAsyncWithHandler,
  
  // Conditional
  catchAsyncIf,
  catchAsyncWithFallback,
  
  // Batch
  catchAsyncBatch,
  
  // Monitoring
  catchAsyncWithMonitoring
};