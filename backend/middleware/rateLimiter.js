/**
 * RATE LIMITER MIDDLEWARE
 * Protect against brute force and DDoS attacks
 */

const rateLimit = require('express-rate-limit');

// Global rate limiter
const global = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter (stricter)
const auth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Login-specific rate limiter (stricter)
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Challenge generation rate limiter
const challengeRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // 3 challenges per minute
  message: 'Too many challenge generation attempts, please slow down'
});

// API rate limiter
const api = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many API requests, please slow down'
});

module.exports = {
  global,
  auth,
  api,
  loginRateLimit,
  challengeRateLimit  // ADDED
};