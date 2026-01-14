/**
 * ROLE MIDDLEWARE TESTS
 * Native node:test + safe model mocking
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');

// -----------------------------------------------------------------------------
// MOCK MODELS
// -----------------------------------------------------------------------------
const mockStudent = { studentId: 'STU1', schoolId: 'SCH1', class: 10, section: 'A' };
const mockTeacher = {
  teacherId: 'TCH1',
  schoolId: 'SCH1',
  status: 'approved',
  classes: [{ class: 10, section: 'A' }]
};
const mockParent = { parentId: 'PAR1', children: ['STU1'] };
const mockChallenge = { challengeId: 'CH1', studentId: 'STU1' };
const mockSchool = {
  schoolId: 'SCH1',
  settings: { analytics: true },
  capacity: { maxStudents: 100 }
};

jestMockModels();

function jestMockModels() {
  const models = require('./models');

  models.Student.findOne = async () => mockStudent;
  models.Student.countDocuments = async () => 10;

  models.Teacher.findOne = async () => mockTeacher;

  models.Parent.findOne = async () => mockParent;

  models.Challenge.findOne = async () => mockChallenge;

  models.School.findOne = async () => mockSchool;
}

// -----------------------------------------------------------------------------
// IMPORT MIDDLEWARE AFTER MOCKING
// -----------------------------------------------------------------------------
const {
  PERMISSIONS,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  canAccessStudent,
  canAccessChallenge,
  isTeacherApproved,
  requireFeature
} = require('./middleware/role.middleware');

// -----------------------------------------------------------------------------
// Helper App Builder
// -----------------------------------------------------------------------------
const appWith = (middleware, user) => {
  const app = express();
  app.use(express.json());

  app.use((req, _, next) => {
    req.user = user;
    next();
  });

  app.get('/test/:studentId?/:challengeId?', middleware, (req, res) => {
    res.status(200).json({ success: true });
  });

  return app;
};

// ============================================================================
// PERMISSION CHECKS
// ============================================================================
describe('Role Middleware – Permissions', () => {

  it('student has own profile permission', () => {
    const user = { userType: 'student' };
    assert.strictEqual(
      hasPermission(user, PERMISSIONS.STUDENT.READ_OWN_PROFILE),
      true
    );
  });

  it('student does not have admin permission', () => {
    const user = { userType: 'student' };
    assert.strictEqual(
      hasPermission(user, PERMISSIONS.ADMIN.MANAGE_SCHOOL),
      false
    );
  });

});

// ============================================================================
// REQUIRE PERMISSION
// ============================================================================
describe('Role Middleware – requirePermission', () => {

  it('allows user with permission', async () => {
    const app = appWith(
      requirePermission(PERMISSIONS.STUDENT.READ_OWN_PROFILE),
      { userType: 'student' }
    );

    const res = await request(app).get('/test');
    assert.strictEqual(res.statusCode, 200);
  });

  it('blocks user without permission', async () => {
    const app = appWith(
      requirePermission(PERMISSIONS.ADMIN.MANAGE_SCHOOL),
      { userType: 'student' }
    );

    const res = await request(app).get('/test');
    assert.strictEqual(res.statusCode, 403);
  });

});

// ============================================================================
// STUDENT ACCESS
// ============================================================================
describe('Role Middleware – canAccessStudent', () => {

  it('admin can access student in same school', async () => {
    const app = appWith(
      canAccessStudent,
      { userType: 'admin', schoolId: 'SCH1' }
    );

    const res = await request(app).get('/test/STU1');
    assert.strictEqual(res.statusCode, 200);
  });

  it('student cannot access another student', async () => {
    const app = appWith(
      canAccessStudent,
      { userType: 'student', userId: 'STU2' }
    );

    const res = await request(app).get('/test/STU1');
    assert.strictEqual(res.statusCode, 403);
  });

});

// ============================================================================
// CHALLENGE ACCESS
// ============================================================================
describe('Role Middleware – canAccessChallenge', () => {

  it('student can access own challenge', async () => {
    const app = appWith(
      canAccessChallenge,
      { userType: 'student', userId: 'STU1' }
    );

    const res = await request(app).get('/test/STU1/CH1');
    assert.strictEqual(res.statusCode, 200);
  });

  it('student cannot access others challenge', async () => {
    const app = appWith(
      canAccessChallenge,
      { userType: 'student', userId: 'STU2' }
    );

    const res = await request(app).get('/test/STU1/CH1');
    assert.strictEqual(res.statusCode, 403);
  });

});

// ============================================================================
// TEACHER APPROVAL
// ============================================================================
describe('Role Middleware – isTeacherApproved', () => {

  it('allows approved teacher', async () => {
    const app = appWith(
      isTeacherApproved,
      { userType: 'teacher', userId: 'TCH1' }
    );

    const res = await request(app).get('/test');
    assert.strictEqual(res.statusCode, 200);
  });

});

// ============================================================================
// FEATURE FLAGS
// ============================================================================
describe('Role Middleware – requireFeature', () => {

  it('allows access when feature enabled', async () => {
    const app = appWith(
      requireFeature('analytics'),
      { userType: 'admin', schoolId: 'SCH1' }
    );

    const res = await request(app).get('/test');
    assert.strictEqual(res.statusCode, 200);
  });

  it('blocks access when feature disabled', async () => {
    mockSchool.settings.analytics = false;

    const app = appWith(
      requireFeature('analytics'),
      { userType: 'admin', schoolId: 'SCH1' }
    );

    const res = await request(app).get('/test');
    assert.strictEqual(res.statusCode, 403);

    // restore
    mockSchool.settings.analytics = true;
  });

});
