// services/mistral.service.js
/**
 * MISTRAL AI SERVICE - COMPLETE PRODUCTION VERSION
 * Mistral AI integration for challenge generation and evaluation
 * 
 * @module services/mistral.service
 */
/*
const axios = require('axios');
const { AILog } = require('../models');

// ============================================================================
// MISTRAL CONFIGURATION
// ============================================================================

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'mistral-large-2411';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;

if (!MISTRAL_API_KEY) {
  console.warn('⚠️  MISTRAL_API_KEY not set. AI functionality will be disabled.');
}

// ============================================================================
// API CLIENT
// ============================================================================

const mistralClient = axios.create({
  baseURL: MISTRAL_API_URL,
  headers: {
    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// ============================================================================
// CORE AI FUNCTIONS
// ============================================================================

/**
 * Call Mistral AI API
 * @param {Object} options - Request options
 * @returns {Promise}
 */
 /*
const callMistralAPI = async (options) => {
  const {
    model = DEFAULT_MODEL,
    messages,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
    topP = 1,
    stream = false,
    safePrompt = false
  } = options;
  
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral API key not configured');
  }
  
  const startTime = Date.now();
  
  try {
    const response = await mistralClient.post('/chat/completions', {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream,
      safe_prompt: safePrompt
    });
    
    const responseTime = Date.now() - startTime;
    const data = response.data;
    
    // Log AI request
    await AILog.logRequest({
      operation: 'mistral_api_call',
      model,
      request: {
        prompt: messages[messages.length - 1]?.content,
        temperature,
        maxTokens
      },
      response: {
        content: data.choices[0]?.message?.content,
        tokensUsed: data.usage?.total_tokens,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        responseTime,
        finishReason: data.choices[0]?.finish_reason
      },
      success: true,
      tokensUsed: data.usage?.total_tokens,
      cost: calculateCost(data.usage?.prompt_tokens, data.usage?.completion_tokens, model)
    });
    
    return {
      success: true,
      content: data.choices[0]?.message?.content,
      usage: data.usage,
      model: data.model,
      finishReason: data.choices[0]?.finish_reason,
      responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Mistral API Error:', error.response?.data || error.message);
    
    // Log error
    await AILog.logRequest({
      operation: 'mistral_api_call',
      model,
      request: {
        prompt: messages[messages.length - 1]?.content,
        temperature,
        maxTokens
      },
      response: {
        responseTime
      },
      success: false,
      errorMessage: error.message,
      errorCode: error.response?.status?.toString()
    });
    
    throw new Error(`Mistral API error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Calculate cost based on tokens used
 * @param {Number} promptTokens - Prompt tokens
 * @param {Number} completionTokens - Completion tokens
 * @param {String} model - Model name
 * @returns {Number} Cost in USD
 */
 /*
const calculateCost = (promptTokens, completionTokens, model) => {
  const pricing = {
    'mistral-large-2411': { prompt: 0.004, completion: 0.012 },
    'mistral-medium-latest': { prompt: 0.002, completion: 0.006 },
    'mistral-small-latest': { prompt: 0.001, completion: 0.003 }
  };
  
  const rates = pricing[model] || pricing['mistral-large-2411'];
  
  const promptCost = (promptTokens / 1000) * rates.prompt;
  const completionCost = (completionTokens / 1000) * rates.completion;
  
  return promptCost + completionCost;
};

// ============================================================================
// CHALLENGE GENERATION
// ============================================================================

/**
 * Generate challenge using Mistral AI
 * @param {Object} options - Challenge options
 * @returns {Promise}
 */
 /*
const generateChallenge = async (options) => {
  const {
    simulationType,
    difficulty,
    competencies,
    class: className,
    studentLevel,
    previousChallenges = []
  } = options;
  
  const systemPrompt = `You are an expert physics and mathematics educator creating interactive simulation challenges for students.
Your challenges should be:
- Aligned with NEP 2020 competencies
- Age-appropriate for class ${className} students
- Focused on practical understanding and application
- Include clear learning objectives
- Provide step-by-step solution guidance`;
  
  const userPrompt = `Create a ${difficulty} level ${simulationType} simulation challenge.

TARGET COMPETENCIES: ${competencies.join(', ')}
STUDENT LEVEL: ${studentLevel || 'intermediate'}
CLASS: ${className}

The challenge should include:
1. A clear scenario description
2. Specific objectives
3. Required parameters and their acceptable ranges
4. Expected outputs
5. Success criteria
6. Hints for students

Format the response as JSON with this structure:
{
  "title": "Challenge title",
  "description": "Detailed scenario",
  "objectives": ["objective1", "objective2"],
  "parameters": [
    {
      "name": "parameter_name",
      "label": "Parameter Label",
      "type": "number|select|text",
      "min": 0,
      "max": 100,
      "unit": "unit",
      "default": 50,
      "description": "What this parameter represents"
    }
  ],
  "expectedOutputs": [
    {
      "name": "output_name",
      "label": "Output Label",
      "unit": "unit",
      "description": "What this output represents"
    }
  ],
  "successCriteria": {
    "accuracy": 0.95,
    "completeness": 1.0,
    "explanation": "What makes a successful solution"
  },
  "hints": ["hint1", "hint2"],
  "difficulty": "${difficulty}",
  "estimatedTime": 15
}

Ensure the challenge is engaging, educational, and appropriate for the student level.`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await callMistralAPI({
    messages,
    temperature: 0.8,
    maxTokens: 2500
  });
  
  try {
    const challengeData = JSON.parse(response.content);
    return {
      success: true,
      challenge: challengeData,
      metadata: {
        model: response.model,
        tokensUsed: response.usage.total_tokens,
        responseTime: response.responseTime
      }
    };
  } catch (error) {
    console.error('Error parsing challenge JSON:', error);
    throw new Error('Failed to parse AI-generated challenge');
  }
};

// ============================================================================
// ANSWER EVALUATION
// ============================================================================

/**
 * Evaluate student answer using Mistral AI
 * @param {Object} options - Evaluation options
 * @returns {Promise}
 */
 /*
const evaluateAnswer = async (options) => {
  const {
    question,
    studentAnswer,
    expectedAnswer,
    competencies,
    rubric
  } = options;
  
  const systemPrompt = `You are an expert physics and mathematics educator evaluating student responses.
Evaluate based on:
- Conceptual understanding
- Mathematical accuracy
- Problem-solving approach
- Explanation quality
- Application of physics principles`;
  
  const userPrompt = `Evaluate this student's answer:

QUESTION: ${question}

STUDENT ANSWER:
${JSON.stringify(studentAnswer, null, 2)}

EXPECTED ANSWER:
${JSON.stringify(expectedAnswer, null, 2)}

COMPETENCIES BEING ASSESSED: ${competencies.join(', ')}

${rubric ? `RUBRIC:\n${JSON.stringify(rubric, null, 2)}` : ''}

Provide evaluation as JSON:
{
  "score": 0-100,
  "breakdown": {
    "conceptual_understanding": 0-100,
    "mathematical_accuracy": 0-100,
    "problem_solving": 0-100,
    "explanation_quality": 0-100
  },
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "feedback": "Detailed constructive feedback",
  "suggestions": ["suggestion1", "suggestion2"],
  "competency_scores": {
    "competency_name": 0-100
  }
}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await callMistralAPI({
    messages,
    temperature: 0.3,
    maxTokens: 1500
  });
  
  try {
    const evaluation = JSON.parse(response.content);
    return {
      success: true,
      evaluation,
      metadata: {
        model: response.model,
        tokensUsed: response.usage.total_tokens,
        responseTime: response.responseTime
      }
    };
  } catch (error) {
    console.error('Error parsing evaluation JSON:', error);
    throw new Error('Failed to parse AI evaluation');
  }
};

// ============================================================================
// FEEDBACK GENERATION
// ============================================================================

/**
 * Generate personalized feedback
 * @param {Object} options - Feedback options
 * @returns {Promise}
 
const generateFeedback = async (options) => {
  const {
    studentName,
    score,
    strengths,
    weaknesses,
    competencyScores,
    challengeType
  } = options;
  
  const systemPrompt = `You are a supportive and encouraging physics educator providing personalized feedback to students.`;
  
  const userPrompt = `Generate encouraging and constructive feedback for ${studentName}.

CHALLENGE: ${challengeType}
OVERALL SCORE: ${score}%
STRENGTHS: ${strengths.join(', ')}
AREAS FOR IMPROVEMENT: ${weaknesses.join(', ')}
COMPETENCY SCORES: ${JSON.stringify(competencyScores)}

Provide:
1. Personalized encouragement
2. Specific praise for strengths
3. Constructive guidance for improvement
4. Next steps for learning
5. Motivational closing

Keep the tone positive, supportive, and age-appropriate. Maximum 200 words.`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await callMistralAPI({
    messages,
    temperature: 0.7,
    maxTokens: 500
  });
  
  return {
    success: true,
    feedback: response.content,
    metadata: {
      model: response.model,
      tokensUsed: response.usage.total_tokens,
      responseTime: response.responseTime
    }
  };
};

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate NEP report using AI
 * @param {Object} options - Report options
 * @returns {Promise}
 
const generateNEPReport = async (options) => {
  const {
    studentData,
    challengeHistory,
    competencyScores,
    period
  } = options;
  
  const systemPrompt = `You are an educational assessment expert creating comprehensive NEP 2020 aligned student reports.`;
  
  const userPrompt = `Generate a comprehensive NEP report for:

STUDENT: ${studentData.name} (Class ${studentData.class}-${studentData.section})
PERIOD: ${period.start} to ${period.end}

PERFORMANCE DATA:
${JSON.stringify(challengeHistory, null, 2)}

COMPETENCY SCORES:
${JSON.stringify(competencyScores, null, 2)}

Generate a JSON report with:
{
  "summary": "Overall performance summary (150-200 words)",
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2"],
  "competencyAnalysis": {
    "competency_name": {
      "score": 0-100,
      "level": "beginning|developing|proficient|advanced",
      "insights": "Specific insights",
      "recommendations": ["recommendation1", "recommendation2"]
    }
  },
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "nextSteps": ["step1", "step2", "step3"]
}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await callMistralAPI({
    messages,
    temperature: 0.5,
    maxTokens: 3000
  });
  
  try {
    const report = JSON.parse(response.content);
    return {
      success: true,
      report,
      metadata: {
        model: response.model,
        tokensUsed: response.usage.total_tokens,
        responseTime: response.responseTime
      }
    };
  } catch (error) {
    console.error('Error parsing report JSON:', error);
    throw new Error('Failed to parse AI-generated report');
  }
};

// ============================================================================
// COMPETENCY ANALYSIS
// ============================================================================

/**
 * Analyze competency development
 * @param {Object} options - Analysis options
 * @returns {Promise}
 
const analyzeCompetency = async (options) => {
  const {
    competency,
    studentPerformance,
    historicalData
  } = options;
  
  const systemPrompt = `You are an educational psychologist analyzing student competency development.`;
  
  const userPrompt = `Analyze ${competency} competency development:

CURRENT PERFORMANCE:
${JSON.stringify(studentPerformance, null, 2)}

HISTORICAL DATA:
${JSON.stringify(historicalData, null, 2)}

Provide analysis as JSON:
{
  "currentLevel": "beginning|developing|proficient|advanced",
  "trend": "improving|stable|declining",
  "insights": "Detailed insights",
  "strengths": ["strength1", "strength2"],
  "challenges": ["challenge1", "challenge2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "targetActivities": ["activity1", "activity2"]
}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await callMistralAPI({
    messages,
    temperature: 0.4,
    maxTokens: 1000
  });
  
  try {
    const analysis = JSON.parse(response.content);
    return {
      success: true,
      analysis,
      metadata: {
        model: response.model,
        tokensUsed: response.usage.total_tokens,
        responseTime: response.responseTime
      }
    };
  } catch (error) {
    console.error('Error parsing analysis JSON:', error);
    throw new Error('Failed to parse AI analysis');
  }
};

// ============================================================================
// RECOMMENDATION ENGINE
// ============================================================================

/**
 * Generate personalized recommendations
 * @param {Object} options - Recommendation options
 * @returns {Promise}
 
const generateRecommendations = async (options) => {
  const {
    studentProfile,
    performanceData,
    learningStyle,
    interests
  } = options;
  
  const systemPrompt = `You are an adaptive learning specialist creating personalized learning paths.`;
  
  const userPrompt = `Create personalized recommendations for:

STUDENT PROFILE:
${JSON.stringify(studentProfile, null, 2)}

PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

LEARNING STYLE: ${learningStyle || 'mixed'}
INTERESTS: ${interests?.join(', ') || 'general'}

Generate recommendations as JSON:
{
  "nextChallenges": [
    {
      "type": "simulation_type",
      "difficulty": "easy|medium|hard",
      "reason": "Why this is recommended",
      "competencies": ["competency1", "competency2"]
    }
  ],
  "learningResources": [
    {
      "title": "Resource title",
      "type": "video|article|practice",
      "url": "URL if available",
      "description": "What this covers"
    }
  ],
  "skillFocus": ["skill1", "skill2"],
  "timeframe": "1-2 weeks"
}`;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const response = await callMistralAPI({
    messages,
    temperature: 0.6,
    maxTokens: 1500
  });
  
  try {
    const recommendations = JSON.parse(response.content);
    return {
      success: true,
      recommendations,
      metadata: {
        model: response.model,
        tokensUsed: response.usage.total_tokens,
        responseTime: response.responseTime
      }
    };
  } catch (error) {
    console.error('Error parsing recommendations JSON:', error);
    throw new Error('Failed to parse AI recommendations');
  }
};

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple AI requests in batch
 * @param {Array} requests - Array of request objects
 * @returns {Promise}
 
const batchProcess = async (requests) => {
  const results = [];
  
  for (const request of requests) {
    try {
      const response = await callMistralAPI(request);
      results.push({
        success: true,
        data: response
      });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check Mistral API health
 * @returns {Promise}
 
const healthCheck = async () => {
  try {
    const response = await callMistralAPI({
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 10
    });
    
    return {
      status: 'healthy',
      model: response.model,
      responseTime: response.responseTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core
  callMistralAPI,
  calculateCost,
  
  // Challenge
  generateChallenge,
  evaluateAnswer,
  generateFeedback,
  
  // Reports
  generateNEPReport,
  analyzeCompetency,
  generateRecommendations,
  
  // Utilities
  batchProcess,
  healthCheck,
  
  // Configuration
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS
};

*/

