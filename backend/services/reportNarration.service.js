/**
 * REPORT NARRATION SERVICE
 * ------------------------------------------------------------
 * Purpose:
 * - Generate NEP 2020 compliant narration from an already
 *   generated NEPReport document
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
 * Generate narration for an existing NEP Report
 *
 * @param {Object} nepReport - NEPReport mongoose document
 * @param {Object} student - Student mongoose document
 * @returns {Object}
 */
/**
 * Generate human-readable NEP narration from an already verified NEP report.
 * IMPORTANT:
 * - No calculations
 * - No inference
 * - No competency creation
 * - Narration ONLY
 */
const generateNEPNarrationFromReport = async (nepReport, student) => {
  if (!nepReport) {
    throw new Error('NEP report is required for narration');
  }

  if (!student) {
    throw new Error('Student data is required for narration');
  }

  // ============================================================================
  // BUILD AUTHORITATIVE INPUT (READ-ONLY SNAPSHOT)
  // ============================================================================
  const narrationInput = {
    studentProfile: {
      studentId: nepReport.studentId,
      name: student.name || 'N/A',
      class: student.class || 'N/A',
      section: student.section || 'N/A',
      schoolId: nepReport.schoolId
    },

    reportMeta: {
      reportId: nepReport.reportId,
      reportType: nepReport.reportType,
      periodStart: nepReport.periodStart,
      periodEnd: nepReport.periodEnd,
      generatedAt: nepReport.generatedAt
    },

    summary: {
      totalChallenges: nepReport.summary?.totalChallenges || 0,
      averageScore: nepReport.summary?.averageScore || 0
    },

    competencies: (nepReport.competencies || []).map(c => ({
      name: c.name,
      score: c.score,
      status: c.status
    }))
  };

  // ============================================================================
  // SYSTEM PROMPT (STRICT — NARRATION ONLY)
  // ============================================================================
  const systemPrompt = `
You are an official educational assessment narrator.

STRICT RULES:
- Use ONLY the data provided
- DO NOT calculate, infer, or normalize scores
- DO NOT invent competencies, trends, or remarks
- DO NOT add recommendations or advice
- DO NOT use markdown, bullets, or symbols
- Output PLAIN TEXT only
- Maintain neutral, formal, inspection-ready tone
- Follow NEP 2020 academic narration style
- This narration will be used for CBSE and government audits
`;

  // ============================================================================
  // USER PROMPT
  // ============================================================================
  const userPrompt = `
Using the following VERIFIED NEP assessment data,
write a formal narration suitable for CBSE inspection
and institutional audit records.

AUTHORITATIVE DATA:
${JSON.stringify(narrationInput, null, 2)}

WRITE THE NARRATION IN EXACTLY THESE SECTIONS:

1. Overall Performance Summary (80–120 words)
2. Competency Overview (one sentence per competency)
3. Learning Trend Observation
4. Concluding Remark (neutral, factual, no suggestions)
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
      temperature: 0.4,
      maxTokens: 900
    });
  } catch (error) {
    logger.error('NEP narration AI call failed', error);
    throw new Error('Failed to generate NEP narration');
  }

  if (!response?.content) {
    throw new Error('Empty narration received from AI');
  }

  // ============================================================================
  // FINAL RESPONSE (NO POST-PROCESSING)
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