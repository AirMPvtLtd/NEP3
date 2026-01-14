/**
 * EMAIL VERIFICATION MODEL TESTS (PERSISTENT DB)
 * Native Node.js test runner (node:test)
 *
 * ⚠️ Database is NOT cleaned after tests.
 * Intended for debugging & inspection.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('node:path');
const crypto = require('crypto');

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

const EmailVerification = require(
  path.join(__dirname, 'models/EmailVerification')
);

// -----------------------------------------------------------------------------
// DATABASE
// -----------------------------------------------------------------------------

const MONGO_URI =
  'mongodb://127.0.0.1:27017/nep_workbench';

before(async () => {
  await mongoose.connect(MONGO_URI);
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function baseArgs(overrides = {}) {
  return {
    email: `user_${Date.now()}@test.com`,
    userType: 'teacher',
    userId: `USR-${crypto.randomBytes(3).toString('hex')}`,
    schoolId: 'SCH-001',
    ip: '127.0.0.1',
    userAgent: 'node-test',
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// TEST SUITE
// -----------------------------------------------------------------------------

describe('EmailVerification Model (Persistent DB)', () => {

  // ---------------------------------------------------------------------------
  // TOKEN CREATION
  // ---------------------------------------------------------------------------

  it('creates a verification token (hashed in DB)', async () => {
    const args = baseArgs();

    const token = await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId,
      {
        schoolId: args.schoolId,
        ip: args.ip,
        userAgent: args.userAgent
      }
    );

    assert.ok(token);
    assert.equal(token.length, 64);

    const hashed = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const record = await EmailVerification.findOne({ token: hashed });
    assert.ok(record);
    assert.equal(record.email, args.email.toLowerCase());
    assert.equal(record.status, 'pending');
    assert.equal(record.verified, false);
  });

  // ---------------------------------------------------------------------------
  // TOKEN VERIFICATION
  // ---------------------------------------------------------------------------

  it('verifies a valid token successfully', async () => {
    const args = baseArgs();

    const token = await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    const result = await EmailVerification.verifyToken(token, {
      ip: '127.0.0.1'
    });

    assert.equal(result.success, true);
    assert.equal(result.verification.verified, true);
    assert.equal(result.verification.status, 'verified');
    assert.ok(result.verification.verifiedAt);
  });

  it('rejects already verified token', async () => {
    const args = baseArgs();

    const token = await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    await EmailVerification.verifyToken(token);
    const second = await EmailVerification.verifyToken(token);

    assert.equal(second.error, 'already_verified');
  });

  it('rejects invalid token', async () => {
    const result = await EmailVerification.verifyToken(
      crypto.randomBytes(32).toString('hex')
    );

    assert.equal(result.error, 'invalid_token');
  });

  // ---------------------------------------------------------------------------
  // ATTEMPT LIMITS
  // ---------------------------------------------------------------------------

  it('revokes token after max attempts exceeded', async () => {
    const args = baseArgs();

    const token = await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    // Force attempts
    for (let i = 0; i < 6; i++) {
      await EmailVerification.verifyToken(token);
    }

    const status = await EmailVerification.getStatus(args.userId);

    assert.equal(status.status, 'revoked');
    assert.equal(status.attempts >= status.maxAttempts, true);
  });

  // ---------------------------------------------------------------------------
  // EMAIL VERIFICATION CHECK
  // ---------------------------------------------------------------------------

  it('detects verified email correctly', async () => {
    const args = baseArgs();

    const token = await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    await EmailVerification.verifyToken(token);

    const verified = await EmailVerification.isEmailVerified(
      args.email,
      args.userType
    );

    assert.equal(verified, true);
  });

  // ---------------------------------------------------------------------------
  // STATUS QUERY
  // ---------------------------------------------------------------------------

  it('returns correct verification status', async () => {
    const args = baseArgs();

    await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    const status = await EmailVerification.getStatus(args.userId);

    assert.equal(status.exists, true);
    assert.equal(status.verified, false);
    assert.equal(status.status, 'pending');
    assert.equal(status.isExpired, false);
  });

  // ---------------------------------------------------------------------------
  // RESEND LOGIC
  // ---------------------------------------------------------------------------

  it('resends token and tracks resend count', async () => {
    const args = baseArgs();

    await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    const token = await EmailVerification.resendToken(
      args.email,
      args.userType,
      args.userId
    );

    assert.ok(token);

    const record = await EmailVerification.findOne({
      email: args.email
    }).sort({ createdAt: -1 });

    assert.ok(record.resendCount >= 1);
    assert.ok(record.lastResendAt);
  });

  // ---------------------------------------------------------------------------
  // REVOCATION
  // ---------------------------------------------------------------------------

  it('revokes verification token manually', async () => {
    const args = baseArgs();

    await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    const revoked = await EmailVerification.revokeToken(
      args.userId,
      'admin',
      'manual_revocation'
    );

    assert.ok(revoked);
    assert.equal(revoked.status, 'revoked');
    assert.equal(revoked.revocationReason, 'manual_revocation');
  });

  // ---------------------------------------------------------------------------
  // INSTANCE METHODS & VIRTUALS
  // ---------------------------------------------------------------------------

  it('computes validity, expiry, and resend virtuals', async () => {
    const args = baseArgs();

    await EmailVerification.createToken(
      args.email,
      args.userType,
      args.userId
    );

    const record = await EmailVerification.findOne({ userId: args.userId });

    assert.equal(record.isExpired(), false);
    assert.equal(record.isValid(), true);
    assert.ok(record.getRemainingAttempts() > 0);
    assert.ok(record.expiresInMinutes > 0);
    assert.equal(record.isActive, true);
    assert.equal(typeof record.canResend, 'boolean');
  });

  // ---------------------------------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------------------------------

  it('returns global verification statistics', async () => {
    const stats = await EmailVerification.getStats();

    assert.ok(stats.total >= 1);
    assert.ok(stats.verificationRate >= 0);
  });

});
