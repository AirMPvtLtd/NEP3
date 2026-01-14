/**
 * VALIDATION MIDDLEWARE TESTS – FINAL FIXED VERSION
 * Node.js native test runner
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  validateRegistration,
  validateLogin,
  validateStudentCreation,
  validateChallengeGeneration,
  validateChallengeSubmission,
  validateScoreOverride,
  validateHelpTicket,
  validatePagination,
  validateDateRange,
  validateId
} = require('./middleware/validation.middleware');

// -----------------------------------------------------------------------------
// Helper to run middleware
// -----------------------------------------------------------------------------
const runMiddleware = (middleware, reqData = {}) => {
  return new Promise((resolve) => {
    const req = {
      body: {},
      params: {},
      query: {},
      ...reqData
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve(this);
      }
    };

    middleware(req, res, () => resolve(res));
  });
};

// ============================================================================
// AUTH VALIDATION
// ============================================================================
describe('Validation Middleware – Auth', () => {

  it('rejects registration without email', async () => {
    const res = await runMiddleware(validateRegistration, {
      body: {
        password: 'Password123',
        userType: 'student'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid student registration', async () => {
    const res = await runMiddleware(validateRegistration, {
      body: {
        email: 'student@test.com',
        password: 'Password123',
        userType: 'student'
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });

  it('rejects login without password', async () => {
    const res = await runMiddleware(validateLogin, {
      body: {
        email: 'test@test.com',
        userType: 'student'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid login', async () => {
    const res = await runMiddleware(validateLogin, {
      body: {
        email: 'test@test.com',
        password: 'Password123',
        userType: 'student'
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });
});

// ============================================================================
// STUDENT VALIDATION
// ============================================================================
describe('Validation Middleware – Student', () => {

  it('rejects invalid class number', async () => {
    const res = await runMiddleware(validateStudentCreation, {
      body: {
        name: 'Test Student',
        class: 15
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid student creation', async () => {
    const res = await runMiddleware(validateStudentCreation, {
      body: {
        name: 'Test Student',
        class: 8,
        section: 'a'
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });
});

// ============================================================================
// CHALLENGE VALIDATION
// ============================================================================
describe('Validation Middleware – Challenge', () => {

  it('rejects challenge generation without simulationType', async () => {
    const res = await runMiddleware(validateChallengeGeneration, {
      body: {
        difficulty: 'easy'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid challenge generation', async () => {
    const res = await runMiddleware(validateChallengeGeneration, {
      body: {
        simulationType: 'physics', // MUST exist in config/constants.js
        difficulty: 'easy'
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });

  it('rejects empty challenge submission', async () => {
    const res = await runMiddleware(validateChallengeSubmission, {
      body: {
        answers: []
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid challenge submission', async () => {
    const res = await runMiddleware(validateChallengeSubmission, {
      body: {
        answers: [
          { questionId: 'Q1', answer: '42' }
        ]
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });
});

// ============================================================================
// SCORE OVERRIDE
// ============================================================================
describe('Validation Middleware – Score Override', () => {

  it('rejects invalid score', async () => {
    const res = await runMiddleware(validateScoreOverride, {
      body: {
        score: 150,
        reason: 'invalid'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid score override', async () => {
    const res = await runMiddleware(validateScoreOverride, {
      body: {
        score: 85,
        reason: 'Manual correction due to rubric mismatch'
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });
});

// ============================================================================
// HELP TICKETS
// ============================================================================
describe('Validation Middleware – Help Tickets', () => {

  it('rejects short ticket subject', async () => {
    const res = await runMiddleware(validateHelpTicket, {
      body: {
        subject: 'Hi',
        description: 'This description is long enough'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('accepts valid help ticket', async () => {
    const res = await runMiddleware(validateHelpTicket, {
      body: {
        subject: 'Assessment issue',
        description: 'There is a discrepancy in the evaluation results.'
      }
    });

    assert.strictEqual(res.statusCode, 200);
  });
});

// ============================================================================
// COMMON VALIDATION
// ============================================================================
describe('Validation Middleware – Common', () => {

  it('validates pagination defaults', async () => {
    const res = await runMiddleware(validatePagination, {
      query: {}
    });

    assert.strictEqual(res.statusCode, 200);
  });

  it('rejects invalid date range', async () => {
    const res = await runMiddleware(validateDateRange, {
      query: {
        startDate: '2024-01-10',
        endDate: '2023-01-01'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });

  it('rejects invalid ID format', async () => {
    const res = await runMiddleware(validateId('studentId'), {
      params: {
        studentId: '###invalid###'
      }
    });

    assert.strictEqual(res.statusCode, 400);
  });
});
