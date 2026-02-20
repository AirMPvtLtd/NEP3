/**
 * middleware/usageTracker.middleware.js
 *
 * Non-blocking API usage tracking.
 * Fires after the response is sent — never affects latency.
 *
 * Writes to the activities collection (raw insert to bypass enum validation).
 * Used for: billing dashboards, plan limit enforcement, abuse detection.
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * trackUsage()
 *
 * Attach to any route to record API call metrics per school.
 * Safe to use on all routes — errors are swallowed silently.
 */
function trackUsage(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    // Run asynchronously — don't block event loop
    setImmediate(async () => {
      try {
        const db = mongoose.connection.db;
        if (!db) return;

        const schoolId = req.user?.schoolId || null;
        const userId   = req.user?.userId   || null;

        // Skip internal/health/static requests
        const path = req.path || '';
        if (
          path.startsWith('/health') ||
          path.startsWith('/api/ping') ||
          path === '/'
        ) return;

        await db.collection('activities').insertOne({
          activityType: 'api_call',
          userId,
          schoolId,
          data: {
            method:         req.method,
            path:           path,
            statusCode:     res.statusCode,
            responseTimeMs: Date.now() - startedAt,
            // Mask API key — keep only prefix for debugging
            apiKey: req.apiKeyDoc
              ? req.apiKeyDoc.key.slice(0, 12) + '...'
              : null,
            ip: req.ip,
          },
          timestamp:  new Date(),
          createdAt:  new Date(),
          updatedAt:  new Date(),
        });
      } catch (err) {
        // Non-fatal — never let tracking break the API
        logger.error('[usageTracker] Write failed (non-fatal):', err.message);
      }
    });
  });

  next();
}

module.exports = { trackUsage };
