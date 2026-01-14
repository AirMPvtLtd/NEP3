// controllers/challenge.controller.js
/**
 * CHALLENGE CONTROLLER - COMPLETE PRODUCTION VERSION
 * Challenge operations - fully integrated with all models
 * 
 * @module controllers/challengeController
 */

const {
  Challenge,
  Student,
  Teacher,
  Activity,
  ChallengeLimit,
  AILog
} = require('../models');
const { generateChallenge: generateAIChallenge, evaluateResponse } = require('../config/mistral');
const { isValidSimulation, getSimulation } = require('../utils/Simulationhelpers');
const { CHALLENGE_LIMITS } = require('../config/constants');
const logger = require('../utils/logger');

// ============================================================================
// CHALLENGE GENERATION
// ============================================================================

/**
 * @desc    Generate new challenge
 * @route   POST /api/challenges/generate
 * @access  Private (Student)
 */
exports.generateChallenge = async (req, res) => {
  try {
    const { simulationType, difficulty, numberOfQuestions = 5 } = req.body;
    
    // Validate simulation type
    if (!isValidSimulation(simulationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid simulation type'
      });
    }
    
    // Get student
    const student = await Student.findById(req.user.userId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check if student can generate challenge
    const canGenerate = student.canGenerateChallenge(
      simulationType,
      CHALLENGE_LIMITS.DAILY_LIMIT,
      CHALLENGE_LIMITS.PER_SIMULATION_LIMIT
    );
    
    if (!canGenerate.allowed) {
      return res.status(429).json({
        success: false,
        message: canGenerate.reason === 'daily_limit'
          ? 'Daily challenge limit reached. Please try again tomorrow.'
          : `You have reached the limit for ${simulationType} challenges today.`,
        remaining: canGenerate.remaining
      });
    }
    
    // Generate challenge using Mistral AI
    logger.info(`Generating challenge for student ${student.studentId}`, {
      simulationType,
      difficulty,
      studentLevel: student.class
    });
    
    const startTime = Date.now();
    
    const challengeData = await generateAIChallenge({
      simulationType,
      difficulty: difficulty || 'medium',
      studentLevel: student.class,
      weakCompetencies: student.weakCompetencies,
      numberOfQuestions
    });
    
    const generationTime = Date.now() - startTime;
    
    // Validate generated challenge
    if (!challengeData || !challengeData.questions || challengeData.questions.length === 0) {
      throw new Error('Failed to generate valid challenge');
    }
    
    // Create challenge in database
    const challenge = await Challenge.create({
      studentId: student.studentId,
      schoolId: student.schoolId,
      teacherId: student.teacherId,
      simulationType,
      difficulty: challengeData.difficulty || difficulty || 'medium',
      title: challengeData.title,
      questions: challengeData.questions.map((q, index) => ({
        questionId: `Q${index + 1}`,
        type: q.type || 'SHORT_ANSWER',
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        competencies: q.competencies || [],
        points: q.points || 100
      })),
      totalPoints: challengeData.totalPoints || (numberOfQuestions * 100),
      passingScore: challengeData.passingScore || 70,
      estimatedTime: challengeData.estimatedTime || 10,
      status: 'generated',
      aiMetadata: {
        mistralModel: process.env.MISTRAL_MODEL || 'mistral-large-2411',
        tokensUsed: challengeData.tokensUsed || 0,
        generationTime,
        metaLearningApplied: false,
        kalmanFilterApplied: false,
        pidControllerApplied: false
      }
    });
    
    // Record challenge generation
    await student.recordChallengeGeneration(simulationType);
    
    // Update student streak
    await student.updateStreak();
    
    // Log AI usage
    await AILog.create({
      userId: student._id,
      userType: 'student',
      schoolId: student.schoolId,
      operation: 'challenge_generation',
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      tokensUsed: challengeData.tokensUsed || 0,
      cost: (challengeData.tokensUsed || 0) * 0.000002, // Estimated cost
      responseTime: generationTime,
      success: true
    });
    
    // Log activity
    await Activity.log({
      userId: student._id.toString(),
      userType: 'student',
      schoolId: student.schoolId,
      activityType: 'challenge_generated',
      action: `Challenge generated for ${simulationType}`,
      metadata: {
        challengeId: challenge.challengeId,
        simulationType,
        difficulty: challenge.difficulty,
        numberOfQuestions
      },
      ipAddress: req.ip,
      success: true
    });
    
    logger.info(`Challenge ${challenge.challengeId} generated successfully in ${generationTime}ms`);
    
    res.status(201).json({
      success: true,
      message: 'Challenge generated successfully',
      data: {
        challenge: {
          challengeId: challenge.challengeId,
          title: challenge.title,
          simulationType: challenge.simulationType,
          difficulty: challenge.difficulty,
          questions: challenge.questions.map(q => ({
            questionId: q.questionId,
            type: q.type,
            question: q.question,
            options: q.options,
            points: q.points
            // Do NOT send correctAnswer or explanation
          })),
          totalPoints: challenge.totalPoints,
          passingScore: challenge.passingScore,
          estimatedTime: challenge.estimatedTime,
          generatedAt: challenge.generatedAt
        },
        limits: {
          dailyRemaining: CHALLENGE_LIMITS.DAILY_LIMIT - (student.challengeLimits.totalToday + 1),
          simulationRemaining: CHALLENGE_LIMITS.PER_SIMULATION_LIMIT - ((student.challengeLimits.bySimulation.get(simulationType) || 0) + 1)
        }
      }
    });
    
  } catch (error) {
    logger.error('Generate challenge error:', error);
    
    // Log failed AI operation
    await AILog.create({
      userId: req.user.userId,
      userType: 'student',
      operation: 'challenge_generation',
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      success: false,
      errorMessage: error.message
    });
    
    // Log failed activity
    await Activity.log({
      userId: req.user.userId,
      userType: 'student',
      activityType: 'challenge_generated',
      action: 'Failed to generate challenge',
      success: false,
      errorMessage: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Error generating challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Preview challenge (before generation)
 * @route   GET /api/challenges/preview
 * @access  Private (Student)
 */
exports.previewChallenge = async (req, res) => {
  try {
    const { simulationType } = req.query;
    
    if (!simulationType || !isValidSimulation(simulationType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid simulation type is required'
      });
    }
    
    const simulation = getSimulation(simulationType);
    const student = await Student.findById(req.user.userId);
    
    // Check limits
    const canGenerate = student.canGenerateChallenge(
      simulationType,
      CHALLENGE_LIMITS.DAILY_LIMIT,
      CHALLENGE_LIMITS.PER_SIMULATION_LIMIT
    );
    
    res.json({
      success: true,
      data: {
        simulation: {
          id: simulationType,
          name: simulation.name,
          type: simulation.type,
          difficulty: simulation.difficulty,
          topics: simulation.topics
        },
        limits: {
          canGenerate: canGenerate.allowed,
          dailyRemaining: canGenerate.remaining?.daily || 0,
          simulationRemaining: canGenerate.remaining?.simulation || 0,
          reason: canGenerate.reason
        },
        estimatedTime: 10,
        estimatedQuestions: 5
      }
    });
    
  } catch (error) {
    logger.error('Preview challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching preview',
      error: error.message
    });
  }
};

// ============================================================================
// CHALLENGE LIFECYCLE
// ============================================================================

/**
 * @desc    Get challenge details
 * @route   GET /api/challenges/:challengeId
 * @access  Private
 */
exports.getChallengeDetails = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Authorization check
    const isStudent = req.user.role === 'student' && challenge.studentId === req.user.studentId;
    const isTeacher = req.user.role === 'teacher' && challenge.teacherId === req.user.teacherId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isStudent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this challenge'
      });
    }
    
    // Return challenge without answers if not evaluated (for students)
    const response = {
      challengeId: challenge.challengeId,
      title: challenge.title,
      simulationType: challenge.simulationType,
      difficulty: challenge.difficulty,
      status: challenge.status,
      totalPoints: challenge.totalPoints,
      passingScore: challenge.passingScore,
      estimatedTime: challenge.estimatedTime,
      generatedAt: challenge.generatedAt,
      startedAt: challenge.startedAt,
      submittedAt: challenge.submittedAt,
      evaluatedAt: challenge.evaluatedAt
    };
    
    // Include questions without answers if not started or in progress
    if (challenge.status === 'generated' || challenge.status === 'in-progress') {
      response.questions = challenge.questions.map(q => ({
        questionId: q.questionId,
        type: q.type,
        question: q.question,
        options: q.options,
        points: q.points
      }));
    }
    
    // Include full results if evaluated (or if teacher/admin)
    if (challenge.status === 'evaluated' || isTeacher || isAdmin) {
      response.questions = challenge.questions;
      response.answers = challenge.answers;
      response.results = challenge.results;
    }
    
    res.json({
      success: true,
      data: { challenge: response }
    });
    
  } catch (error) {
    logger.error('Get challenge details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Start challenge
 * @route   POST /api/challenges/:challengeId/start
 * @access  Private (Student)
 */
exports.startChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId,
      studentId: req.user.studentId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.status !== 'generated') {
      return res.status(400).json({
        success: false,
        message: 'Challenge already started or completed'
      });
    }
    
    await challenge.start();
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'student',
      schoolId: challenge.schoolId,
      activityType: 'challenge_started',
      action: 'Challenge started',
      metadata: { challengeId: challenge.challengeId },
      success: true
    });
    
    res.json({
      success: true,
      message: 'Challenge started',
      data: {
        challengeId: challenge.challengeId,
        startedAt: challenge.startedAt,
        estimatedTime: challenge.estimatedTime
      }
    });
    
  } catch (error) {
    logger.error('Start challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Submit challenge
 * @route   POST /api/challenges/:challengeId/submit
 * @access  Private (Student)
 */
exports.submitChallenge = async (req, res) => {
  try {
    const { answers } = req.body; // Array of { questionId, studentAnswer, studentReasoning }
    
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId,
      studentId: req.user.studentId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.status === 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Challenge already evaluated'
      });
    }
    
    // Validate answers
    if (!answers || answers.length !== challenge.questions.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid number of answers'
      });
    }
    
    // Submit challenge
    await challenge.submit(answers);
    
    logger.info(`Challenge ${challenge.challengeId} submitted, starting AI evaluation`);
    
    // Trigger AI evaluation asynchronously
    setImmediate(async () => {
      try {
        await evaluateChallengeWithAI(challenge);
      } catch (evalError) {
        logger.error('Async evaluation error:', evalError);
      }
    });
    
    await Activity.log({
      userId: req.user.userId,
      userType: 'student',
      schoolId: challenge.schoolId,
      activityType: 'challenge_submitted',
      action: 'Challenge submitted',
      metadata: { challengeId: challenge.challengeId },
      success: true
    });
    
    res.json({
      success: true,
      message: 'Challenge submitted successfully. Evaluation in progress.',
      data: {
        challengeId: challenge.challengeId,
        submittedAt: challenge.submittedAt,
        status: 'submitted'
      }
    });
    
  } catch (error) {
    logger.error('Submit challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Get challenge results
 * @route   GET /api/challenges/:challengeId/results
 * @access  Private
 */
exports.getChallengeResults = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Authorization check
    const isStudent = req.user.role === 'student' && challenge.studentId === req.user.studentId;
    const isTeacher = req.user.role === 'teacher' && challenge.teacherId === req.user.teacherId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isStudent && !isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this challenge'
      });
    }
    
    if (challenge.status !== 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Challenge not yet evaluated',
        status: challenge.status
      });
    }
    
    res.json({
      success: true,
      data: {
        results: {
          challengeId: challenge.challengeId,
          title: challenge.title,
          totalScore: challenge.results.totalScore,
          percentage: challenge.results.percentage,
          passed: challenge.results.passed,
          correctAnswers: challenge.results.correctAnswers,
          totalQuestions: challenge.results.totalQuestions,
          timeSpent: challenge.results.timeSpent,
          competenciesAssessed: challenge.results.competenciesAssessed,
          evaluatedAt: challenge.evaluatedAt
        },
        questions: challenge.questions.map((q, index) => ({
          questionId: q.questionId,
          question: q.question,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          yourAnswer: challenge.answers[index]?.studentAnswer,
          yourReasoning: challenge.answers[index]?.studentReasoning,
          score: challenge.answers[index]?.finalScore,
          feedback: challenge.answers[index]?.aiEvaluation?.feedback,
          strengths: challenge.answers[index]?.aiEvaluation?.strengths,
          improvements: challenge.answers[index]?.aiEvaluation?.improvements
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get challenge results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results',
      error: error.message
    });
  }
};

/**
 * Helper function: AI Evaluation
 */
async function evaluateChallengeWithAI(challenge) {
  try {
    const startTime = Date.now();
    const evaluatedAnswers = [];
    let totalScore = 0;
    let correctAnswers = 0;
    
    // Evaluate each answer with AI
    for (let i = 0; i < challenge.answers.length; i++) {
      const answer = challenge.answers[i];
      const question = challenge.questions.find(q => q.questionId === answer.questionId);
      
      if (!question) continue;
      
      // Call Mistral AI for evaluation
      const aiEvaluation = await evaluateResponse({
        question: question.question,
        correctAnswer: question.correctAnswer,
        studentAnswer: answer.studentAnswer,
        studentReasoning: answer.studentReasoning,
        expectedExplanation: question.explanation
      });
      
      // Calculate final score (Answer: 70%, Reasoning: 30%)
      const answerScore = aiEvaluation.answerScore || 0; // 0-70
      const reasoningScore = aiEvaluation.reasoningScore || 0; // 0-30
      const finalScore = answerScore + reasoningScore;
      
      if (aiEvaluation.answerCorrect) {
        correctAnswers++;
      }
      
      totalScore += finalScore;
      
      evaluatedAnswers.push({
        questionId: answer.questionId,
        studentAnswer: answer.studentAnswer,
        studentReasoning: answer.studentReasoning,
        aiEvaluation,
        finalScore,
        evaluatedAt: new Date()
      });
    }
    
    const evaluationTime = Date.now() - startTime;
    
    // Calculate overall results
    const averageScore = totalScore / challenge.questions.length;
    const passed = averageScore >= challenge.passingScore;
    
    // Identify competencies
    const competencyScores = {};
    challenge.questions.forEach((q, index) => {
      q.competencies.forEach(comp => {
        if (!competencyScores[comp]) {
          competencyScores[comp] = [];
        }
        competencyScores[comp].push(evaluatedAnswers[index]?.finalScore || 0);
      });
    });
    
    const competenciesAssessed = Object.entries(competencyScores).map(([comp, scores]) => ({
      competency: comp,
      score: scores.reduce((a, b) => a + b, 0) / scores.length
    }));
    
    // Update challenge with results
    await challenge.evaluate({
      totalScore: averageScore,
      percentage: averageScore,
      passed,
      correctAnswers,
      totalQuestions: challenge.questions.length,
      competenciesAssessed
    });
    
    challenge.answers = evaluatedAnswers;
    challenge.aiMetadata.evaluationTime = evaluationTime;
    await challenge.save();
    
    // Log AI usage
    await AILog.create({
      userId: challenge.studentId,
      userType: 'student',
      schoolId: challenge.schoolId,
      operation: 'challenge_evaluation',
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      tokensUsed: evaluatedAnswers.reduce((sum, a) => sum + (a.aiEvaluation?.tokensUsed || 0), 0),
      cost: evaluatedAnswers.reduce((sum, a) => sum + (a.aiEvaluation?.tokensUsed || 0), 0) * 0.000002,
      responseTime: evaluationTime,
      success: true
    });
    
    // Update student performance
    const student = await Student.findOne({ studentId: challenge.studentId });
    
    if (student) {
      // Add challenge to recent history
      await student.addChallengeResult(
        challenge.challengeId,
        averageScore,
        challenge.simulationType
      );
      
      // Update competency scores
      for (const compAssessment of competenciesAssessed) {
        await student.updateCompetency(compAssessment.competency, compAssessment.score);
      }
      
      await student.save();
    }
    
    // Log activity
    await Activity.log({
      userId: challenge.studentId,
      userType: 'student',
      schoolId: challenge.schoolId,
      activityType: 'challenge_evaluated',
      action: `Challenge evaluated: ${averageScore.toFixed(2)}% (${passed ? 'PASSED' : 'FAILED'})`,
      metadata: {
        challengeId: challenge.challengeId,
        score: averageScore,
        passed
      },
      success: true
    });
    
    logger.info(`Challenge ${challenge.challengeId} evaluated: ${averageScore}% (${passed ? 'PASSED' : 'FAILED'}) in ${evaluationTime}ms`);
    
  } catch (error) {
    logger.error('Evaluation error:', error);
    
    // Log failed AI operation
    await AILog.create({
      userId: challenge.studentId,
      userType: 'student',
      schoolId: challenge.schoolId,
      operation: 'challenge_evaluation',
      model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
      success: false,
      errorMessage: error.message
    });
    
    throw error;
  }
}

// ============================================================================
// CHALLENGE EVALUATION
// ============================================================================

/**
 * @desc    Evaluate challenge (manual trigger)
 * @route   POST /api/challenges/:challengeId/evaluate
 * @access  Private (Teacher/Admin)
 */
exports.evaluateChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Challenge must be in submitted status'
      });
    }
    
    // Trigger evaluation
    await evaluateChallengeWithAI(challenge);
    
    res.json({
      success: true,
      message: 'Challenge evaluated successfully',
      data: {
        challengeId: challenge.challengeId,
        results: challenge.results
      }
    });
    
  } catch (error) {
    logger.error('Evaluate challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Error evaluating challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Re-evaluate challenge
 * @route   POST /api/challenges/:challengeId/re-evaluate
 * @access  Private (Admin)
 */
exports.reEvaluateChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.status !== 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Challenge must be evaluated first'
      });
    }
    
    // Store old results
    const oldResults = { ...challenge.results };
    
    // Re-evaluate
    challenge.status = 'submitted'; // Reset status
    await challenge.save();
    
    await evaluateChallengeWithAI(challenge);
    
    await Activity.log({
      userId: req.user.userId,
      userType: req.user.role,
      activityType: 'challenge_re_evaluated',
      action: 'Challenge re-evaluated',
      metadata: {
        challengeId: challenge.challengeId,
        oldScore: oldResults.totalScore,
        newScore: challenge.results.totalScore
      },
      success: true
    });
    
    res.json({
      success: true,
      message: 'Challenge re-evaluated successfully',
      data: {
        challengeId: challenge.challengeId,
        oldResults,
        newResults: challenge.results
      }
    });
    
  } catch (error) {
    logger.error('Re-evaluate challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Error re-evaluating challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Override challenge score
 * @route   PUT /api/challenges/:challengeId/override
 * @access  Private (Teacher)
 */
exports.overrideChallengeScore = async (req, res) => {
  try {
    const { score, feedback } = req.body;
    
    if (score === undefined || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: 'Valid score (0-100) is required'
      });
    }
    
    const challenge = await Challenge.findOne({
      challengeId: req.params.challengeId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    if (challenge.status !== 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Can only override score for evaluated challenges'
      });
    }
    
    await challenge.overrideScore(req.user.userId, score, feedback);
    
    await Activity.log({
      userId: req.user.userId,
      userType: req.user.role,
      activityType: 'score_override',
      action: 'Challenge score overridden',
      metadata: {
        challengeId: challenge.challengeId,
        originalScore: challenge.results.totalScore,
        newScore: score
      },
      success: true
    });
    
    res.json({
      success: true,
      message: 'Score overridden successfully',
      data: {
        challenge: {
          challengeId: challenge.challengeId,
          results: challenge.results
        }
      }
    });
    
  } catch (error) {
    logger.error('Override challenge score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error overriding score',
      error: error.message
    });
  }
};

