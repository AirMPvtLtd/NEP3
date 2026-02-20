/**
 * HEALTH CONTROLLER
 * System health check endpoints for monitoring, load balancers, and K8s probes.
 */

'use strict';

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────────────────────

function dbState() {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return states[mongoose.connection.readyState] || 'unknown';
}

function memUsageMB() {
  const m = process.memoryUsage();
  return {
    rss:       (m.rss       / 1024 / 1024).toFixed(1) + ' MB',
    heapUsed:  (m.heapUsed  / 1024 / 1024).toFixed(1) + ' MB',
    heapTotal: (m.heapTotal / 1024 / 1024).toFixed(1) + ' MB',
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

exports.basicHealthCheck = (req, res) => {
  res.json({
    status:    'ok',
    service:   'nep-workbench-api',
    uptime:    Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

exports.detailedHealthCheck = async (req, res) => {
  try {
    const db = dbState();
    const status = db === 'connected' ? 'ok' : 'degraded';
    res.json({
      status,
      service:   'nep-workbench-api',
      version:   process.env.npm_package_version || '2.0.0',
      uptime:    Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database:  { status: db },
      memory:    memUsageMB(),
      env:       process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    logger.error('[health] detailedHealthCheck error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.databaseHealthCheck = async (req, res) => {
  try {
    const state = dbState();
    if (state !== 'connected') {
      return res.status(503).json({ status: 'error', database: state });
    }
    // Ping the database
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok', database: 'connected', ping: 'pong' });
  } catch (err) {
    logger.error('[health] databaseHealthCheck error:', err);
    res.status(503).json({ status: 'error', database: 'unreachable', message: err.message });
  }
};

exports.redisHealthCheck = (req, res) => {
  // Redis not implemented — token blacklist is in-memory
  res.json({ status: 'ok', redis: 'not_configured', note: 'In-memory token blacklist in use.' });
};

exports.aiServiceHealthCheck = (req, res) => {
  const hasKey = !!process.env.MISTRAL_API_KEY;
  res.json({
    status:  hasKey ? 'ok' : 'disabled',
    service: 'mistral-ai',
    note:    hasKey ? 'API key configured.' : 'MISTRAL_API_KEY not set — AI features disabled.',
  });
};

exports.emailServiceHealthCheck = (req, res) => {
  const hasKey = !!process.env.BREVO_API_KEY;
  res.json({
    status:  hasKey ? 'ok' : 'disabled',
    service: 'brevo',
    note:    hasKey ? 'API key configured.' : 'BREVO_API_KEY not set — email disabled.',
  });
};

exports.getSystemMetrics = (req, res) => {
  res.json({
    status:    'ok',
    uptime:    Math.round(process.uptime()),
    memory:    memUsageMB(),
    cpuUsage:  process.cpuUsage(),
    pid:       process.pid,
    timestamp: new Date().toISOString(),
  });
};

exports.getSystemStats = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    let dbStats = null;
    if (db) {
      try { dbStats = await db.stats(); } catch (_) { /* ignore */ }
    }
    res.json({
      status:    'ok',
      uptime:    Math.round(process.uptime()),
      memory:    memUsageMB(),
      database:  dbStats ? { collections: dbStats.collections, objects: dbStats.objects } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[health] getSystemStats error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.getUptime = (req, res) => {
  res.json({ uptime: Math.round(process.uptime()), unit: 'seconds' });
};

exports.readinessProbe = async (req, res) => {
  const db = dbState();
  if (db !== 'connected') {
    return res.status(503).json({ ready: false, reason: `Database ${db}` });
  }
  res.json({ ready: true });
};

exports.livenessProbe = (req, res) => {
  res.json({ alive: true, uptime: Math.round(process.uptime()) });
};
