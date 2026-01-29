/**
 * LEDGER WRITE TEST (NODE)
 * Run: node tests/ledger.test.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const Ledger = require('../models/Ledger');

(async () => {
  try {
    console.log('🔌 Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('🧹 Clearing ledger collection...');
    await Ledger.deleteMany({});

    console.log('🧪 Creating ledger entry...');

    const ledgerDoc = await Ledger.create({
      eventType: Ledger.EVENT_TYPES.CHALLENGE_EVALUATED,

      studentId: 'STU-TEST-001',
      teacherId: 'TEA-TEST-001',
      schoolId: 'SCH-TEST-001',

      challenge: {
        challengeId: 'CHL-TEST-001',
        simulationType: 'magnetic-field',
        difficulty: 'medium',
        totalScore: 82,
        passed: true,
        competenciesAssessed: [
          {
            competency: 'critical-thinking',
            score: 78,
            level: 'proficient',
            assessedBy: 'system',
            evidence: 'AI evaluation',
            timestamp: new Date()
          }
        ]
      },

      createdBy: 'system',
      createdByRole: 'system',

      metadata: {
        source: 'node-test',
        engine: 'ledger-test',
        timestamp: new Date()
      },

      hash: crypto
        .createHash('sha256')
        .update('CHL-TEST-001' + 'STU-TEST-001')
        .digest('hex'),

      status: 'confirmed',
      timestamp: new Date()
    });

    // ======================
    // ASSERTIONS (MANUAL)
    // ======================
    console.log('🔍 Running assertions...');

    if (!ledgerDoc._id) throw new Error('❌ Ledger _id missing');
    if (!ledgerDoc.eventType) throw new Error('❌ eventType missing');
    if (!ledgerDoc.createdBy) throw new Error('❌ createdBy missing');
    if (!ledgerDoc.createdByRole) throw new Error('❌ createdByRole missing');
    if (!ledgerDoc.metadata) throw new Error('❌ metadata missing');
    if (!ledgerDoc.hash) throw new Error('❌ hash missing');
    if (!ledgerDoc.challenge?.competenciesAssessed?.length)
      throw new Error('❌ competenciesAssessed missing');

    console.log('✅ Ledger write test PASSED');
    console.log('📄 Ledger ID:', ledgerDoc._id.toString());

    process.exit(0);

  } catch (err) {
    console.error('❌ Ledger write test FAILED');
    console.error(err.message);
    process.exit(1);
  }
})();