// ============================================================================
// CHALLENGE HISTORY
// ============================================================================

/**
 * @desc    Get student challenge history
 * @route   GET /api/challenges/student/:studentId
 * @access  Private
 */
exports.getStudentChallenges = async (req, res) => {
  try {
    const { status, simulationType, limit = 50, page = 1 } = req.query;
    
    const query = { studentId: req.params.studentId };
    
    if (status) {
      query.status = status;
    }
    
    if (simulationType) {
      query.simulationType = simulationType;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const challenges = await Challenge.find(query)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt');
    
    const total = await Challenge.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get student challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Get recent challenges
 * @route   GET /api/challenges/recent
 * @access  Private (Student)
 */
exports.getRecentChallenges = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
    
    const challenges = await Challenge.find({
      studentId: req.user.studentId,
      generatedAt: { $gte: startDate }
    })
      .sort({ generatedAt: -1 })
      .select('challengeId simulationType difficulty status results generatedAt evaluatedAt');
    
    res.json({
      success: true,
      data: {
        challenges,
        count: challenges.length,
        period: `Last ${days} days`
      }
    });
    
  } catch (error) {
    logger.error('Get recent challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Get challenge statistics
 * @route   GET /api/challenges/statistics
 * @access  Private (Student)
 */
exports.getChallengeStatistics = async (req, res) => {
  try {
    const challenges = await Challenge.find({
      studentId: req.user.studentId,
      status: 'evaluated'
    });
    
    const totalChallenges = challenges.length;
    const passedChallenges = challenges.filter(c => c.results?.passed).length;
    const averageScore = totalChallenges > 0
      ? challenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / totalChallenges
      : 0;
    
    // By simulation type
    const bySimulation = {};
    challenges.forEach(c => {
      if (!bySimulation[c.simulationType]) {
        bySimulation[c.simulationType] = { count: 0, totalScore: 0, passed: 0 };
      }
      bySimulation[c.simulationType].count++;
      bySimulation[c.simulationType].totalScore += c.results?.totalScore || 0;
      if (c.results?.passed) {
        bySimulation[c.simulationType].passed++;
      }
    });
    
    const simulationStats = Object.entries(bySimulation).map(([type, stats]) => ({
      simulationType: type,
      count: stats.count,
      averageScore: stats.totalScore / stats.count,
      passRate: (stats.passed / stats.count * 100)
    }));
    
    // By difficulty
    const byDifficulty = {};
    challenges.forEach(c => {
      if (!byDifficulty[c.difficulty]) {
        byDifficulty[c.difficulty] = { count: 0, totalScore: 0, passed: 0 };
      }
      byDifficulty[c.difficulty].count++;
      byDifficulty[c.difficulty].totalScore += c.results?.totalScore || 0;
      if (c.results?.passed) {
        byDifficulty[c.difficulty].passed++;
      }
    });
    
    const difficultyStats = Object.entries(byDifficulty).map(([diff, stats]) => ({
      difficulty: diff,
      count: stats.count,
      averageScore: stats.totalScore / stats.count,
      passRate: (stats.passed / stats.count * 100)
    }));
    
    res.json({
      success: true,
      data: {
        overall: {
          totalChallenges,
          passedChallenges,
          passRate: totalChallenges > 0 ? (passedChallenges / totalChallenges * 100) : 0,
          averageScore
        },
        bySimulation: simulationStats,
        byDifficulty: difficultyStats
      }
    });
    
  } catch (error) {
    logger.error('Get challenge statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get challenges by simulation
 * @route   GET /api/challenges/by-simulation/:simulationType
 * @access  Private (Student)
 */
exports.getChallengesBySimulation = async (req, res) => {
  try {
    const { simulationType } = req.params;
    const { limit = 20 } = req.query;
    
    const challenges = await Challenge.find({
      studentId: req.user.studentId,
      simulationType
    })
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit));
    
    const statistics = {
      total: challenges.length,
      evaluated: challenges.filter(c => c.status === 'evaluated').length,
      averageScore: 0,
      passRate: 0
    };
    
    const evaluatedChallenges = challenges.filter(c => c.status === 'evaluated');
    if (evaluatedChallenges.length > 0) {
      statistics.averageScore = evaluatedChallenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / evaluatedChallenges.length;
      statistics.passRate = (evaluatedChallenges.filter(c => c.results?.passed).length / evaluatedChallenges.length) * 100;
    }
    
    res.json({
      success: true,
      data: {
        simulationType,
        challenges,
        statistics
      }
    });
    
  } catch (error) {
    logger.error('Get challenges by simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenges',
      error: error.message
    });
  }
};

// ============================================================================
// CHALLENGE LIMITS
// ============================================================================

/**
 * @desc    Get challenge limits
 * @route   GET /api/challenges/limits
 * @access  Private (Student)
 */
exports.getChallengeLimits = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    
    const dailyCheck = student.canGenerateChallenge('physics', CHALLENGE_LIMITS.DAILY_LIMIT, CHALLENGE_LIMITS.PER_SIMULATION_LIMIT);
    
    res.json({
      success: true,
      data: {
        daily: {
          limit: CHALLENGE_LIMITS.DAILY_LIMIT,
          used: student.challengeLimits.totalToday || 0,
          remaining: dailyCheck.remaining?.daily || 0
        },
        perSimulation: {
          limit: CHALLENGE_LIMITS.PER_SIMULATION_LIMIT
        },
        bySimulation: Object.fromEntries(student.challengeLimits.bySimulation || new Map()),
        resetTime: new Date(new Date().setHours(24, 0, 0, 0)) // Midnight
      }
    });
    
  } catch (error) {
    logger.error('Get challenge limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching limits',
      error: error.message
    });
  }
};

/**
 * @desc    Check if can generate challenge
 * @route   GET /api/challenges/limits/check
 * @access  Private (Student)
 */
exports.checkChallengeLimit = async (req, res) => {
  try {
    const { simulationType } = req.query;
    
    if (!simulationType) {
      return res.status(400).json({
        success: false,
        message: 'Simulation type is required'
      });
    }
    
    const student = await Student.findById(req.user.userId);
    
    const canGenerate = student.canGenerateChallenge(
      simulationType,
      CHALLENGE_LIMITS.DAILY_LIMIT,
      CHALLENGE_LIMITS.PER_SIMULATION_LIMIT
    );
    
    res.json({
      success: true,
      data: {
        canGenerate: canGenerate.allowed,
        reason: canGenerate.reason,
        remaining: canGenerate.remaining
      }
    });
    
  } catch (error) {
    logger.error('Check challenge limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking limit',
      error: error.message
    });
  }
};

