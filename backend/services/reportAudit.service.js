const Ledger = require('../models/Ledger');
const crypto = require('crypto');

exports.buildAuditPayload = async ({
  studentId,
  nepReport,
  ledgerEvents
}) => {

  // --------------------------------------------------
  // 1️⃣ BUILD MERKLE TREE (AUTHORITATIVE)
  // --------------------------------------------------
  const merkleTree = await Ledger.createMerkleTree(studentId);

  // --------------------------------------------------
  // 2️⃣ DETERMINISTIC REPORT HASH
  // --------------------------------------------------
  const reportHash = crypto
    .createHash('sha256')
    .update(
      nepReport.reportId +
      studentId +
      nepReport.periodStart.toISOString() +
      nepReport.periodEnd.toISOString() +
      (merkleTree.merkleRoot || '')
    )
    .digest('hex');

  // --------------------------------------------------
  // 3️⃣ FIND LEDGER ANCHOR EVENT (🔥 FIX)
  // --------------------------------------------------
  const anchorEvent = ledgerEvents
    .filter(e => e.metadata && typeof e.metadata.blockIndex === 'number')
    .sort((a, b) => b.metadata.blockIndex - a.metadata.blockIndex)[0];

  const ledgerBlockId = anchorEvent
    ? `BLK-${anchorEvent.metadata.blockIndex}`
    : null;

  // --------------------------------------------------
  // 4️⃣ COMPETENCY → LEDGER PROOF MAP
  // --------------------------------------------------
  const competencyLedgerMap = {};

  for (const event of ledgerEvents) {
    const assessed = event.challenge?.competenciesAssessed || [];

    for (const c of assessed) {
      if (!competencyLedgerMap[c.competency]) {
        competencyLedgerMap[c.competency] = {
          ledgerHash: event.hash || null,
          cpiScore: Number((c.score / 100).toFixed(2)), // 0–1 scale
          level: c.level,
          evidenceSources: event.challenge?.challengeId
            ? [event.challenge.challengeId]
            : [],
          ledgerProofSummary: event.metadata?.blockIndex !== undefined
            ? [`Block ${event.metadata.blockIndex}`]
            : [],
          inspectorNotes: 'Derived from immutable challenge evaluation'
        };
      }
    }
  }

  // --------------------------------------------------
  // 5️⃣ FINAL AUDIT PAYLOAD
  // --------------------------------------------------
  return {
    blockchainVerification: {
      ledgerBlockId,
      merkleRoot: merkleTree.merkleRoot,
      reportHash: `SHA256:${reportHash}`,
      verificationStatus: ledgerBlockId ? 'VERIFIED' : 'UNVERIFIED'
    },

    complianceStatement: {
      nepAligned: true,
      ledgerVerified: !!ledgerBlockId,
      auditReady: true
    },

    competencyLedgerMap
  };
};
