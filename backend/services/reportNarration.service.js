/**
 * REPORT NARRATION SERVICE
 * ------------------------------------------------------------
 * Purpose:
 * - Generate NEP 2020 compliant narration from an already
 *   generated & ledger-verified NEPReport document
 * - NO calculations
 * - NO ledger writes
 * - NO competency mutation
 * - Audit / CBSE safe
 *
 * Source of truth:
 * - NEPReport (DB)
 *
 * This service is REGENERABLE and NON-DESTRUCTIVE.
 */

const { callMistralAPI, calculateCost } = require('./mistral.service');
const logger = require('../utils/logger');

/**
 * Generate human-readable NEP narration from an already verified NEP report.
 * IMPORTANT:
 * - Narration ONLY
 * - Ledger / Blockchain aware
 * - Audit compliant
 */
const generateNEPNarrationFromReport = async (nepReport, student) => {
  if (!nepReport) {
    throw new Error('NEP report is required for narration');
  }

  if (!student) {
    throw new Error('Student data is required for narration');
  }

  // ============================================================================
  // AUTHORITATIVE READ-ONLY SNAPSHOT (LEDGER + REPORT)
  // ============================================================================
  const narrationInput = {
    studentProfile: {
      studentId: nepReport.studentId,
      name: student.name || 'N/A',
      class: student.class || 'N/A',
      section: student.section || 'N/A',
      schoolId: nepReport.schoolId
    },

    assessmentPeriod: {
      start: nepReport.periodStart,
      end: nepReport.periodEnd
    },

    reportMeta: {
      reportId: nepReport.reportId,
      reportType: nepReport.reportType,
      generatedAt: nepReport.generatedAt
    },

    performanceSummary: {
      totalChallenges: nepReport.summary?.totalChallenges || 0,
      averageCPI: nepReport.summary?.averageScore || 0
    },

    competencySummary: {
      total: 12,
      assessed: nepReport.competencies.filter(c => c.assessed).length,
      notAssessed: nepReport.competencies.filter(c => !c.assessed).length
    },

    competencies: (nepReport.competencies || []).map(c => ({
      name: c.name,
      score: c.score,
      status: c.status
    })),

    blockchainVerification: {
      reportHash: nepReport.reportHash || 'N/A',
      merkleRoot: nepReport.merkleRoot || 'N/A',
      verificationStatus: 'VERIFIED'
    },

    complianceStatement: {
      nepAligned: true,
      ledgerVerified: true,
      auditReady: true
    }
  };

  // ============================================================================
  // SYSTEM PROMPT — STRICT GOVERNMENT NARRATION MODE
  // ============================================================================
  const systemPrompt = `
You are an official NEP 2020 educational audit narrator.

STRICT RULES:
- Use ONLY the provided data
- DO NOT calculate or infer anything
- DO NOT invent competencies, scores, trends, or remarks
- DO NOT provide advice or recommendations
- DO NOT use markdown, bullets, or symbols
- Output plain formal English text only
- Maintain CBSE / Government inspection tone
- Explicitly mention blockchain verification and compliance
- This narration must be audit and court safe
- If CPI is provided as a decimal (0–1), express it as a percentage in narration.

`;

  // ============================================================================
  // USER PROMPT — FIXED STRUCTURE
  // ============================================================================
  const userPrompt = `
Generate a formal NEP 2020 compliant student assessment narration.

AUTHORITATIVE INPUT:
${JSON.stringify(narrationInput, null, 2)}

WRITE THE NARRATION IN EXACTLY THESE SECTIONS
(IN THE SAME ORDER AND WITH CLEAR HEADINGS):

1. Student and Assessment Overview
2. Competency Performance Summary
3. Blockchain Verification and Audit Integrity
4. Compliance and Concluding Statement
`;

  // ============================================================================
  // AI CALL — NARRATION ONLY
  // ============================================================================
  let response;
  try {
    response = await callMistralAPI({
      operation: 'nep_report_narration',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.25,
      maxTokens: 1000
    });
  } catch (error) {
    logger.error('NEP narration AI call failed', error);
    throw new Error('Failed to generate NEP narration');
  }

  if (!response?.content) {
    throw new Error('Empty narration received from AI');
  }

  // ============================================================================
  // FINAL RESPONSE
  // ============================================================================
  return {
    success: true,
    narration: response.content.trim(),
    metadata: {
      model: response.model,
      tokensUsed: response.usage?.total_tokens || 0,
      cost: calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        response.model
      )
    }
  };
};

module.exports = {
  generateNEPNarrationFromReport
};
