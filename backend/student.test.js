/**
 * STUDENT MODEL TESTS (PERSISTENT DB)
 * Native Node.js test runner (node:test)
 *
 * ⚠️ Database is NOT cleaned after tests.
 * Intended for inspection & debugging.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const path = require('node:path');

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

const Student = require(path.join(__dirname, 'models/Student'));
const {
  CLASS_LEVELS,
  NEP_COMPETENCIES
} = require(path.join(__dirname, 'config/constants'));

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

function baseStudent(overrides = {}) {
  return {
    schoolId: 'SCH-001',
    teacherId: 'TCH-001',
    name: 'Test Student',
    class: CLASS_LEVELS[0],
    section: 'A',
    rollNumber: Math.floor(Math.random() * 1000) + 1,
    password: 'StrongPass123',
    parentEmail: `parent_${Date.now()}@test.com`,
    parentPassword: 'ParentPass123',
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// TEST SUITE
// -----------------------------------------------------------------------------

describe('Student Model (Persistent DB)', () => {

  // ---------------------------------------------------------------------------
  // CREATION & DEFAULTS
  // ---------------------------------------------------------------------------

  it('creates student with defaults', async () => {
    const student = await Student.create(baseStudent());

    assert.ok(student.studentId.startsWith('STU-'));
    assert.equal(student.active, true);
    assert.equal(student.performanceIndex, 0);
    assert.equal(student.stats.dailyStreak, 0);
  });

  it('enforces unique roll number per class-section', async () => {
    const data = baseStudent({ rollNumber: 10 });

    await Student.create(data);

    await assert.rejects(
      () => Student.create(data),
      /duplicate key/
    );
  });

  // ---------------------------------------------------------------------------
  // PASSWORD & SECURITY
  // ---------------------------------------------------------------------------

  it('hashes student password', async () => {
    const student = await Student.create(baseStudent());
    assert.notEqual(student.password, 'StrongPass123');
  });

  it('hashes parent password', async () => {
    const student = await Student.create(baseStudent());
    assert.ok(student.parentPassword);
    assert.notEqual(student.parentPassword, 'ParentPass123');
  });

  it('compares passwords correctly', async () => {
    const student = await Student.create(baseStudent());

    const found = await Student
      .findById(student._id)
      .select('+password +parentPassword');

    assert.equal(await found.comparePassword('StrongPass123'), true);
    assert.equal(await found.comparePassword('Wrong'), false);

    assert.equal(await found.compareParentPassword('ParentPass123'), true);
    assert.equal(await found.compareParentPassword('Wrong'), false);
  });

  // ---------------------------------------------------------------------------
  // LOGIN ATTEMPTS
  // ---------------------------------------------------------------------------

  it('increments and resets login attempts', async () => {
    const student = await Student.create(baseStudent());

    await student.incLoginAttempts();
    let updated = await Student.findById(student._id);
    assert.equal(updated.loginAttempts, 1);

    await updated.resetLoginAttempts();
    updated = await Student.findById(student._id);

    assert.equal(updated.loginAttempts, 0);
    assert.equal(updated.lockUntil, undefined);
  });

  // ---------------------------------------------------------------------------
  // VIRTUALS
  // ---------------------------------------------------------------------------

  it('computes grade correctly', async () => {
    const student = await Student.create(
      baseStudent({ performanceIndex: 85 })
    );

    assert.equal(student.grade, 'A');
  });

  // ---------------------------------------------------------------------------
  // NEP COMPETENCY LOGIC
  // ---------------------------------------------------------------------------

  it('updates competency with smoothing and detects weak/strong', async () => {
    const student = await Student.create(baseStudent());

    const competency = NEP_COMPETENCIES[0];

    await student.updateCompetency(competency, 100);
    const updated = await Student.findById(student._id);

    assert.ok(updated.competencyScores[competency] > 0);
    assert.equal(updated.weakCompetencies.length, 3);
    assert.equal(updated.strongCompetencies.length, 3);
  });

  // ---------------------------------------------------------------------------
  // CHALLENGE HISTORY
  // ---------------------------------------------------------------------------

  it('adds challenge results and maintains rolling average', async () => {
    const student = await Student.create(baseStudent());

    await student.addChallengeResult('CH-1', 80, 'SIM-A');
    await student.addChallengeResult('CH-2', 100, 'SIM-A');

    const updated = await Student.findById(student._id);

    assert.equal(updated.stats.totalChallengesCompleted, 2);
    assert.equal(updated.stats.averageChallengeScore, 90);
    assert.equal(updated.recentChallenges.length, 2);
  });

  // ---------------------------------------------------------------------------
  // STREAK LOGIC
  // ---------------------------------------------------------------------------

  it('updates daily streak correctly', async () => {
    const student = await Student.create(baseStudent());

    await student.updateStreak();
    let updated = await Student.findById(student._id);
    assert.equal(updated.stats.dailyStreak, 1);

    await updated.updateStreak();
    updated = await Student.findById(student._id);
    assert.equal(updated.stats.dailyStreak >= 1, true);
  });

  // ---------------------------------------------------------------------------
  // CHALLENGE LIMITS
  // ---------------------------------------------------------------------------

  it('enforces daily and simulation challenge limits', async () => {
    const student = await Student.create(baseStudent());

    let check = student.canGenerateChallenge('SIM-A', 2, 1);
    assert.equal(check.allowed, true);

    await student.recordChallengeGeneration('SIM-A');
    student.challengeLimits.totalToday = 2;

    check = student.canGenerateChallenge('SIM-A', 2, 1);
    assert.equal(check.allowed, false);
    assert.equal(check.reason, 'daily_limit');
  });

  // ---------------------------------------------------------------------------
  // STATIC METHODS
  // ---------------------------------------------------------------------------

  it('finds student by studentId', async () => {
    const student = await Student.create(baseStudent());

    const found = await Student.findByStudentId(student.studentId);
    assert.equal(found.id, student.id);
  });

  it('gets students by teacher', async () => {
    await Student.create(baseStudent({ teacherId: 'TCH-X' }));
    const list = await Student.getByTeacher('TCH-X');

    assert.ok(list.length >= 1);
  });

  it('gets top performers', async () => {
    await Student.create(baseStudent({ performanceIndex: 95 }));
    const list = await Student.getTopPerformers('SCH-001', 1);

    assert.equal(list.length, 1);
  });

});