/**
 * @desc    Get available simulations
 * @route   GET /api/challenges/available-simulations
 * @access  Private (Student)
 */
exports.getAvailableSimulations = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const { getAllSimulationIds } = require('../utils/simulationHelpers');
    
    const allSimulations = getAllSimulationIds();
    
    const available = allSimulations.map(simId => {
      const sim = getSimulation(simId);
      const canGenerate = student.canGenerateChallenge(simId, CHALLENGE_LIMITS.DAILY_LIMIT, CHALLENGE_LIMITS.PER_SIMULATION_LIMIT);
      
      return {
        id: simId,
        name: sim.name,
        type: sim.type,
        difficulty: sim.difficulty,
        canGenerate: canGenerate.allowed,
        remaining: canGenerate.remaining?.simulation || 0
      };
    });
    
    res.json({
      success: true,
      data: {
        simulations: available,
        total: available.length,
        available: available.filter(s => s.canGenerate).length
      }
    });
    
  } catch (error) {
    logger.error('Get available simulations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching simulations',
      error: error.message
    });
  }
};

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * @desc    Get recommended challenges
 * @route   GET /api/challenges/recommended
 * @access  Private (Student)
 */
exports.getRecommendedChallenges = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const { getRecommendedSimulations } = require('../utils/simulationHelpers');
    
    const recommended = getRecommendedSimulations(student);
    
    const recommendations = recommended.slice(0, 5).map(simId => {
      const sim = getSimulation(simId);
      const canGenerate = student.canGenerateChallenge(simId, CHALLENGE_LIMITS.DAILY_LIMIT, CHALLENGE_LIMITS.PER_SIMULATION_LIMIT);
      
      return {
        simulationType: simId,
        name: sim.name,
        type: sim.type,
        difficulty: sim.difficulty,
        reason: 'Based on your performance and weak competencies',
        canGenerate: canGenerate.allowed
      };
    });
    
    res.json({
      success: true,
      data: {
        recommendations,
        weakCompetencies: student.weakCompetencies
      }
    });
    
  } catch (error) {
    logger.error('Get recommended challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};

/**
 * @desc    Adjust difficulty
 * @route   POST /api/challenges/adjust-difficulty
 * @access  Private (Admin)
 */
exports.adjustDifficulty = async (req, res) => {
  try {
    const { studentId, adjustment } = req.body;
    
    // This would integrate with adaptive difficulty algorithms
    // For now, just acknowledge the request
    
    res.json({
      success: true,
      message: 'Difficulty adjustment noted',
      data: { studentId, adjustment }
    });
    
  } catch (error) {
    logger.error('Adjust difficulty error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adjusting difficulty',
      error: error.message
    });
  }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * @desc    Get class challenges
 * @route   GET /api/challenges/class/:classId
 * @access  Private (Teacher)
 */
exports.getClassChallenges = async (req, res) => {
  try {
    const { class: classNum, section } = req.query;
    const { limit = 50 } = req.query;
    
    const students = await Student.find({
      class: parseInt(classNum),
      section: section.toUpperCase()
    }).select('studentId');
    
    const studentIds = students.map(s => s.studentId);
    
    const challenges = await Challenge.find({
      studentId: { $in: studentIds }
    })
      .sort({ generatedAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        challenges,
        count: challenges.length
      }
    });
    
  } catch (error) {
    logger.error('Get class challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Get school challenges
 * @route   GET /api/challenges/school/:schoolId
 * @access  Private (Admin)
 */
exports.getSchoolChallenges = async (req, res) => {
  try {
    const { status, limit = 100, page = 1 } = req.query;
    
    const query = { schoolId: req.params.schoolId };
    
    if (status) {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const challenges = await Challenge.find(query)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('challengeId studentId simulationType difficulty status results generatedAt');
    
    const total = await Challenge.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        challenges,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Get school challenges error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school challenges',
      error: error.message
    });
  }
};

/**
 * @desc    Bulk evaluate challenges
 * @route   POST /api/challenges/bulk-evaluate
 * @access  Private (Admin)
 */
exports.bulkEvaluateChallenges = async (req, res) => {
  try {
    const { challengeIds } = req.body;
    
    if (!challengeIds || !Array.isArray(challengeIds) || challengeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Challenge IDs array is required'
      });
    }
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (const challengeId of challengeIds) {
      try {
        const challenge = await Challenge.findOne({ challengeId, status: 'submitted' });
        
        if (challenge) {
          await evaluateChallengeWithAI(challenge);
          results.successful.push(challengeId);
        } else {
          results.failed.push({ challengeId, reason: 'Not found or not in submitted status' });
        }
      } catch (error) {
        results.failed.push({ challengeId, reason: error.message });
      }
    }
    
    res.json({
      success: true,
      message: `Evaluated ${results.successful.length} challenges. ${results.failed.length} failed.`,
      data: results
    });
    
  } catch (error) {
    logger.error('Bulk evaluate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk evaluating',
      error: error.message
    });
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * @desc    Get challenge analytics overview
 * @route   GET /api/challenges/analytics/overview
 * @access  Private (Admin)
 */
exports.getAnalyticsOverview = async (req, res) => {
  try {
    const { schoolId } = req.query;
    
    const query = schoolId ? { schoolId } : {};
    
    const total = await Challenge.countDocuments(query);
    const evaluated = await Challenge.countDocuments({ ...query, status: 'evaluated' });
    const pending = await Challenge.countDocuments({ ...query, status: 'submitted' });
    
    const evaluatedChallenges = await Challenge.find({ ...query, status: 'evaluated' });
    
    const averageScore = evaluatedChallenges.length > 0
      ? evaluatedChallenges.reduce((sum, c) => sum + (c.results?.totalScore || 0), 0) / evaluatedChallenges.length
      : 0;
    
    const passRate = evaluatedChallenges.length > 0
      ? (evaluatedChallenges.filter(c => c.results?.passed).length / evaluatedChallenges.length * 100)
      : 0;
    
    res.json({
      success: true,
      data: {
        total,
        evaluated,
        pending,
        averageScore,
        passRate
      }
    });
    
  } catch (error) {
    logger.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get analytics by simulation
 * @route   GET /api/challenges/analytics/by-simulation
 * @access  Private (Teacher/Admin)
 */
exports.getAnalyticsBySimulation = async (req, res) => {
  try {
    const { schoolId } = req.query;
    
    const query = schoolId ? { schoolId, status: 'evaluated' } : { status: 'evaluated' };
    
    const challenges = await Challenge.find(query);
    
    const bySimulation = {};
    challenges.forEach(c => {
      if (!bySimulation[c.simulationType]) {
        bySimulation[c.simulationType] = {
          count: 0,
          totalScore: 0,
          passed: 0
        };
      }
      bySimulation[c.simulationType].count++;
      bySimulation[c.simulationType].totalScore += c.results?.totalScore || 0;
      if (c.results?.passed) {
        bySimulation[c.simulationType].passed++;
      }
    });
    
    const analytics = Object.entries(bySimulation).map(([type, stats]) => ({
      simulationType: type,
      count: stats.count,
      averageScore: stats.totalScore / stats.count,
      passRate: (stats.passed / stats.count * 100)
    }));
    
    res.json({
      success: true,
      data: { analytics }
    });
    
  } catch (error) {
    logger.error('Get analytics by simulation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

/**
 * @desc    Get analytics by difficulty
 * @route   GET /api/challenges/analytics/by-difficulty
 * @access  Private (Teacher/Admin)
 */
exports.getAnalyticsByDifficulty = async (req, res) => {
  try {
    const { schoolId } = req.query;
    
    const query = schoolId ? { schoolId, status: 'evaluated' } : { status: 'evaluated' };
    
    const challenges = await Challenge.find(query);
    
    const byDifficulty = {};
    challenges.forEach(c => {
      if (!byDifficulty[c.difficulty]) {
        byDifficulty[c.difficulty] = {
          count: 0,
          totalScore: 0,
          passed: 0
        };
      }
      byDifficulty[c.difficulty].count++;
      byDifficulty[c.difficulty].totalScore += c.results?.totalScore || 0;
      if (c.results?.passed) {
        byDifficulty[c.difficulty].passed++;
      }
    });
    
    const analytics = Object.entries(byDifficulty).map(([diff, stats]) => ({
      difficulty: diff,
      count: stats.count,
      averageScore: stats.totalScore / stats.count,
      passRate: (stats.passed / stats.count * 100)
    }));
    
    res.json({
      success: true,
      data: { analytics }
    });
    
  } catch (error) {
    logger.error('Get analytics by difficulty error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

module.exports = exports;