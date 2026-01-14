/**
 * AUTH ROUTES – FULL PIPELINE TEST
 * Native Node.js test runner
 * No DB, No Jest, No Supertest
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');

// ============================================================================
// ENV SETUP
// ============================================================================

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// ============================================================================
// MOCK CONTROLLERS
// ============================================================================

require.cache[require.resolve('./controllers/auth.controller')] = {
  exports: {
    signup: (req, res) => res.status(201).json({ success: true, action: 'signup' }),
    login: (req, res) => res.json({ success: true, action: 'login' }),
    refreshToken: (req, res) => res.json({ success: true, action: 'refresh' }),
    verifyEmail: (req, res) => res.json({ success: true, action: 'verify' }),
    resendVerification: (req, res) => res.json({ success: true, action: 'resend' }),
    forgotPassword: (req, res) => res.json({ success: true, action: 'forgot' }),
    resetPassword: (req, res) => res.json({ success: true, action: 'reset' }),
    logout: (req, res) => res.json({ success: true, action: 'logout' }),
    changePassword: (req, res) => res.json({ success: true, action: 'change' }),
    getCurrentUser: (req, res) =>
      res.json({ success: true, user: { id: 'U1', role: 'student' } }),
    updateProfile: (req, res) => res.json({ success: true, action: 'update' })
  }
};

// ============================================================================
// MOCK AUTH MIDDLEWARE
// ============================================================================

require.cache[require.resolve('./middleware/auth.middleware')] = {
  exports: {
    protect: (req, res, next) => {
      req.user = { userId: 'U1', userType: 'student' };
      next();
    }
  }
};

// ============================================================================
// LOAD ROUTES AFTER MOCKS
// ============================================================================

const authRoutes = require('./routes/auth.routes');

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// ============================================================================
// HTTP HELPER
// ============================================================================

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.listen(0, () => {
      const port = server.address().port;

      const data = body ? JSON.stringify(body) : null;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': data ? Buffer.byteLength(data) : 0
          }
        },
        res => {
          let raw = '';
          res.on('data', c => (raw += c));
          res.on('end', () => {
            server.close();
            resolve({
              status: res.statusCode,
              body: raw ? JSON.parse(raw) : {}
            });
          });
        }
      );

      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('Auth Routes – Full Pipeline', () => {

  it('POST /signup', async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'test@test.com',
      password: 'password123',
      userType: 'student'
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.action, 'signup');
  });

  it('POST /login', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'test@test.com',
      password: 'password123',
      userType: 'student'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'login');
  });

  it('POST /refresh-token', async () => {
    const res = await request('POST', '/api/auth/refresh-token');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'refresh');
  });

  it('GET /verify-email/:token', async () => {
    const res = await request('GET', '/api/auth/verify-email/abc123');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'verify');
  });

  it('POST /forgot-password', async () => {
    const res = await request('POST', '/api/auth/forgot-password', {
      email: 'test@test.com'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'forgot');
  });

  it('POST /reset-password/:token', async () => {
    const res = await request('POST', '/api/auth/reset-password/xyz', {
      password: 'newPassword123'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'reset');
  });

  it('POST /logout (protected)', async () => {
    const res = await request('POST', '/api/auth/logout');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'logout');
  });

  it('POST /change-password (protected)', async () => {
    const res = await request('POST', '/api/auth/change-password', {
      currentPassword: 'oldPassword123',
      newPassword: 'NewPassword123' // ✅ valid
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'change');
  });

  it('GET /me (protected)', async () => {
    const res = await request('GET', '/api/auth/me');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.id, 'U1');
  });

  it('PUT /update-profile (protected)', async () => {
    const res = await request('PUT', '/api/auth/update-profile', {
      name: 'Updated Name'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.action, 'update');
  });

});
