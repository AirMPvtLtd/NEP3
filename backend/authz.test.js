/**
 * AUTHORIZATION MIDDLEWARE TESTS
 * Native node:test + express + supertest
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

// -----------------------------------------------------------------------------
// MOCK MODELS (MANUAL STUBS)
// -----------------------------------------------------------------------------

const mockModels = {
  Student: {
    findOne: async ({ studentId }) => ({
      studentId,
      schoolId: 'SCH-1',
      class: 10,
      section: 'A'
    })
  },
  Teacher: {
    findOne: async ({ teacherId }) => ({
      teacherId,
      schoolId: 'SCH-1',
      classes: [{ class: 10, section: 'A' }]
    })
  },
  Parent: {
    findOne: async () => ({
      children: ['STU-1']
    })
  },
  School: {
    findOne: async ({ schoolId }) => ({ schoolId })
  },
  Challenge: {
    findOne: async ({ challengeId }) => ({
      challengeId,
      studentId: 'STU-1',
      status: 'submitted'
    })
  },
  NEPReport: {
    findOne: async ({ reportId }) => ({
      reportId,
      studentId: 'STU-1',
      schoolId: 'SCH-1'
    })
  },
  InstitutionalReport: {
    findOne: async ({ reportId }) => ({
      reportId,
      schoolId: 'SCH-1'
    })
  },
  HelpTicket: {
    findOne: async ({ ticketId }) => ({
      ticketId,
      studentId: 'STU-1',
      schoolId: 'SCH-1'
    })
  }
};

// Inject mocks
require.cache[require.resolve('./models')] = {
  exports: mockModels
};

// -----------------------------------------------------------------------------
// IMPORT MIDDLEWARE
// -----------------------------------------------------------------------------

const {
  canAccessStudentResource,
  canAccessChallenge,
  canModifyChallenge,
  canEvaluateChallenge,
  canAccessNEPReport,
  canAccessInstitutionalReport,
  canAccessHelpTicket,
  canModifyHelpTicket,
  canAccessClass,
  canModifySchool,
  canAccessTeacherResource,
  canPerformBatchOperation,
  canExportData,
  canAccessAnalytics
} = require('./middleware/authorization.middleware');

// -----------------------------------------------------------------------------
// HELPER
// -----------------------------------------------------------------------------

function buildApp(middleware, user, params = {}) {
  const app = express();
  app.use(express.json());

  app.use((req, _res, next) => {
    req.user = user;
    req.params = params;
    next();
  });

  app.get('/test', middleware, (req, res) => {
    res.json({ success: true });
  });

  return app;
}

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe('Authorization Middleware', () => {

  it('admin can access student resource', async () => {
    const app = buildApp(
      canAccessStudentResource,
      { userType: 'admin', schoolId: 'SCH-1' },
      { studentId: 'STU-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

  it('student cannot access other student resource', async () => {
    const app = buildApp(
      canAccessStudentResource,
      { userType: 'student', userId: 'STU-2' },
      { studentId: 'STU-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 403);
  });

  it('teacher can access challenge of their student', async () => {
    const app = buildApp(
      canAccessChallenge,
      { userType: 'teacher', userId: 'TCH-1', schoolId: 'SCH-1' },
      { challengeId: 'CH-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

  it('student cannot modify submitted challenge', async () => {
    const app = buildApp(
      canModifyChallenge,
      { userType: 'student', userId: 'STU-1' },
      { challengeId: 'CH-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 403);
  });

  it('teacher can evaluate submitted challenge', async () => {
    const app = buildApp(
      canEvaluateChallenge,
      { userType: 'teacher', schoolId: 'SCH-1' },
      { challengeId: 'CH-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

  it('parent can access child NEP report', async () => {
    const app = buildApp(
      canAccessNEPReport,
      { userType: 'parent', userId: 'PAR-1' },
      { reportId: 'REP-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

  it('teacher can access institutional report', async () => {
    const app = buildApp(
      canAccessInstitutionalReport,
      { userType: 'teacher', schoolId: 'SCH-1' },
      { reportId: 'INST-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

  it('student cannot access institutional report', async () => {
    const app = buildApp(
      canAccessInstitutionalReport,
      { userType: 'student' },
      { reportId: 'INST-1' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 403);
  });

  it('teacher can perform batch operation', async () => {
    const app = buildApp(
      canPerformBatchOperation,
      { userType: 'teacher' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

  it('student cannot export data', async () => {
    const app = buildApp(
      canExportData,
      { userType: 'student' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 403);
  });

  it('admin can access analytics', async () => {
    const app = buildApp(
      canAccessAnalytics,
      { userType: 'admin', schoolId: 'SCH-1' },
      { scope: 'school' }
    );

    const res = await request(app).get('/test');
    assert.equal(res.status, 200);
  });

}); // ✅ THIS CLOSING WAS MISSING
