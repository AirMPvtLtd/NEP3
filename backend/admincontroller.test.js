/**
 * ADMIN CONTROLLER TEST – FIXED & STABLE
 * Uses Node.js native test runner
 * No external dependencies
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// ============================================================================
// MONGOOSE-LIKE QUERY MOCK
// ============================================================================

function createQueryMock(result) {
  return {
    sort() { return this; },
    skip() { return this; },
    limit() { return Promise.resolve(result); }
  };
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockSchool = {
  _id: 'schoolObjectId',
  schoolId: 'SCH001',
  settings: {},
  toJSON() { return this; },
  canAddTeacher: () => true,
  canAddStudent: () => true,
  incrementTeacherCount: async () => {},
  decrementTeacherCount: async () => {},
  incrementStudentCount: async () => {},
  decrementStudentCount: async () => {},
  save: async function () { return this; }
};

const mockTeacher = {
  teacherId: 'T001',
  name: 'Teacher One',
  schoolId: 'SCH001',
  status: 'PENDING',
  active: true,
  approve: async () => {},
  reject: async () => {},
  suspend: async () => {},
  reactivate: async () => {}
};

const mockStudent = {
  studentId: 'S001',
  name: 'Student One',
  schoolId: 'SCH001',
  class: 10,
  section: 'A'
};

// ============================================================================
// MOCK MODELS (CRITICAL FIX)
// ============================================================================

require.cache[require.resolve('./models')] = {
  exports: {
    School: {
      findById: async () => mockSchool,
      findByIdAndUpdate: async () => mockSchool
    },

    Teacher: {
      countDocuments: async () => 2,
      find: () => createQueryMock([mockTeacher]),
      findOne: async () => mockTeacher,
      findByEmail: async () => null,
      getPendingForSchool: async () => [mockTeacher],
      create: async data => ({ ...data, teacherId: 'TNEW' })
    },

    Student: {
      countDocuments: async () => 5,
      find: () => createQueryMock([mockStudent]),
      getByClass: async () => [mockStudent],
      create: async data => data
    },

    ClassSection: {
      countDocuments: async () => 3,
      getBySchool: async () => [],
      create: async data => data
    },

    Challenge: {
      countDocuments: async () => 7,
      getSchoolStatistics: async () => ({
        totalChallenges: 7,
        averageScore: 75,
        passRate: 80
      })
    },

    InstitutionalReport: {
      find: () => createQueryMock([]),
      create: async data => data
    },

    NEPReport: {},

    Activity: {
      log: async () => {},
      getStatistics: async () => ({}),
      getDailyCount: async () => [],
      getSchoolActivities: async () => [],
      getFailedActivities: async () => []
    }
  }
};

// ============================================================================
// IMPORT CONTROLLER AFTER MOCKS
// ============================================================================

const adminController = require('./controllers/admin.controller');

// ============================================================================
// REQUEST / RESPONSE MOCKS
// ============================================================================

function mockReq(overrides = {}) {
  return {
    user: {
      userId: 'schoolObjectId',
      userType: 'admin',
      schoolId: 'SCH001'
    },
    body: {},
    params: {},
    query: {},
    ip: '127.0.0.1',
    ...overrides
  };
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Admin Controller – Core', () => {

  it('gets school details', async () => {
    const req = mockReq();
    const res = mockRes();

    await adminController.getSchool(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.school);
  });

  it('updates school details', async () => {
    const req = mockReq({
      body: { schoolName: 'Updated School' }
    });
    const res = mockRes();

    await adminController.updateSchool(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('gets all teachers', async () => {
    const req = mockReq({
      query: {}
    });
    const res = mockRes();

    await adminController.getAllTeachers(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.teachers));
  });

  it('adds a teacher', async () => {
    const req = mockReq({
      body: {
        name: 'New Teacher',
        email: 'teacher@test.com'
      }
    });
    const res = mockRes();

    await adminController.addTeacher(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
  });

  it('approves teacher', async () => {
    const req = mockReq({
      params: { teacherId: 'T001' }
    });
    const res = mockRes();

    await adminController.approveTeacher(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('gets students by class', async () => {
    const req = mockReq({
      params: { class: '10', section: 'A' }
    });
    const res = mockRes();

    await adminController.getStudentsByClass(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.students));
  });

});
