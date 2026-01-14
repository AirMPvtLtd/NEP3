/**
 * RATE LIMITER MIDDLEWARE TESTS – FIXED
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');

const {
  global: globalLimiter,
  auth,
  api,
  loginRateLimit,
  challengeRateLimit
} = require('./middleware/rateLimiter');

// Helper
const createApp = (middleware, status = 200) => {
  const app = express();
  app.use(express.json());
  app.use(middleware);
  app.post('/test', (req, res) =>
    res.status(status).json({ success: status < 400 })
  );
  return app;
};

// ============================================================================
// GLOBAL RATE LIMITER
// ============================================================================
describe('Rate Limiter – Global', () => {
  it('allows requests under limit', async () => {
    const app = createApp(globalLimiter);
    const res = await request(app).post('/test');
    assert.strictEqual(res.statusCode, 200);
  });
});

// ============================================================================
// AUTH RATE LIMITER (FAILED REQUESTS COUNT)
// ============================================================================
describe('Rate Limiter – Auth', () => {
  it('blocks after exceeding auth limit on failed requests', async () => {
    // ❗ simulate failed login (401)
    const app = createApp(auth, 401);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/test');
      assert.strictEqual(res.statusCode, 401);
    }

    const blocked = await request(app).post('/test');
    assert.strictEqual(blocked.statusCode, 429);
    assert.match(blocked.text, /too many login attempts/i);
  });
});

// ============================================================================
// LOGIN RATE LIMITER (FAILED REQUESTS COUNT)
// ============================================================================
describe('Rate Limiter – Login', () => {
  it('blocks after exceeding login attempts on failed requests', async () => {
    const app = createApp(loginRateLimit, 401);

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/test');
      assert.strictEqual(res.statusCode, 401);
    }

    const blocked = await request(app).post('/test');
    assert.strictEqual(blocked.statusCode, 429);
    assert.match(blocked.text, /too many login attempts/i);
  });
});

// ============================================================================
// CHALLENGE RATE LIMITER
// ============================================================================
describe('Rate Limiter – Challenge Generation', () => {
  it('blocks after exceeding challenge generation rate', async () => {
    const app = createApp(challengeRateLimit);

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/test');
      assert.strictEqual(res.statusCode, 200);
    }

    const blocked = await request(app).post('/test');
    assert.strictEqual(blocked.statusCode, 429);
  });
});

// ============================================================================
// API RATE LIMITER
// ============================================================================
describe('Rate Limiter – API', () => {
  it('blocks after exceeding API request rate', async () => {
    const app = createApp(api);

    for (let i = 0; i < 60; i++) {
      const res = await request(app).post('/test');
      assert.strictEqual(res.statusCode, 200);
    }

    const blocked = await request(app).post('/test');
    assert.strictEqual(blocked.statusCode, 429);
  });
});