// services/mistral.service.js
/**
 * MISTRAL AI SERVICE - ADAPTIVE SIMULATOR-CONSTRAINED VERSION (FINAL)
 *
 * Responsibilities:
 * - Consume ChallengeIntent (algorithm-owned)
 * - Enforce SIM_CONTEXTS constraints
 * - Generate challenges using AI (expression only)
 * - Extract reasoning signals (no grading)
 * - NEVER decide difficulty or pedagogy
 *
 * @module services/mistral.service
 

const axios = require('axios');
const { AILog } = require('../models');
const { SIM_CONTEXTS } = require('../config/constants');

// ============================================================================
// MISTRAL CONFIGURATION
// ============================================================================

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'mistral-large-2411';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;

if (!MISTRAL_API_KEY) {
  console.warn('⚠️  MISTRAL_API_KEY not set. AI functionality will be disabled.');
}

// ============================================================================
// API CLIENT
// ============================================================================

const mistralClient = axios.create({
  baseURL: MISTRAL_API_URL,
  headers: {
    Authorization: `Bearer ${MISTRAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 60000
});

// ============================================================================
// CORE AI CALL
// ============================================================================

const callMistralAPI = async ({
  messages,
  model = DEFAULT_MODEL,
  temperature = DEFAULT_TEMPERATURE,
  maxTokens = DEFAULT_MAX_TOKENS,
  topP = 1,
  operation = 'system_ai_call'
}) => {
  if (!MISTRAL_API_KEY) {
    throw new Error('Mistral API key not configured');
  }

  const startTime = Date.now();

  try {
    const response = await mistralClient.post('/chat/completions', {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP
    });

    const data = response.data;
    const responseTime = Date.now() - startTime;
    const content = data.choices?.[0]?.message?.content || '';

    await AILog.logRequest({
      userType: 'system',
      userId: 'SYSTEM',
      operation,
      model,
      request: { prompt: messages[messages.length - 1]?.content },
      response: {
        content,
        tokensUsed: data.usage?.total_tokens,
        responseTime
      },
      success: true
    });

    return {
      success: true,
      content,
      usage: data.usage,
      model: data.model,
      responseTime
    };
  } catch (error) {
    await AILog.logRequest({
      userType: 'system',
      userId: 'SYSTEM',
      operation,
      success: false,
      errorMessage: error.message
    });
    throw error;
  }
};

// ============================================================================
// COST CALCULATION
// ============================================================================

const calculateCost = (promptTokens = 0, completionTokens = 0, model) => {
  const pricing = {
    'mistral-large-2411': { prompt: 0.004, completion: 0.012 },
    'mistral-medium-latest': { prompt: 0.002, completion: 0.006 },
    'mistral-small-latest': { prompt: 0.001, completion: 0.003 }
  };

  const rates = pricing[model] || pricing['mistral-large-2411'];
  return (
    (promptTokens / 1000) * rates.prompt +
    (completionTokens / 1000) * rates.completion
  );
};

// ============================================================================
// CHALLENGE GENERATION (SIMULATOR + INTENT DRIVEN)
// ============================================================================

/**
 * Generate a simulator-constrained challenge
 * @param {Object} options
 * @param {String} options.simulatorId
 * @param {Object} options.challengeIntent  // produced by algorithms
 
const generateChallenge = async ({ simulatorId, challengeIntent }) => {
  const sim = SIM_CONTEXTS[simulatorId];
  if (!sim) {
    throw new Error(`Unknown simulator: ${simulatorId}`);
  }

  const systemPrompt = `
You are an AI challenge generator inside a simulator-constrained system.

RULES:
- Use ONLY the provided simulator topics and tools.
- Follow algorithmic intent strictly.
- Do NOT invent concepts or tools.
- Output STRICT JSON only.
`;

  const userPrompt = `
SIMULATOR ID:
${simulatorId}

SIMULATOR TOPICS:
${sim.topics.join(', ')}

SIMULATOR TOOLS:
${sim.tools.join(', ')}

SIMULATOR DIFFICULTY FACTORS:
${sim.difficulty_factors.join(', ')}

ALGORITHM INTENT (DO NOT MODIFY):
${JSON.stringify(challengeIntent, null, 2)}

TASK:
Generate ONE challenge solvable ONLY using the simulator.

OUTPUT FORMAT (STRICT JSON):
{
  "challenge_id": "string",
  "simulator_id": "${simulatorId}",
  "scenario": "description",
  "objective": "what student must determine",
  "simulator_setup": {
    "initial_conditions": {},
    "tools_to_use": []
  },
  "student_tasks": [],
  "expected_simulator_observations": [],
  "answer_format": {
    "primary_answer": "string|number",
    "reasoning": "text",
    "optional_graph_interpretation": "text"
  },
  "evaluation_variables": {
    "requires_reasoning": true,
    "requires_graph": false,
    "classification_required": true
  }
}
`;

  const response = await callMistralAPI({
    operation: 'challenge_generation',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    maxTokens: 2500
  });

  return {
    success: true,
    challenge: JSON.parse(response.content),
    metadata: {
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
      responseTime: response.responseTime
    }
  };
};

// ============================================================================
// REASONING SIGNAL EXTRACTION (NO GRADING)
// ============================================================================

/**
 * Extract reasoning signals from student submission
 
const extractReasoningSignals = async ({
  simulatorId,
  challenge,
  studentSubmission
}) => {
  const systemPrompt = `
You are an analysis engine.
DO NOT grade.
DO NOT teach.
ONLY extract machine-readable signals.
Output STRICT JSON only.
`;

  const userPrompt = `
SIMULATOR CONTEXT:
${JSON.stringify(SIM_CONTEXTS[simulatorId], null, 2)}

CHALLENGE:
${JSON.stringify(challenge, null, 2)}

STUDENT SUBMISSION:
${JSON.stringify(studentSubmission, null, 2)}

EXTRACT:
{
  "primary_answer_correct": boolean,
  "reasoning_quality": "low|medium|high",
  "uses_correct_simulator_concepts": boolean,
  "mentions_key_topics": [],
  "misconception_tags": []
}
`;

  const response = await callMistralAPI({
    operation: 'reasoning_extraction',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    maxTokens: 1000
  });

  return JSON.parse(response.content);
};

// ============================================================================
// FEEDBACK, REPORTS, RECOMMENDATIONS (UNCHANGED LOGIC)
// ============================================================================

const generateFeedback = async (options) => {
  const systemPrompt = `You are a supportive educator providing feedback.`;
  const userPrompt = JSON.stringify(options, null, 2);

  const response = await callMistralAPI({
    operation: 'feedback_generation',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    maxTokens: 500
  });

  return { success: true, feedback: response.content };
};

const generateNEPReport = async (options) => {
  /**
   * options is AUTHORITATIVE INPUT coming from:
   * - Ledger (hashes, merkle root, CPI, events)
   * - Algorithms (CPI, smoothed CPI, trends)
   * - Student profile & period metadata
   *
   * AI is ONLY allowed to format + narrate this data.
   

  const systemPrompt = `
You are an official educational assessment report generator.

MANDATORY RULES:
- Follow NEP 2020 competency-based assessment principles
- Map EACH competency to a ledger hash entry
- Use ONLY the data provided in input
- DO NOT invent scores, hashes, events, or competencies
- EXACTLY 12 competencies must be reported
- CPI values must be between 0.0 and 1.0
- Output STRICT JSON only (no markdown, no commentary)

This report will be used for:
- Government audits
- CBSE / State inspections
- Parent & teacher communication
- Cryptographic verification

Accuracy, neutrality, and structural correctness are mandatory.
`;

  const userPrompt = `
Generate a NEP 2020–aligned student progress report with
DIRECT MAPPING between competencies and ledger hash entries.

AUTHORITATIVE INPUT DATA (DO NOT MODIFY OR INTERPRET BEYOND FORMATTING):

${JSON.stringify(options, null, 2)}

------------------------------------
MANDATORY OUTPUT STRUCTURE (STRICT JSON)
------------------------------------

{
  "studentProfile": {
    "studentId": "string",
    "name": "string",
    "class": "string",
    "section": "string",
    "schoolId": "string"
  },

  "ledgerMetadata": {
    "ledgerBlockId": "string",
    "merkleRoot": "string",
    "reportHash": "string",
    "verificationStatus": "verified | unverified"
  },

  "reportMeta": {
    "period": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    },
    "generatedAt": "ISO_TIMESTAMP",
    "alignedPolicy": "NEP-2020",
    "reportVersion": "1.0"
  },

  "analyticalSummary": {
    "totalChallenges": number,
    "ledgerEvents": number,
    "averageCPI": number,
    "smoothedCPI": number,
    "learningTrend": "improving | stable | declining",
    "driftDetected": boolean
  },

  "overallSummary": {
    "performanceLevel": "beginning | developing | proficient | advanced",
    "summaryText": "150–200 words, formal, human-readable, government-appropriate",
    "learningTrendNarrative": "short explanation of progress"
  },

  "competencyLedgerMap": {
    "competency_name": {
      "ledgerHash": "string",
      "cpiScore": number,
      "level": "emerging | developing | proficient | advanced",
      "evidenceSources": [
        "ledger-derived evidence"
      ],
      "ledgerProofSummary": [
        "verifiable fact from ledger events"
      ],
      "inspectorNotes": "formal observation text"
    }
  },

  "competencyMatrixSummary": {
    "proficientCount": number,
    "developingCount": number,
    "emergingCount": number,
    "notAssessedCount": number
  },

  "teacherRemarks": {
    "pedagogicalFocus": "string",
    "recommendedStrategy": "string"
  },

  "parentNotes": {
    "plainLanguageSummary": "simple explanation for parents",
    "homeSupportSuggestions": [
      "actionable advice"
    ]
  },

  "complianceStatement": {
    "nepAligned": true,
    "ledgerVerified": true,
    "auditReady": true
  }
}

------------------------------------
CRITICAL VALIDATION RULES
------------------------------------
- EXACTLY 12 competencies must appear in competencyLedgerMap
- EACH competency MUST include a ledgerHash
- Do NOT add extra keys
- Do NOT include markdown, comments, or explanations
- Output must be valid parsable JSON ONLY
`;

  const response = await callMistralAPI({
    operation: 'nep_report_generation',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.5,
    maxTokens: 3000
  });

  return {
    success: true,
    report: JSON.parse(response.content)
  };
};


const generateRecommendations = async (options) => {
  const response = await callMistralAPI({
    operation: 'recommendation_generation',
    messages: [{ role: 'user', content: JSON.stringify(options, null, 2) }],
    temperature: 0.6,
    maxTokens: 1500
  });

  return { success: true, recommendations: JSON.parse(response.content) };
};

// ============================================================================
// BATCH + HEALTH
// ============================================================================

const batchProcess = async (requests) => {
  const results = [];
  for (const req of requests) {
    try {
      results.push(await callMistralAPI(req));
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      results.push({ success: false, error: e.message });
    }
  }
  return results;
};

const healthCheck = async () => {
  try {
    const res = await callMistralAPI({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 5
    });
    return { status: 'healthy', model: res.model };
  } catch (e) {
    return { status: 'unhealthy', error: e.message };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  callMistralAPI,
  calculateCost,

  generateChallenge,
  extractReasoningSignals,
  generateFeedback,

  generateNEPReport,
  generateRecommendations,

  batchProcess,
  healthCheck,

  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS
};
*/

