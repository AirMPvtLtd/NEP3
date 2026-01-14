// config/mistral.js
/**
 * MISTRAL AI CONFIGURATION
 * Configuration and utilities for Mistral AI integration
 * 
 * Features:
 * - API configuration
 * - Request helpers
 * - Error handling
 * - Rate limiting
 * - Response validation
 * 
 * @module config/mistral
 */

const axios = require('axios');
const logger = require('../utils/logger');

// ============================================================================
// MISTRAL AI CONFIGURATION
// ============================================================================

const MISTRAL_CONFIG = {
  // API Configuration
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: 'https://api.mistral.ai/v1',
  
  // Model Configuration
  model: process.env.MISTRAL_MODEL || 'mistral-large-2411',
  fallbackModel: process.env.MISTRAL_FALLBACK_MODEL || 'mistral-small-latest',
  
  // Generation Parameters
  temperature: parseFloat(process.env.MISTRAL_TEMPERATURE) || 0.7,
  maxTokens: parseInt(process.env.MISTRAL_MAX_TOKENS) || 2000,
  topP: 1.0,
  
  // Request Settings
  timeout: parseInt(process.env.AI_EVALUATION_TIMEOUT_MS) || 30000,
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  
  // Rate Limiting (requests per minute)
  rateLimit: 60,
  rateLimitWindow: 60000 // 1 minute
};

// Validate API key on startup
if (!MISTRAL_CONFIG.apiKey) {
  logger.error('❌ MISTRAL_API_KEY is not defined in environment variables');
  logger.error('Get your API key at: https://console.mistral.ai/');
  
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    logger.warn('⚠️ Running without Mistral AI in development mode');
  }
}

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

