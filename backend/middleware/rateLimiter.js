/**
 * RATE LIMITER MIDDLEWARE
 * Protect against brute force and DDoS attacks
 */

const rateLimit = require('express-rate-limit');

// Global rate limiter
// 500 req / 15 min = ~33 req/min per IP — enough for normal dashboard use
// while still blocking scrapers / bots
const global = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // was 100 — too tight for active users
  message: { success: false, message: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // never rate-limit health checks
});

// Auth rate limiter (stricter)
const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later' },
});

// Login-specific rate limiter (stricter)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later' },
});

// Challenge generation rate limiter
const challengeRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many challenge generation attempts, please slow down' },
});

// Free class-tools rate limiter (public, no login — 10 uses per IP per day)
const freeClassTools = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  message: JSON.stringify({ success: false, message: 'Free daily limit of 10 uses reached. Sign up for unlimited access.' }),
  standardHeaders: true,
  legacyHeaders: false,
});

// API rate limiter — 120 req/min per IP (was 60)
const api = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many API requests, please slow down' },
});

module.exports = {
  global,
  auth,
  api,
  loginRateLimit,
  challengeRateLimit,
  freeClassTools
};