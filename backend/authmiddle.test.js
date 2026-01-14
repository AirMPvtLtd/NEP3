/**
 * AUTH MIDDLEWARE TESTS (ENV-AWARE)
 * Native node:test + express + supertest
 *
 * ✔ Uses existing .env (test)
 * ✔ No Jest
 * ✔ No env override
 */

require('dotenv').config(); // <-- IMPORTANT

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// -----------------------------------------------------------------------------
// IMPORT MIDDLEWARE (REAL FILE)
// -----------------------------------------------------------------------------

const {
  protect,
  optionalAuth,
  authorize,
  isStudent,
  isTeacher,
  isAdmin,
  verifyRefreshToken,
  checkSchoolAccess,
  rateLimit
} = require('./middleware/auth.middleware');

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function signToken(payload, refresh = false) {
  return jwt.sign(
    payload,
    refresh
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function buildApp(middleware, handler = (req, res) => {
  res.json({ ok: true, user: req.user || null });
}) {
  const app = express();
  app.use(express.json());

  if (Array.isArray(middleware)) {
    app.get('/test', ...middleware, handler);
  } else {
    app.get('/test', middleware, handler);
  }

  app.post('/refresh', middleware, handler);
  return app;
}

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe('Auth Middleware (ENV-based)', () => {

  // ---------------------------------------------------------------------------
  // PROTECT
  // ---------------------------------------------------------------------------

  it('blocks request without Authorization header', async () => {
    const app = buildApp(protect);

    const res = await request(app).get('/test');
    assert.equal(res.status, 401);
  });

  it('allows request with valid JWT', async () => {
    const token = signToken({
      userId: 'USR-1',
      role: 'student',
      schoolId: 'SCH-1',
      email: 'student@test.com'
    });

    const app = buildApp(protect);

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'student');
  });

  it('rejects malformed token', async () => {
    const app = buildApp(protect);

    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer invalid.token.value');

    assert.equal(res.status, 401);
  });

  // ---------------------------------------------------------------------------
  // OPTIONAL AUTH
  // ---------------------------------------------------------------------------

  it('optionalAuth allows request without token', async () => {
    const app = buildApp(optionalAuth);

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
    assert.equal(res.body.user, null);
  });

  // ---------------------------------------------------------------------------
  // ROLE CHECKS
  // ---------------------------------------------------------------------------

  it('allows student for isStudent', async () => {
    const token = signToken({ userId: '1', role: 'student' });
    const app = buildApp([protect, isStudent]);

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
  });

  it('blocks non-student for isStudent', async () => {
    const token = signToken({ userId: '1', role: 'teacher' });
    const app = buildApp([protect, isStudent]);

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 403);
  });

  it('authorize() allows admin role', async () => {
    const token = signToken({ userId: '1', role: 'admin' });
    const app = buildApp([protect, authorize('admin')]);

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
  });

  // ---------------------------------------------------------------------------
  // REFRESH TOKEN
  // ---------------------------------------------------------------------------

  it('verifies refresh token correctly', async () => {
    const refreshToken = signToken(
      { userId: 'USR-1', role: 'student' },
      true
    );

    const app = buildApp(verifyRefreshToken);

    const res = await request(app)
      .post('/refresh')
      .send({ refreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.userId, 'USR-1');
  });

  // ---------------------------------------------------------------------------
  // SCHOOL ACCESS
  // ---------------------------------------------------------------------------

  it('blocks cross-school access', async () => {
    const token = signToken({
      userId: 'USR-1',
      role: 'teacher',
      schoolId: 'SCH-1'
    });

    const app = buildApp([protect, checkSchoolAccess('schoolId')]);

    const res = await request(app)
      .get('/test?schoolId=SCH-2')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 403);
  });

  // ---------------------------------------------------------------------------
  // RATE LIMIT
  // ---------------------------------------------------------------------------

  it('rate limits after max requests', async () => {
    const app = buildApp(rateLimit(2, 1000));

    await request(app).get('/test');
    await request(app).get('/test');

    const res = await request(app).get('/test');
    assert.equal(res.status, 429);
  });

});