const mistralAxios = axios.create({
  baseURL: MISTRAL_CONFIG.baseURL,
  timeout: MISTRAL_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MISTRAL_CONFIG.apiKey}`
  }
});

// Request interceptor (logging)
mistralAxios.interceptors.request.use(
  (config) => {
    logger.debug(`Mistral AI Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('Mistral AI Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor (logging & error handling)
mistralAxios.interceptors.response.use(
  (response) => {
    logger.debug(`Mistral AI Response: ${response.status} ${response.statusText}`);
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error(`Mistral AI Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else if (error.request) {
      logger.error('Mistral AI: No response received');
    } else {
      logger.error('Mistral AI Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// RATE LIMITING
// ============================================================================

let requestCount = 0;
let windowStart = Date.now();

/**
 * Check if rate limit exceeded
 * @returns {boolean} True if rate limit exceeded
 */
const isRateLimitExceeded = () => {
  const now = Date.now();
  
  // Reset window if time passed
  if (now - windowStart >= MISTRAL_CONFIG.rateLimitWindow) {
    requestCount = 0;
    windowStart = now;
  }
  
  return requestCount >= MISTRAL_CONFIG.rateLimit;
};

/**
 * Increment request count
 */
const incrementRequestCount = () => {
  requestCount++;
};

/**
 * Get remaining requests in current window
 * @returns {number} Remaining requests
 */
const getRemainingRequests = () => {
  const now = Date.now();
  
  if (now - windowStart >= MISTRAL_CONFIG.rateLimitWindow) {
    return MISTRAL_CONFIG.rateLimit;
  }
  
  return Math.max(0, MISTRAL_CONFIG.rateLimit - requestCount);
};

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

/**
 * Call Mistral AI Chat Completion
 * 
 * @param {Array} messages - Array of message objects
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} API response
 */
const chatCompletion = async (messages, options = {}) => {
  try {
    // Check rate limit
    if (isRateLimitExceeded()) {
      throw new Error('Mistral AI rate limit exceeded. Please try again later.');
    }
    
    // Prepare request body
    const requestBody = {
      model: options.model || MISTRAL_CONFIG.model,
      messages: messages,
      temperature: options.temperature || MISTRAL_CONFIG.temperature,
      max_tokens: options.maxTokens || MISTRAL_CONFIG.maxTokens,
      top_p: options.topP || MISTRAL_CONFIG.topP,
      stream: false
    };
    
    // Add response format if specified
    if (options.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }
    
    // Make API request with retry logic
    const response = await retryRequest(async () => {
      return await mistralAxios.post('/chat/completions', requestBody);
    });
    
    // Increment rate limit counter
    incrementRequestCount();
    
    // Extract and return response
    return {
      success: true,
      content: response.data.choices[0].message.content,
      model: response.data.model,
      usage: response.data.usage,
      finishReason: response.data.choices[0].finish_reason
    };
    
  } catch (error) {
    logger.error('Mistral AI chat completion error:', error.message);
    
    // Try fallback model if primary fails
    if (options.useFallback && options.model !== MISTRAL_CONFIG.fallbackModel) {
      logger.info('Attempting with fallback model...');
      return await chatCompletion(messages, {
        ...options,
        model: MISTRAL_CONFIG.fallbackModel,
        useFallback: false
      });
    }
    
    throw new Error(`Mistral AI error: ${error.message}`);
  }
};

/**
 * Retry Request with Exponential Backoff
 * 
 * @param {Function} requestFn - Function that makes the request
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Object>} Response
 */
const retryRequest = async (requestFn, retries = MISTRAL_CONFIG.maxRetries) => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && isRetryableError(error)) {
      const delay = MISTRAL_CONFIG.retryDelay * (MISTRAL_CONFIG.maxRetries - retries + 1);
      logger.warn(`Retrying Mistral AI request in ${delay}ms... (${retries} retries left)`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return await retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @returns {boolean} True if retryable
 */
const isRetryableError = (error) => {
  if (!error.response) return true; // Network errors are retryable
  
  const status = error.response.status;
  
  // Retry on server errors (5xx) and rate limit (429)
  return status === 429 || (status >= 500 && status < 600);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate Challenge Questions
 * Specialized function for challenge generation
 * 
 * @param {Object} params - Challenge parameters
 * @returns {Promise<Object>} Generated challenge
 */
const generateChallenge = async (params) => {
  const {
    simulationType,
    difficulty,
    studentLevel,
    weakCompetencies,
    numberOfQuestions = 5
  } = params;
  
  const prompt = `
You are an expert educational content creator specializing in ${simulationType}.

Generate ${numberOfQuestions} ${difficulty} difficulty questions suitable for a student at level ${studentLevel}.

Focus areas (student's weak competencies): ${weakCompetencies.join(', ')}

IMPORTANT INSTRUCTIONS:
1. Questions must be educational and appropriate
2. Include clear, correct answers
3. Provide detailed explanations
4. Map each question to NEP 2020 competencies
5. Ensure questions test understanding, not just memorization

Return ONLY a JSON object with this exact structure:
{
  "title": "Challenge title",
  "difficulty": "${difficulty}",
  "estimatedTime": <minutes>,
  "questions": [
    {
      "questionId": "Q1",
      "type": "mcq" or "numerical",
      "question": "Question text",
      "options": ["A", "B", "C", "D"] (for MCQ only),
      "correctAnswer": "Answer",
      "explanation": "Detailed explanation",
      "competencies": ["competency1", "competency2"],
      "points": 100
    }
  ],
  "totalPoints": <total>,
  "passingScore": 70
}

Generate high-quality educational content now:
`;

  try {
    const response = await chatCompletion(
      [{ role: 'user', content: prompt }],
      {
        responseFormat: { type: 'json_object' },
        useFallback: true
      }
    );
    
    // Parse JSON response
    const challenge = JSON.parse(response.content);
    
    // Validate challenge structure
    if (!validateChallenge(challenge)) {
      throw new Error('Invalid challenge structure from AI');
    }
    
    return challenge;
    
  } catch (error) {
    logger.error('Error generating challenge:', error.message);
    throw error;
  }
};

/**
 * Evaluate Student Response
 * Specialized function for answer evaluation
 * 
 * @param {Object} params - Evaluation parameters
 * @returns {Promise<Object>} Evaluation result
 */
const evaluateResponse = async (params) => {
  const {
    question,
    correctAnswer,
    studentAnswer,
    studentReasoning,
    expectedExplanation
  } = params;
  
  const prompt = `
You are an expert educational evaluator.

Question: ${question}
Correct Answer: ${correctAnswer}
Expected Explanation: ${expectedExplanation}

Student's Answer: "${studentAnswer}"
Student's Reasoning: "${studentReasoning}"

Evaluate the student's response and return ONLY a JSON object:
{
  "answerCorrect": true/false,
  "answerScore": <0-70>,
  "reasoningScore": <0-30>,
  "feedback": "Constructive feedback",
  "strengths": ["What student did well"],
  "improvements": ["Areas to improve"]
}

Scoring Guidelines:
- Answer Score (0-70): 70 if correct, 0 if wrong
- Reasoning Score (0-30):
  * 25-30: Excellent (formula + steps + units + logic)
  * 15-24: Good (formula + basic steps)
  * 5-14: Fair (some understanding shown)
  * 0-4: Poor (no clear reasoning)

Be encouraging but honest. Focus on learning, not just correctness.
`;

  try {
    const response = await chatCompletion(
      [{ role: 'user', content: prompt }],
      {
        responseFormat: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for consistent scoring
        useFallback: true
      }
    );
    
    const evaluation = JSON.parse(response.content);
    
    // Validate evaluation structure
    if (!validateEvaluation(evaluation)) {
      throw new Error('Invalid evaluation structure from AI');
    }
    
    return evaluation;
    
  } catch (error) {
    logger.error('Error evaluating response:', error.message);
    throw error;
  }
};

/**
 * Generate Feedback
 * Generate personalized feedback for student
 * 
 * @param {Object} params - Feedback parameters
 * @returns {Promise<string>} Generated feedback
 */
const generateFeedback = async (params) => {
  const {
    studentName,
    challengeResult,
    strengths,
    weaknesses,
    suggestions
  } = params;
  
  const prompt = `
Generate encouraging, personalized feedback for ${studentName}.

Challenge Result: ${challengeResult.score}/100
Strengths: ${strengths.join(', ')}
Weaknesses: ${weaknesses.join(', ')}

Create a motivational message that:
1. Acknowledges their effort
2. Celebrates strengths
3. Gently suggests improvements
4. Encourages continued learning

Keep it friendly, positive, and under 150 words.
`;

  try {
    const response = await chatCompletion(
      [{ role: 'user', content: prompt }],
      { temperature: 0.8 } // Higher temperature for creative feedback
    );
    
    return response.content;
    
  } catch (error) {
    logger.error('Error generating feedback:', error.message);
    
    // Return fallback feedback
    return `Great effort, ${studentName}! You scored ${challengeResult.score}/100. Keep practicing and you'll improve even more!`;
  }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate Challenge Structure
 * @param {Object} challenge - Challenge object
 * @returns {boolean} True if valid
 */
const validateChallenge = (challenge) => {
  if (!challenge || typeof challenge !== 'object') return false;
  
  const required = ['title', 'difficulty', 'questions', 'totalPoints'];
  for (const field of required) {
    if (!(field in challenge)) return false;
  }
  
  if (!Array.isArray(challenge.questions) || challenge.questions.length === 0) {
    return false;
  }
  
  // Validate each question
  for (const q of challenge.questions) {
    if (!q.question || !q.correctAnswer || !q.explanation) {
      return false;
    }
  }
  
  return true;
};

/**
 * Validate Evaluation Structure
 * @param {Object} evaluation - Evaluation object
 * @returns {boolean} True if valid
 */
const validateEvaluation = (evaluation) => {
  if (!evaluation || typeof evaluation !== 'object') return false;
  
  const required = ['answerCorrect', 'answerScore', 'reasoningScore', 'feedback'];
  for (const field of required) {
    if (!(field in evaluation)) return false;
  }
  
  // Validate score ranges
  if (evaluation.answerScore < 0 || evaluation.answerScore > 70) return false;
  if (evaluation.reasoningScore < 0 || evaluation.reasoningScore > 30) return false;
  
  return true;
};

// ============================================================================
// STATISTICS & MONITORING
// ============================================================================

let totalRequests = 0;
let totalErrors = 0;
let totalTokensUsed = 0;

/**
 * Get API Statistics
 * @returns {Object} Usage statistics
 */
const getStatistics = () => {
  return {
    totalRequests,
    totalErrors,
    totalTokensUsed,
    errorRate: totalRequests > 0 ? (totalErrors / totalRequests * 100).toFixed(2) + '%' : '0%',
    remainingRequests: getRemainingRequests(),
    rateLimit: MISTRAL_CONFIG.rateLimit
  };
};

/**
 * Reset Statistics
 */
const resetStatistics = () => {
  totalRequests = 0;
  totalErrors = 0;
  totalTokensUsed = 0;
  requestCount = 0;
  windowStart = Date.now();
  logger.info('Mistral AI statistics reset');
};

// Track requests
mistralAxios.interceptors.response.use(
  (response) => {
    totalRequests++;
    if (response.data?.usage?.total_tokens) {
      totalTokensUsed += response.data.usage.total_tokens;
    }
    return response;
  },
  (error) => {
    totalRequests++;
    totalErrors++;
    return Promise.reject(error);
  }
);

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Configuration
  MISTRAL_CONFIG,
  
  // Core Functions
  chatCompletion,
  
  // Helper Functions
  generateChallenge,
  evaluateResponse,
  generateFeedback,
  
  // Validation
  validateChallenge,
  validateEvaluation,
  
  // Rate Limiting
  isRateLimitExceeded,
  getRemainingRequests,
  
  // Statistics
  getStatistics,
  resetStatistics,
  
  // Axios instance (for advanced use)
  mistralAxios
};