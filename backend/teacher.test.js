/**
 * TEACHER MODEL TESTS (PERSISTENT DB)
 * Native Node.js test runner (node:test)
 *
 * WARNING:
 * Database is NOT cleaned after test completion.
 * Intended ONLY for debugging / inspection.
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('node:path');

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

const Teacher = require(path.join(__dirname, 'models/Teacher'));
const { USER_STATUS, SUBJECTS } = require(path.join(__dirname, 'config/constants'));

// -----------------------------------------------------------------------------
// DATABASE CONFIG (PERSISTENT)
// -----------------------------------------------------------------------------

const MONGO_URI = 'mongodb://127.0.0.1:27017/nep_workbench';

// -----------------------------------------------------------------------------
// DATABASE SETUP
// -----------------------------------------------------------------------------

before(async () => {
  await mongoose.connect(MONGO_URI);
});

// ❌ NO after() CLEANUP — DATA WILL REMAIN

beforeEach(async () => {
  // Prevent duplicate email conflicts across runs
  await Teacher.deleteMany({ email: /@test\.com$/ });
});

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function baseTeacher(overrides = {}) {
  return {
    schoolId: 'SCH-001',
    name: 'Test Teacher',
    email: `teacher_${Date.now()}@test.com`,
    password: 'StrongPass123',
    subjects: [SUBJECTS[0]],
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// TEST SUITE
// -----------------------------------------------------------------------------

describe('Teacher Model (Persistent DB)', () => {

  it('creates a teacher with defaults', async () => {
    const teacher = await Teacher.create(baseTeacher());

    assert.ok(teacher.teacherId.startsWith('TCH-'));
    assert.equal(teacher.status, USER_STATUS.PENDING);
    assert.equal(teacher.active, true);
  });

  it('hashes password before save', async () => {
    const teacher = await Teacher.create(baseTeacher());
    assert.notEqual(teacher.password, 'StrongPass123');
  });

  it('compares password correctly', async () => {
    const teacher = await Teacher.create(baseTeacher());

    const found = await Teacher
      .findById(teacher._id)
      .select('+password');

    assert.equal(await found.comparePassword('StrongPass123'), true);
    assert.equal(await found.comparePassword('WrongPass'), false);
  });

  it('approves and rejects teacher correctly', async () => {
    const teacher = await Teacher.create(baseTeacher());

    await teacher.approve('SCH-001');
    let updated = await Teacher.findById(teacher._id);
    assert.equal(updated.status, USER_STATUS.APPROVED);

    await updated.reject('Invalid docs');
    updated = await Teacher.findById(teacher._id);
    assert.equal(updated.status, USER_STATUS.REJECTED);
  });

  it('adds and removes classes', async () => {
    const teacher = await Teacher.create(baseTeacher());

    await teacher.addClass(10, 'A');
    await teacher.addClass(10, 'B');

    let updated = await Teacher.findById(teacher._id);
    assert.deepEqual(updated.classesTaught[0].sections.sort(), ['A', 'B']);

    await updated.removeClass(10, 'A');
    updated = await Teacher.findById(teacher._id);
    assert.deepEqual(updated.classesTaught[0].sections, ['B']);
  });

  it('increments statistics', async () => {
    const teacher = await Teacher.create(baseTeacher());

    await teacher.incrementStudentCount();
    await teacher.incrementChallengeCount();

    const updated = await Teacher.findById(teacher._id);
    assert.equal(updated.stats.totalStudents, 1);
    assert.equal(updated.stats.totalChallengesCreated, 1);
  });

  it('finds by email and teacherId', async () => {
    const teacher = await Teacher.create(baseTeacher());

    const byEmail = await Teacher.findByEmail(teacher.email);
    const byId = await Teacher.findByTeacherId(teacher.teacherId);

    assert.equal(byEmail.id, teacher.id);
    assert.equal(byId.id, teacher.id);
  });

  it('computes school statistics', async () => {
    const t1 = await Teacher.create(baseTeacher());
    const t2 = await Teacher.create(baseTeacher());

    await t2.approve('SCH-001');

    const stats = await Teacher.getSchoolStatistics('SCH-001');

    assert.ok(stats.total >= 2);
    assert.ok(stats.approved >= 1);
  });

});
