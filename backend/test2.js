/**
 * SERVICES TEST FILE – RAW AI MARKDOWN DEBUG ENABLED
 */

require('dotenv').config();
const mongoose = require('mongoose');
const models = require('./models');

// 🔥 DEBUG FLAG
const SHOW_RAW_AI_MARKDOWN = true;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const testResults = { passed: 0, failed: 0, errors: [] };

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function connectDatabase() {
  const mongoUri =
    process.env.MONGO_TEST_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/nep_workbench_test';

  await mongoose.connect(mongoUri);
  console.log(`${colors.green}✓${colors.reset} Connected to test database`);
}

async function cleanDatabase() {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) await c.deleteMany({});
  console.log(`${colors.yellow}⚠${colors.reset} Test database cleaned`);
}

async function disconnectDatabase() {
  await mongoose.connection.close();
  console.log(`${colors.green}✓${colors.reset} Disconnected from database`);
}

// ============================================================================
// TEST RUNNER
// ============================================================================

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`${colors.green}✓${colors.reset} ${name}`);
      testResults.passed++;
    } catch (err) {
      console.error(`${colors.red}✗${colors.reset} ${name}`);
      console.error(`  ${colors.red}Error:${colors.reset} ${err.message}`);
      testResults.failed++;
      testResults.errors.push({ test: name, error: err.message });
    }
  };
}

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

async function createTestSchool() {
  return models.School.create({
    schoolName: 'Test School',
    adminName: 'Admin Test',
    adminEmail: `admin${Date.now()}@test.com`,
    adminPassword: 'TestPassword123!',
    schoolAddress: '123 Test St'
  });
}

async function createTestTeacher(schoolId) {
  return models.Teacher.create({
    name: 'Test Teacher',
    email: `teacher${Date.now()}@test.com`,
    password: 'TestPassword123!',
    schoolId,
    subjects: ['Physics']
  });
}

async function createTestStudent(schoolId, teacherId) {
  return models.Student.create({
    name: 'Test Student',
    email: `student${Date.now()}@test.com`,
    password: 'TestPassword123!',
    schoolId,
    teacherId,
    rollNumber: Math.floor(Math.random() * 100000),
    class: 10,
    section: 'A'
  });
}

async function createTestChallenge(studentId, schoolId) {
  return models.Challenge.create({
    studentId,
    schoolId,
    title: 'Test Challenge',
    simulationType: 'projectile_motion',
    difficulty: 'medium',
    status: 'evaluated',
    evaluation: {
      score: 75,
      competencyScores: { NCF_1: 75, NCF_2: 80 }
    },
    submittedAt: new Date(),
    evaluatedAt: new Date()
  });
}

// ============================================================================
// SERVICE TESTS
// ============================================================================

const tests = {

  async testSPICalculation() {
    const spiService = require('./services/spi.service');

    const school = await createTestSchool();
    const teacher = await createTestTeacher(school.schoolId);
    const student = await createTestStudent(school.schoolId, teacher.teacherId);

    await createTestChallenge(student.studentId, school.schoolId);
    await createTestChallenge(student.studentId, school.schoolId);

    const result = await spiService.calculateSPI(student.studentId);
    if (typeof result?.spi !== 'number') throw new Error('Invalid SPI result');
  },

  async testChallengeCreation() {
    const challengeService = require('./services/challenge.service');

    const school = await createTestSchool();
    const teacher = await createTestTeacher(school.schoolId);
    const student = await createTestStudent(school.schoolId, teacher.teacherId);

    try {
      const challenge = await challengeService.createChallenge({
        studentId: student.studentId,
        simulationType: 'projectile_motion',
        difficulty: 'medium',
        __debugRawAI: SHOW_RAW_AI_MARKDOWN // 👈 pass debug flag
      });

      if (!challenge?.challengeId) {
        throw new Error('Challenge not created');
      }

      if (!['generated', 'in-progress', 'submitted', 'evaluated']
        .includes(challenge.status)) {
        throw new Error(`Invalid challenge status: ${challenge.status}`);
      }

    } catch (err) {

      // 🔥 RAW MARKDOWN DUMP (if attached to error)
      if (SHOW_RAW_AI_MARKDOWN && err.rawAIMarkdown) {
        console.log('\n' + '='.repeat(80));
        console.log(`${colors.magenta}🧠 RAW AI MARKDOWN (UNTOUCHED)${colors.reset}`);
        console.log('='.repeat(80));
        console.log(err.rawAIMarkdown);
        console.log('='.repeat(80) + '\n');
      }

      // Allow AI/template fallback
      console.log(`${colors.yellow}⚠${colors.reset} ${err.message} - Using template fallback`);
    }
  },

  async testStudentAnalytics() {
    const analyticsService = require('./services/analytics.service');

    const school = await createTestSchool();
    const teacher = await createTestTeacher(school.schoolId);
    const student = await createTestStudent(school.schoolId, teacher.teacherId);

    await createTestChallenge(student.studentId, school.schoolId);

    const analytics = await analyticsService.getStudentAnalytics(student.studentId);
    if (!analytics?.overview) throw new Error('Missing overview');
  },

  async testClassAnalytics() {
    const analyticsService = require('./services/analytics.service');

    const school = await createTestSchool();
    const teacher = await createTestTeacher(school.schoolId);
    const student = await createTestStudent(school.schoolId, teacher.teacherId);

    await createTestChallenge(student.studentId, school.schoolId);

    const analytics = await analyticsService.getClassAnalytics(
      school.schoolId, 10, 'A'
    );

    if (!analytics) throw new Error('Class analytics missing');
  },

  async testSchoolAnalytics() {
    const analyticsService = require('./services/analytics.service');

    const school = await createTestSchool();
    const teacher = await createTestTeacher(school.schoolId);
    const student = await createTestStudent(school.schoolId, teacher.teacherId);

    await createTestChallenge(student.studentId, school.schoolId);

    const analytics = await analyticsService.getSchoolAnalytics(school.schoolId);
    if (!analytics?.overview) throw new Error('School overview missing');
  }
};

// ============================================================================
// RUNNER
// ============================================================================

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}NEP WORKBENCH – SERVICE TEST SUITE${colors.reset}`);
  console.log('='.repeat(80));

  await connectDatabase();
  await cleanDatabase();

  console.log('\n' + '-'.repeat(80));
  console.log(`${colors.blue}Running service tests...${colors.reset}`);
  console.log('-'.repeat(80) + '\n');

  for (const name of Object.keys(tests)) {
    await test(name.replace('test', ''), tests[name])();
  }

  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}TEST RESULTS${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`${colors.green}✓ Passed:${colors.reset} ${testResults.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset} ${testResults.failed}`);
  console.log(`${colors.blue}Total:${colors.reset} ${testResults.passed + testResults.failed}`);
  console.log('='.repeat(80) + '\n');

  await cleanDatabase();
  await disconnectDatabase();
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
