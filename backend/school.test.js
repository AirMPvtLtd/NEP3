/**
 * SCHOOL MODEL TESTS (PERSISTENT DB)
 * Native Node.js test runner (node:test)
 *
 * ⚠️ Database is NOT cleaned after tests.
 * Intended for debugging & inspection.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('node:path');

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

const School = require(path.join(__dirname, 'models/School'));

// -----------------------------------------------------------------------------
// DATABASE
// -----------------------------------------------------------------------------

const MONGO_URI = 'mongodb://127.0.0.1:27017/nep_workbench';

before(async () => {
  await mongoose.connect(MONGO_URI);
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function baseSchool(overrides = {}) {
  return {
    schoolName: 'Test Public School',
    schoolAddress: '123 Test Street',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    phone: '+919999999999',
    adminName: 'Admin User',
    adminEmail: `admin_${Date.now()}@school.com`,
    adminPassword: 'StrongAdminPass123',
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// TEST SUITE
// -----------------------------------------------------------------------------

describe('School Model (Persistent DB)', () => {

  // ---------------------------------------------------------------------------
  // CREATION & DEFAULTS
  // ---------------------------------------------------------------------------

  it('creates a school with defaults', async () => {
    const school = await School.create(baseSchool());

    assert.ok(school.schoolId.startsWith('SCH-'));
    assert.equal(school.active, true);
    assert.equal(school.verified, false);
    assert.equal(school.subscriptionPlan, 'free');
    assert.equal(school.stats.totalTeachers, 0);
  });

  it('enforces unique admin email', async () => {
    const data = baseSchool({ adminEmail: 'unique@school.com' });

    await School.create(data);

    await assert.rejects(
      () => School.create(data),
      /duplicate key/
    );
  });

  it('requires mandatory fields', async () => {
    await assert.rejects(
      () => School.create({ schoolName: 'Only Name' }),
      /School address is required/
    );
  });

  // ---------------------------------------------------------------------------
  // PASSWORD & SECURITY
  // ---------------------------------------------------------------------------

  it('hashes admin password before save', async () => {
    const school = await School.create(baseSchool());
    assert.notEqual(school.adminPassword, 'StrongAdminPass123');
  });

  it('compares admin password correctly', async () => {
    const school = await School.create(baseSchool());

    const found = await School
      .findById(school._id)
      .select('+adminPassword');

    assert.equal(await found.comparePassword('StrongAdminPass123'), true);
    assert.equal(await found.comparePassword('WrongPass'), false);
  });

  it('updates passwordChangedAt on password change', async () => {
    const school = await School.create(baseSchool());

    const found = await School.findById(school._id).select('+adminPassword');
    found.adminPassword = 'NewStrongPass123';
    await found.save();

    assert.ok(found.passwordChangedAt);
  });

  // ---------------------------------------------------------------------------
  // LOGIN ATTEMPTS
  // ---------------------------------------------------------------------------

  it('increments and resets login attempts', async () => {
    const school = await School.create(baseSchool());

    await school.incLoginAttempts();
    let updated = await School.findById(school._id);
    assert.equal(updated.loginAttempts, 1);

    await updated.resetLoginAttempts();
    updated = await School.findById(school._id);

    assert.equal(updated.loginAttempts, 0);
    assert.equal(updated.lockUntil, undefined);
  });

  // ---------------------------------------------------------------------------
  // SUBSCRIPTION & LIMITS
  // ---------------------------------------------------------------------------

  it('checks active subscription correctly', async () => {
    const school = await School.create(
      baseSchool({ subscriptionEndDate: new Date(Date.now() + 86400000) })
    );

    assert.equal(school.hasActiveSubscription(), true);
  });

  it('enforces teacher and student limits', async () => {
    const school = await School.create(baseSchool());

    assert.equal(school.canAddTeacher(), true);
    assert.equal(school.canAddStudent(), true);
  });

  // ---------------------------------------------------------------------------
  // STATS INCREMENTS
  // ---------------------------------------------------------------------------

  it('increments and decrements teacher/student counts', async () => {
    const school = await School.create(baseSchool());

    await school.incrementTeacherCount();
    await school.incrementStudentCount();

    let updated = await School.findById(school._id);
    assert.equal(updated.stats.totalTeachers, 1);
    assert.equal(updated.stats.totalStudents, 1);

    await updated.decrementTeacherCount();
    await updated.decrementStudentCount();

    updated = await School.findById(school._id);
    assert.equal(updated.stats.totalTeachers, 0);
    assert.equal(updated.stats.totalStudents, 0);
  });

  it('increments challenge count', async () => {
    const school = await School.create(baseSchool());

    await school.incrementChallengeCount();
    const updated = await School.findById(school._id);

    assert.equal(updated.stats.totalChallenges, 1);
  });

  // ---------------------------------------------------------------------------
  // TOKENS
  // ---------------------------------------------------------------------------

  it('generates verification token', async () => {
    const school = await School.create(baseSchool());

    const token = school.generateVerificationToken();
    await school.save();

    assert.ok(token);
    assert.ok(school.verificationToken);
    assert.ok(school.verificationTokenExpiry);
  });

  it('generates password reset token', async () => {
    const school = await School.create(baseSchool());

    const token = school.generatePasswordResetToken();
    await school.save();

    assert.ok(token);
    assert.ok(school.passwordResetToken);
    assert.ok(school.passwordResetExpiry);
  });

  // ---------------------------------------------------------------------------
  // STATIC METHODS
  // ---------------------------------------------------------------------------

  it('finds school by email and schoolId', async () => {
    const school = await School.create(baseSchool());

    const byEmail = await School.findByEmail(school.adminEmail);
    const byId = await School.findBySchoolId(school.schoolId);

    assert.equal(byEmail.id, school.id);
    assert.equal(byId.id, school.id);
  });

  it('returns active verified schools', async () => {
    const school = await School.create(
      baseSchool({ verified: true })
    );

    const list = await School.getActiveSchools();
    assert.ok(list.some(s => s.id === school.id));
  });

  it('computes global school statistics', async () => {
    await School.create(baseSchool());
    const stats = await School.getStatistics();

    assert.ok(stats.totalSchools >= 1);
  });

});