// services/mistral.service.js
/**
 * MISTRAL AI SERVICE
 * All Mistral AI operations
 * 
 * @module services/mistral.service
 */

const axios = require('axios');
const { AILog } = require('../models');
const { SIM_CONTEXTS } = require('../config/constants');
const mistralConfig = require('../config/mistral'); // USE CONFIG
const logger = require('../utils/logger');

// ============================================================================
// API CLIENT
// ============================================================================

const mistralClient = axios.create({
  baseURL: mistralConfig.baseURL,
  headers: {
    Authorization: `Bearer ${mistralConfig.apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: mistralConfig.timeout
});

// Validate API key on startup
if (!mistralConfig.apiKey) {
  console.warn('⚠️  MISTRAL_API_KEY not set. AI functionality will be disabled.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MISTRAL_API_KEY is required in production');
  }
}

// ============================================================================
// CORE AI CALL
// ============================================================================

const callMistralAPI = async ({
  messages,
  model = mistralConfig.model,
  temperature = mistralConfig.temperature,
  maxTokens = mistralConfig.maxTokens,
  topP = mistralConfig.topP,
  operation = 'system_ai_call'
}) => {
  if (!mistralConfig.apiKey) {
    throw new Error('Mistral API key not configured');
  }

  const startTime = Date.now();
  let retries = 0;

  while (retries <= mistralConfig.maxRetries) {
    try {
      const response = await mistralClient.post('/chat/completions', {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP
      });

      const data = response.data;
      const responseTime = Date.now() - startTime;
      const content = data.choices?.[0]?.message?.content || '';

      // Log successful request
      await AILog.logRequest({
        userType: 'system',
        userId: 'SYSTEM',
        operation,
        model,
        request: { 
          prompt: messages[messages.length - 1]?.content,
          temperature,
          maxTokens
        },
        response: {
          content,
          tokensUsed: data.usage?.total_tokens,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          responseTime,
          finishReason: data.choices?.[0]?.finish_reason
        },
        success: true,
        tokensUsed: data.usage?.total_tokens,
        cost: calculateCost(
          data.usage?.prompt_tokens,
          data.usage?.completion_tokens,
          model
        )
      });

      return {
        success: true,
        content,
        usage: data.usage,
        model: data.model,
        responseTime,
        finishReason: data.choices?.[0]?.finish_reason
      };

    } catch (error) {
      retries++;
      const responseTime = Date.now() - startTime;

      console.error(`Mistral API Error (attempt ${retries}/${mistralConfig.maxRetries}):`, 
        error.response?.data || error.message);

      if (retries > mistralConfig.maxRetries) {
        // Log failed request
        await AILog.logRequest({
          userType: 'system',
          userId: 'SYSTEM',
          operation,
          model,
          request: {
            prompt: messages[messages.length - 1]?.content,
            temperature,
            maxTokens
          },
          response: { responseTime },
          success: false,
          errorMessage: error.message,
          errorCode: error.response?.status?.toString()
        });

        throw new Error(`Mistral API error: ${error.response?.data?.message || error.message}`);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, mistralConfig.retryDelay * retries));
    }
  }
};

// ============================================================================
// COST CALCULATION
// ============================================================================

const calculateCost = (promptTokens = 0, completionTokens = 0, model) => {
  const config = mistralConfig;
  
  const promptCost = (promptTokens / 1000) * config.costPerPromptToken;
  const completionCost = (completionTokens / 1000) * config.costPerCompletionToken;
  
  return promptCost + completionCost;
};

// ============================================================================
// CHALLENGE GENERATION
// ============================================================================

const generateChallenge = async ({
  // From Frontend API
  subject,
  simulationType = null,
  customTopic = null,
  difficulty = 'medium',
  numberOfQuestions = 5,
  
  // From Database
  studentLevel,
  weakCompetencies = [],
  
  // From constants.js
  simulationMetadata = null,
  
  // From Ferrari Engine
  context = {}
}) => {
  try {
    logger.info('🤖 Mistral AI: Challenge generation started', {
      subject,
      topic: simulationType || customTopic,
      difficulty,
      numberOfQuestions,
      hasMetadata: !!simulationMetadata,
      ferrariEngine: context.ferrariEngineUsed || false
    });
    
    // ====================================================================
    // BUILD SYSTEM PROMPT
    // ====================================================================
    
    const systemPrompt = `You are an expert ${subject} educator creating NEP 2020 aligned challenges for Class ${studentLevel} students.

CRITICAL RULES:
1. Create EXACTLY ${numberOfQuestions} questions
2. Subject: ${subject}
3. Difficulty: ${difficulty}
4. Output ONLY valid JSON (NO markdown, NO backticks, NO extra text)

QUESTION TYPES - MIX THESE AUTOMATICALLY:
- MCQ: Multiple choice with 4 options
- SHORT_ANSWER: Brief text response (1-3 sentences)
- NUMERICAL: Numeric answer with units
- REASONING: Detailed explanation required

AUTOMATIC TYPE DISTRIBUTION BY DIFFICULTY:
${difficulty === 'easy' ? '- Easy: 60% MCQ, 20% SHORT_ANSWER, 10% NUMERICAL, 10% REASONING' : ''}
${difficulty === 'medium' ? '- Medium: 40% MCQ, 30% SHORT_ANSWER, 20% NUMERICAL, 10% REASONING' : ''}
${difficulty === 'hard' ? '- Hard: 20% MCQ, 20% SHORT_ANSWER, 30% NUMERICAL, 30% REASONING' : ''}

${simulationType && simulationMetadata ? `
═══════════════════════════════════════════════════════════════
SIMULATION-BASED CHALLENGE
═══════════════════════════════════════════════════════════════
Simulation: ${simulationType}

TOPICS COVERED BY THIS SIMULATION:
${simulationMetadata.topics.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}
${simulationMetadata.topics.length > 10 ? `... and ${simulationMetadata.topics.length - 10} more topics` : ''}

TOOLS AVAILABLE IN SIMULATION:
${simulationMetadata.tools.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}
${simulationMetadata.tools.length > 10 ? `... and ${simulationMetadata.tools.length - 10} more tools` : ''}

DIFFICULTY FACTORS TO CONSIDER:
${simulationMetadata.difficultyFactors.slice(0, 8).map((f, i) => `${i + 1}. ${f}`).join('\n')}
${simulationMetadata.difficultyFactors.length > 8 ? `... and ${simulationMetadata.difficultyFactors.length - 8} more factors` : ''}

IMPORTANT SIMULATION RULES:
- ALL questions MUST be answerable using ONLY the simulation tools listed above
- Questions should guide students to use specific tools
- Questions should involve interactions with the simulation
- Avoid questions requiring external calculations or knowledge beyond the simulation
- Reference simulation observations and measurements
═══════════════════════════════════════════════════════════════
` : ''}

${customTopic ? `
═══════════════════════════════════════════════════════════════
CUSTOM TOPIC CHALLENGE
═══════════════════════════════════════════════════════════════
Topic: "${customTopic}"

REQUIREMENTS:
- ALL questions must be directly related to this specific topic
- Cover different aspects of the topic progressively
- Start with foundational concepts, build to advanced
- Ensure questions are appropriate for Class ${studentLevel}
═══════════════════════════════════════════════════════════════
` : ''}

NEP 2020 COMPETENCIES (include in each question):
- critical-thinking
- problem-solving  
- scientific-temper
- analytical-reasoning
- creativity

OUTPUT FORMAT (STRICT JSON - NO MARKDOWN):
{
  "title": "Engaging challenge title",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "type": "MCQ",
      "question": "Clear question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "REQUIRED - MUST ALWAYS BE PROVIDED",
      "explanation": "Detailed explanation of why this is correct",
      "competencies": ["critical-thinking", "problem-solving"],
      "points": 100,
      "hint": "Helpful hint if student struggles"
    }
  ]
}`;

    // ====================================================================
    // BUILD USER PROMPT
    // ====================================================================
    
    let userPrompt = `Generate ${numberOfQuestions} ${difficulty} difficulty questions for Class ${studentLevel} students.

CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject: ${subject}
Topic: ${simulationType || customTopic}
Topic Type: ${simulationType ? 'Simulation-based' : 'Custom topic'}
Difficulty: ${difficulty}
Number of Questions: ${numberOfQuestions}
Student Level: Class ${studentLevel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${weakCompetencies.length > 0 ? `
STUDENT WEAK AREAS (give extra focus):
${weakCompetencies.slice(0, 4).map((c, i) => `${i + 1}. ${c}`).join('\n')}
` : ''}

${context.irtAbility ? `
FERRARI ENGINE INSIGHTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IRT Student Ability: ${context.irtAbility.toFixed(3)}
Expected Success Rate: ~${((context.irtAbility > 0 ? 60 + (context.irtAbility * 10) : 50)).toFixed(0)}%
${context.pidAdjustment ? `PID Adjustment: ${context.pidAdjustment.toFixed(3)}` : ''}
${context.recentAvgScore ? `Recent Performance: ${context.recentAvgScore.toFixed(1)}%` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This data suggests the student needs questions at ${difficulty} level.
Calibrate question complexity accordingly.
` : ''}

${simulationMetadata ? `
SIMULATION GUIDANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For EACH question:
1. Specify which simulation tools the student should use
2. Describe what they should observe or measure
3. Ask them to analyze simulation results
4. Ensure questions build on simulation capabilities

Example question structure:
"Using the [TOOL NAME], set [PARAMETER] to [VALUE]. 
Observe [MEASUREMENT]. What do you notice about [CONCEPT]?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

REQUIREMENTS:
✓ Mix question types (MCQ, SHORT_ANSWER, NUMERICAL, REASONING)
✓ Progressive difficulty (easier → harder)
✓ Include competencies in each question
✓ Provide clear, educational explanations
✓ Add helpful hints for student learning
${simulationType ? '✓ Questions must use simulation tools' : ''}
${customTopic ? '✓ All questions relate to the custom topic' : ''}

Generate the challenge now. Output ONLY the JSON object. No markdown, no backticks, no extra text.`;

    // ====================================================================
    // CALL MISTRAL AI
    // ====================================================================
    
    const startTime = Date.now();
    
    const response = await callMistralAPI({
      operation: 'challenge_generation',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 3000
    });
    
    const responseTime = Date.now() - startTime;
    
    logger.info(`✅ Mistral AI responded in ${responseTime}ms`);
    
    // ====================================================================
    // PARSE & VALIDATE RESPONSE
    // ====================================================================
    
    let challengeData;
    try {
      // Remove markdown code blocks if present
      let cleanContent = response.content.trim();
      
      // Remove ```json and ``` markers
      cleanContent = cleanContent.replace(/^```json\s*/i, '');
      cleanContent = cleanContent.replace(/^```\s*/, '');
      cleanContent = cleanContent.replace(/```\s*$/, '');
      cleanContent = cleanContent.trim();
      
      // Parse JSON
      challengeData = JSON.parse(cleanContent);
      
      logger.info('✅ Successfully parsed AI response');
      
    } catch (parseError) {
      logger.error('❌ JSON parse failed:', parseError.message);
      logger.error('Raw response (first 500 chars):', response.content.substring(0, 500));
      throw new Error('AI returned invalid JSON format');
    }
    
    // Validate structure
    if (!challengeData.questions || !Array.isArray(challengeData.questions)) {
      throw new Error('Response missing questions array');
    }
    
    if (challengeData.questions.length === 0) {
      throw new Error('AI generated 0 questions');
    }
    
    if (challengeData.questions.length !== numberOfQuestions) {
      logger.warn(`⚠️ Expected ${numberOfQuestions} questions, got ${challengeData.questions.length}`);
    }
    
    // Validate each question
    challengeData.questions.forEach((q, index) => {
      if (!q.question) {
        throw new Error(`Question ${index + 1} missing question text`);
      }
      if (!q.correctAnswer) {
        throw new Error(`Question ${index + 1} missing correct answer`);
      }
      if (!q.type) {
        q.type = 'SHORT_ANSWER'; // Default
        logger.warn(`Question ${index + 1} missing type, defaulting to SHORT_ANSWER`);
      }
      if (q.type === 'MCQ' && (!q.options || q.options.length < 2)) {
        throw new Error(`Question ${index + 1} is MCQ but has no options`);
      }
      if (!q.competencies || q.competencies.length === 0) {
        q.competencies = ['critical-thinking']; // Default
      }
    });
    
    logger.info(`✅ Validated ${challengeData.questions.length} questions`);
    
    // Log question type distribution
    const typeDistribution = challengeData.questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {});
    
    logger.info('📊 Question type distribution:', typeDistribution);
    
    // ====================================================================
    // RETURN FORMATTED RESPONSE
    // ====================================================================
    
    return {
      success: true,
      title: challengeData.title || `${subject} Challenge - ${simulationType || customTopic}`,
      difficulty: challengeData.difficulty || difficulty,
      questions: challengeData.questions,
      totalPoints: numberOfQuestions * 100,
      passingScore: 70,
      estimatedTime: Math.max(10, numberOfQuestions * 2),
      
      // Metadata
      metadata: {
        model: response.model || 'mistral-large-2411',
        responseTime: responseTime,
        simulationUsed: !!simulationType,
        customTopicUsed: !!customTopic,
        ferrariEngineUsed: context.ferrariEngineUsed || false,
        questionTypeDistribution: typeDistribution
      },
      
      tokensUsed: response.usage?.total_tokens || 0,
      cost: calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        response.model || 'mistral-large-2411'
      )
    };
    
  } catch (error) {
    logger.error('❌ Mistral AI generation error:', error);
    throw error;
  }
};

// ============================================================================
// REASONING SIGNAL EXTRACTION
// ============================================================================

const extractReasoningSignals = async ({
  simulatorId,
  challenge,
  studentSubmission
}) => {
  const systemPrompt = `
You are an analysis engine.
DO NOT grade. DO NOT teach.
ONLY extract machine-readable signals.
Output STRICT JSON only.
`;

  const userPrompt = `
SIMULATOR CONTEXT: ${JSON.stringify(SIM_CONTEXTS[simulatorId], null, 2)}
CHALLENGE: ${JSON.stringify(challenge, null, 2)}
STUDENT SUBMISSION: ${JSON.stringify(studentSubmission, null, 2)}

EXTRACT:
{
  "primary_answer_correct": boolean,
  "reasoning_quality": "low|medium|high",
  "uses_correct_simulator_concepts": boolean,
  "mentions_key_topics": [],
  "misconception_tags": []
}
`;

  const response = await callMistralAPI({
    operation: 'reasoning_extraction',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    maxTokens: 1000
  });

  try {
    return JSON.parse(response.content);
  } catch (error) {
    throw new Error('Failed to parse reasoning signals: ' + error.message);
  }
};

// ============================================================================
// FEEDBACK GENERATION
// ============================================================================

const generateFeedback = async (options) => {
  const systemPrompt = `You are a supportive educator providing feedback.`;
  const userPrompt = JSON.stringify(options, null, 2);

  const response = await callMistralAPI({
    operation: 'feedback_generation',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    maxTokens: 500
  });

  return { 
    success: true, 
    feedback: response.content,
    metadata: {
      model: response.model,
      tokensUsed: response.usage?.total_tokens,
      cost: calculateCost(
        response.usage?.prompt_tokens,
        response.usage?.completion_tokens,
        response.model
      )
    }
  };
};

// ============================================================================
// NEP REPORT GENERATION
// ============================================================================

const generateNEPReport = async (options) => {
  const systemPrompt = `
You are an official educational assessment report generator.

MANDATORY RULES:
- Follow NEP 2020 competency-based assessment principles
- Map EACH competency to a ledger hash entry
- Use ONLY the data provided in input
- DO NOT invent scores, hashes, events, or competencies
- EXACTLY 12 competencies must be reported
- CPI values must be between 0.0 and 1.0
- Output STRICT JSON only

This report will be used for government audits and CBSE inspections.
Accuracy, neutrality, and structural correctness are mandatory.
`;

  const userPrompt = `
Generate a NEP 2020–aligned student progress report with
DIRECT MAPPING between competencies and ledger hash entries.

AUTHORITATIVE INPUT DATA:
${JSON.stringify(options, null, 2)}

OUTPUT STRUCTURE (STRICT JSON):
{
  "studentProfile": {
    "studentId": "string",
    "name": "string",
    "class": "string",
    "section": "string",
    "schoolId": "string"
  },
  "ledgerMetadata": {
    "ledgerBlockId": "string",
    "merkleRoot": "string",
    "reportHash": "string",
    "verificationStatus": "verified | unverified"
  },
  "reportMeta": {
    "period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "generatedAt": "ISO_TIMESTAMP",
    "alignedPolicy": "NEP-2020",
    "reportVersion": "1.0"
  },
  "analyticalSummary": {
    "totalChallenges": number,
    "ledgerEvents": number,
    "averageCPI": number,
    "smoothedCPI": number,
    "learningTrend": "improving | stable | declining",
    "driftDetected": boolean
  },
  "overallSummary": {
    "performanceLevel": "beginning | developing | proficient | advanced",
    "summaryText": "150–200 words",
    "learningTrendNarrative": "short explanation"
  },
  "competencyLedgerMap": {
    "competency_name": {
      "ledgerHash": "string",
      "cpiScore": number,
      "level": "emerging | developing | proficient | advanced",
      "evidenceSources": [],
      "ledgerProofSummary": [],
      "inspectorNotes": "string"
    }
  },
  "competencyMatrixSummary": {
    "proficientCount": number,
    "developingCount": number,
    "emergingCount": number,
    "notAssessedCount": number
  },
  "teacherRemarks": {
    "pedagogicalFocus": "string",
    "recommendedStrategy": "string"
  },
  "parentNotes": {
    "plainLanguageSummary": "string",
    "homeSupportSuggestions": []
  },
  "complianceStatement": {
    "nepAligned": true,
    "ledgerVerified": true,
    "auditReady": true
  }
}
`;

  const response = await callMistralAPI({
    operation: 'nep_report_generation',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.5,
    maxTokens: 3000
  });

  try {
    return {
      success: true,
      report: JSON.parse(response.content),
      metadata: {
        model: response.model,
        tokensUsed: response.usage?.total_tokens,
        cost: calculateCost(
          response.usage?.prompt_tokens,
          response.usage?.completion_tokens,
          response.model
        )
      }
    };
  } catch (error) {
    throw new Error('Failed to parse NEP report: ' + error.message);
  }
};

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

const generateRecommendations = async (options) => {
  const response = await callMistralAPI({
    operation: 'recommendation_generation',
    messages: [
      { role: 'user', content: JSON.stringify(options, null, 2) }
    ],
    temperature: 0.6,
    maxTokens: 1500
  });

  try {
    return { 
      success: true, 
      recommendations: JSON.parse(response.content),
      metadata: {
        model: response.model,
        tokensUsed: response.usage?.total_tokens
      }
    };
  } catch (error) {
    throw new Error('Failed to parse recommendations: ' + error.message);
  }
};

// ============================================================================
// BATCH PROCESSING
// ============================================================================

const batchProcess = async (requests) => {
  const results = [];
  for (const req of requests) {
    try {
      results.push(await callMistralAPI(req));
      await new Promise(r => setTimeout(r, 100)); // Rate limit delay
    } catch (e) {
      results.push({ success: false, error: e.message });
    }
  }
  return results;
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

const healthCheck = async () => {
  try {
    const res = await callMistralAPI({
      messages: [{ role: 'user', content: 'ping' }],
      maxTokens: 5
    });
    return { 
      status: 'healthy', 
      model: res.model,
      responseTime: res.responseTime
    };
  } catch (e) {
    return { 
      status: 'unhealthy', 
      error: e.message 
    };
  }
};

/**
 * Evaluate student response
 */
const evaluateResponse = async ({
  question,
  questionType,
  correctAnswer,
  studentAnswer,
  studentReasoning = '',
  expectedExplanation = ''
}) => {
  try {
    const systemPrompt = `You are an expert educator evaluating student responses.

GRADING CRITERIA:
Answer Correctness: 0-70 points
- Completely correct: 70
- Mostly correct: 50-60
- Partially correct: 30-40
- Incorrect: 0-20

Reasoning Quality: 0-30 points
- Excellent reasoning: 25-30
- Good reasoning: 15-24
- Weak reasoning: 5-14
- No/poor reasoning: 0-4

OUTPUT (JSON only):
{
  "answerCorrect": true|false,
  "answerScore": 0-70,
  "reasoningScore": 0-30,
  "totalScore": 0-100,
  "feedback": "Constructive feedback",
  "strengths": ["strength1"],
  "improvements": ["area1"]
}`;

    const userPrompt = `QUESTION: ${question}
TYPE: ${questionType}
CORRECT: ${correctAnswer}
STUDENT: ${studentAnswer}
${studentReasoning ? `REASONING: ${studentReasoning}` : ''}

Evaluate. Output JSON only.`;

    const response = await callMistralAPI({
      operation: 'response_evaluation',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      maxTokens: 1000
    });
    
    let evaluation;
    try {
      let clean = response.content.trim();
      clean = clean.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      evaluation = JSON.parse(clean);
    } catch {
      // Fallback
      const isCorrect = studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      return {
        answerCorrect: isCorrect,
        answerScore: isCorrect ? 70 : 0,
        reasoningScore: studentReasoning ? 15 : 0,
        totalScore: (isCorrect ? 70 : 0) + (studentReasoning ? 15 : 0),
        feedback: isCorrect ? 'Correct!' : 'Incorrect.',
        strengths: isCorrect ? ['Correct answer'] : [],
        improvements: isCorrect ? [] : ['Review concept'],
        tokensUsed: response.usage?.total_tokens || 0
      };
    }
    
    return {
      success: true,
      ...evaluation,
      tokensUsed: response.usage?.total_tokens || 0
    };
    
  } catch (error) {
    logger.error('Evaluation error:', error);
    throw error;
  }
};


// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  callMistralAPI,
  calculateCost,
  generateChallenge,
  extractReasoningSignals,
  generateFeedback,
  generateNEPReport,
  generateRecommendations,
  batchProcess,
  healthCheck,
  evaluateResponse,
  
  // Export config for reference
  config: mistralConfig
};