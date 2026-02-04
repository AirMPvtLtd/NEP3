// controllers/student.controller.js
/**
 * STUDENT CONTROLLER
 * Complete student functionality
 */

const { Student, Challenge, ChallengeLimit, Activity, Ledger, NEPReport, HelpTicket } = require('../models');
const { getRecommendedSimulations, isValidSimulation, getSimulation, getAllSimulationIds } = require('../utils/Simulationhelpers');
//const { generateChallenge: generateAIChallenge, evaluateResponse } = require('../config/mistral');
const mistralService = require('../services/mistral.service');
const { SIMULATION_METADATA, CHALLENGE_LIMITS, NEP_COMPETENCIES } = require('../config/constants');
const logger = require('../utils/logger');
//const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const School  = require('../models/School');
const { evaluateChallenge } = require('../services/challengeEvaluation.service');



// ============================================================================
// PROFILE & DASHBOARD
// ============================================================================

/**
 * STUDENT PROFILE CONTROLLER
 * NEP Workbench – Production Safe
 */


// ============================================================================
// GET STUDENT PROFILE
// ============================================================================
// exports.getProfile = async (req, res) => {
//   try {
//     // 1️⃣ Fetch student by Mongo _id (JWT se)
//     const student = await Student.findById(req.user.userId)
//       .populate('teacherId', 'teacherId name email subjects')
//       .populate('schoolId', 'schoolId schoolName address city state')
//       .lean();

//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: 'Student not found'
//       });
//     }

//     // 2️⃣ Return combined response (similar to teacher profile)
//     return res.json({
//       success: true,
//       data: {
//         student
//       }
//     });

//   } catch (error) {
//     logger.error('Get student profile error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error fetching profile'
//     });
//   }
// };

    function extractId(field, idKey) {
      if (!field) return null;
      if (typeof field === 'object' && field !== null) {
        return field[idKey] || null;
      }
      if (typeof field === 'string' && !field.includes('{') && field.length < 50) {
        return field;
      }
      if (typeof field === 'string' && field.includes('{')) {
        try {
          const obj = JSON.parse(field);
          return obj[idKey] || null;
        } catch (e) {
          const regex = new RegExp(`${idKey}:\\s*['"]([^'"]+)['"]`);
          const match = field.match(regex);
          return match ? match[1] : null;
        }
      }
      return null;
    }

    // exports.getProfile = async (req, res) => {
    //   try {
    //     // 1️⃣ Fetch student by Mongo _id (JWT se)
    //     const student = await Student.findById(req.user.userId).lean();
        
    //     if (!student) {
    //       return res.status(404).json({
    //         success: false,
    //         message: 'Student not found'
    //       });
    //     }
        
    //     // 2️⃣ Fetch teacher if valid teacherId
    //     let teacher = null;
    //     if (student.teacherId && student.teacherId !== 'SYSTEM-DEFAULT') {
    //       try {
    //         teacher = await Teacher.findOne({teacherId: student.teacherId})
    //           .select('teacherId name email subjects')
    //           .lean();
    //       } catch (err) {
    //         logger.warn('Teacher not found:', student.teacherId);
    //       }
    //     }
        
    //     // 3️⃣ Fetch school if valid schoolId
    //     let school = null;
    //     if (student.schoolId && student.schoolId !== 'SYSTEM-DEFAULT') {
    //       try {
    //         school = await School.findOne({schoolId: student.schoolId})
    //           .select('schoolId schoolName address city state')
    //           .lean();
    //       } catch (err) {
    //         logger.warn('School not found:', student.schoolId);
    //       }
    //     }
        
    //     // 4️⃣ Return combined response
    //     return res.json({
    //       success: true,
    //       data: {
    //         student: {
    //           ...student,
    //           teacher,
    //           school
    //         }
    //       }
    //     });
    //   } catch (error) {
    //     logger.error('Get student profile error:', error);
    //     return res.status(500).json({
    //       success: false,
    //       message: 'Error fetching profile'
    //     });
    //   }
    // };

    exports.getProfile = async (req, res) => {
      try {
        const student = await Student.findById(req.user.userId).lean();
        
        if (!student) {
          return res.status(404).json({
            success: false,
            message: 'Student not found'
          });
        }
        
        // Extract clean IDs
        const actualTeacherId = extractId(student.teacherId, 'teacherId');
        const actualSchoolId = extractId(student.schoolId, 'schoolId');
        
        // Fetch teacher
        let teacher = null;
        if (actualTeacherId && actualTeacherId !== 'SYSTEM-DEFAULT') {
          try {
            teacher = await Teacher.findOne({teacherId: actualTeacherId})
              .select('teacherId name email subjects')
              .lean();
            logger.info('✅ Teacher fetched', {teacherId: actualTeacherId, teacherName: teacher?.name});
          } catch (err) {
            logger.error('🔥 Teacher query failed', {teacherId: actualTeacherId, error: err.message});
          }
        }
        
        // Fetch school
        let school = null;
        if (actualSchoolId && actualSchoolId !== 'SYSTEM-DEFAULT') {
          try {
            school = await School.findOne({schoolId: actualSchoolId})
              .select('schoolId schoolName address city state')
              .lean();
            logger.info('✅ School fetched', {schoolId: actualSchoolId, schoolName: school?.schoolName});
          } catch (err) {
            logger.error('🔥 School query failed', {schoolId: actualSchoolId, error: err.message});
          }
        }
        
        logger.info('📤 Student profile response ready', {
          studentId: student.studentId,
          teacherAttached: !!teacher,
          schoolAttached: !!school
        });
        
        return res.json({
          success: true,
          data: {
            student: {
              ...student,
              teacher,
              school
            }
          }
        });
      } catch (error) {
        logger.error('Get student profile error:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching profile'
        });
      }
    };
// ============================================================================
// UPDATE STUDENT PROFILE
// ============================================================================
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.user; // business ID: STD-XXXXX

    const allowedUpdates = [
      'name',
      'phone',
      'dateOfBirth',
      'profilePicture'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    const student = await Student.findOneAndUpdate(
      { studentId: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Activity log (NEP-compliant)
    await Activity.log({
      userId: student.studentId,          // business ID
      userType: 'student',
      schoolId: student.schoolId,
      activityType: 'profile_updated',
      action: 'Student updated profile',
      metadata: {
        updatedFields: Object.keys(updates)
      },
      success: true
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { student }
    });

  } catch (error) {
    logger.error('Update profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    
    // Get recent challenges (last 7 days)
    const recentChallenges = await Challenge.find({
      studentId: student.studentId,
      generatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ generatedAt: -1 }).limit(10);
    
    // Calculate statistics
    const totalChallenges = student.stats.totalChallengesCompleted;
    const averageScore = student.stats.averageChallengeScore;
    const currentStreak = student.stats.dailyStreak;
    
    // Get weak competencies
    const weakCompetencies = student.weakCompetencies.map(comp => ({
      name: comp,
      score: student.competencyScores[comp]
    }));
    
    // Get strong competencies
    const strongCompetencies = student.strongCompetencies.map(comp => ({
      name: comp,
      score: student.competencyScores[comp]
    }));
    
    // Check challenge limits
    const limits = student.canGenerateChallenge('physics', CHALLENGE_LIMITS.DAILY_LIMIT, CHALLENGE_LIMITS.PER_SIMULATION_LIMIT);
    
    res.json({
      success: true,
      data: {
        student: {
          name: student.name,
          class: student.class,
          section: student.section,
          performanceIndex: student.performanceIndex,
          grade: student.grade
        },
        stats: {
          totalChallenges,
          averageScore,
          currentStreak
        },
        competencies: {
          weak: weakCompetencies,
          strong: strongCompetencies
        },
        recentChallenges: recentChallenges.map(ch => ({
          challengeId: ch.challengeId,
          title: ch.title,
          simulationType: ch.simulationType,
          difficulty: ch.difficulty,
          score: ch.results?.totalScore,
          status: ch.status,
          generatedAt: ch.generatedAt
        })),
        challengeLimits: {
          dailyRemaining: limits.remaining?.daily || 0,
          canGenerate: limits.allowed
        }
      }
    });
    
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard',
      error: error.message
    });
  }
};

// ============================================================================
// SIMULATIONS
// ============================================================================

exports.getAvailableSimulations = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const allSimulations = getAllSimulationIds();
    
    // Filter simulations by student class level
    const available = allSimulations.map(simId => {
      const sim = getSimulation(simId);
      const access = require('../utils/simulationHelpers').validateSimulationAccess(simId, student.class);
      
      return {
        id: simId,
        name: sim.name,
        type: sim.type,
        difficulty: sim.difficulty,
        topics: sim.topics,
        accessible: access.allowed,
        reason: access.reason
      };
    });
    
    res.json({
      success: true,
      data: {
        simulations: available,
        total: available.length,
        accessible: available.filter(s => s.accessible).length
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

exports.getRecommendedSimulations = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const recommended = getRecommendedSimulations(student);
    
    const recommendedDetails = recommended.map(simId => {
      const sim = getSimulation(simId);
      return {
        id: simId,
        name: sim.name,
        type: sim.type,
        difficulty: sim.difficulty,
        topics: sim.topics.slice(0, 5) // Top 5 topics
      };
    });
    
    res.json({
      success: true,
      data: {
        recommended: recommendedDetails,
        reason: 'Based on your performance and class level'
      }
    });
    
  } catch (error) {
    logger.error('Get recommended simulations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recommendations',
      error: error.message
    });
  }
};

exports.getSimulationDetails = async (req, res) => {
  try {
    const { simulationType } = req.params;
    
    if (!isValidSimulation(simulationType)) {
      return res.status(404).json({
        success: false,
        message: 'Simulation not found'
      });
    }
    
    const simulation = getSimulation(simulationType);
    const student = await Student.findById(req.user.userId);
    
    // Get student's past challenges for this simulation
    const pastChallenges = await Challenge.find({
      studentId: student.studentId,
      simulationType: simulationType,
      status: 'evaluated'
    }).sort({ generatedAt: -1 }).limit(5);
    
    // Calculate average score for this simulation
    const avgScore = pastChallenges.length > 0
      ? pastChallenges.reduce((sum, ch) => sum + (ch.results?.totalScore || 0), 0) / pastChallenges.length
      : 0;
    
    res.json({
      success: true,
      data: {
        simulation: {
          id: simulationType,
          ...simulation
        },
        studentProgress: {
          attemptsMade: pastChallenges.length,
          averageScore: avgScore,
          bestScore: Math.max(...pastChallenges.map(ch => ch.results?.totalScore || 0), 0)
        },
        recentAttempts: pastChallenges.map(ch => ({
          challengeId: ch.challengeId,
          score: ch.results?.totalScore,
          difficulty: ch.difficulty,
          completedAt: ch.evaluatedAt
        }))
      }
    });
    
  } catch (error) {
    logger.error('Get simulation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching simulation details',
      error: error.message
    });
  }
};

// ============================================================================
// CHALLENGE GENERATION & SUBMISSION (FULL AI INTEGRATION)
// ============================================================================

// exports.generateChallenge = async (req, res) => {
//   try {
//     const { simulationType, difficulty, numberOfQuestions = 5 } = req.body;
    
//     // Validate simulation type
//     if (!isValidSimulation(simulationType)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid simulation type'
//       });
//     }
    
//     // Get student
//     const student = await Student.findById(req.user.userId);
    
//     // Check if student can generate challenge
//     const canGenerate = student.canGenerateChallenge(
//       simulationType,
//       CHALLENGE_LIMITS.DAILY_LIMIT,
//       CHALLENGE_LIMITS.PER_SIMULATION_LIMIT
//     );
    
//     if (!canGenerate.allowed) {
//       return res.status(429).json({
//         success: false,
//         message: canGenerate.reason === 'daily_limit'
//           ? 'Daily challenge limit reached. Please try again tomorrow.'
//           : `You have reached the limit for ${simulationType} challenges today.`,
//         remaining: canGenerate.remaining
//       });
//     }
    
//     // Generate challenge using Mistral AI
//     logger.info(`Generating challenge for student ${student.studentId}`, {
//       simulationType,
//       difficulty,
//       studentLevel: student.class
//     });
    
//     const challengeData = await generateAIChallenge({
//       simulationType,
//       difficulty: difficulty || 'medium',
//       studentLevel: student.class,
//       weakCompetencies: student.weakCompetencies,
//       numberOfQuestions
//     });
    
//     // Validate generated challenge
//     if (!challengeData || !challengeData.questions || challengeData.questions.length === 0) {
//       throw new Error('Failed to generate valid challenge');
//     }
    
//     // Create challenge in database
//     const challenge = await Challenge.create({
//       studentId: student.studentId,
//       schoolId: student.schoolId,
//       teacherId: student.teacherId,
//       simulationType,
//       difficulty: challengeData.difficulty || difficulty || 'medium',
//       title: challengeData.title,
//       questions: challengeData.questions.map((q, index) => ({
//         questionId: `Q${index + 1}`,
//         type: q.type || 'SHORT_ANSWER',
//         question: q.question,
//         options: q.options || [],
//         correctAnswer: q.correctAnswer,
//         explanation: q.explanation,
//         competencies: q.competencies || [],
//         points: q.points || 100
//       })),
//       totalPoints: challengeData.totalPoints || (numberOfQuestions * 100),
//       passingScore: challengeData.passingScore || 70,
//       estimatedTime: challengeData.estimatedTime || 10,
//       status: 'generated',
//       aiMetadata: {
//         mistralModel: process.env.MISTRAL_MODEL || 'mistral-large-2411',
//         tokensUsed: challengeData.tokensUsed || 0,
//         metaLearningApplied: false,
//         kalmanFilterApplied: false,
//         pidControllerApplied: false
//       }
//     });
    
//     // Record challenge generation
//     await student.recordChallengeGeneration(simulationType);
    
//     // Update student streak
//     await student.updateStreak();
    
//     // Log activity
//     await Activity.log({
//       userId: student._id,
//       userType: 'student',
//       schoolId: student.schoolId,
//       activityType: 'challenge_generated',
//       action: `Challenge generated for ${simulationType}`,
//       metadata: {
//         challengeId: challenge.challengeId,
//         simulationType,
//         difficulty: challenge.difficulty
//       },
//       success: true
//     });
    
//     logger.info(`Challenge ${challenge.challengeId} generated successfully`);
    
//     res.status(201).json({
//       success: true,
//       message: 'Challenge generated successfully',
//       data: {
//         challenge: {
//           challengeId: challenge.challengeId,
//           title: challenge.title,
//           simulationType: challenge.simulationType,
//           difficulty: challenge.difficulty,
//           questions: challenge.questions.map(q => ({
//             questionId: q.questionId,
//             type: q.type,
//             question: q.question,
//             options: q.options,
//             points: q.points
//             // Do NOT send correctAnswer or explanation
//           })),
//           totalPoints: challenge.totalPoints,
//           passingScore: challenge.passingScore,
//           estimatedTime: challenge.estimatedTime,
//           generatedAt: challenge.generatedAt
//         },
//         limits: {
//           dailyRemaining: CHALLENGE_LIMITS.DAILY_LIMIT - (student.challengeLimits.totalToday + 1),
//           simulationRemaining: CHALLENGE_LIMITS.PER_SIMULATION_LIMIT - ((student.challengeLimits.bySimulation.get(simulationType) || 0) + 1)
//         }
//       }
//     });
    
//   } catch (error) {
//     logger.error('Generate challenge error:', error);
    
//     // Log failed activity
//     await Activity.log({
//       userId: req.user.userId,
//       userType: 'student',
//       activityType: 'challenge_generated',
//       action: 'Failed to generate challenge',
//       success: false,
//       errorMessage: error.message
//     });
    
//     res.status(500).json({
//       success: false,
//       message: 'Error generating challenge',
//       error: error.message
//     });
//   }
// };

exports.generateChallenge = async (req, res) => {
  // Redirect to challenge controller
  return require('./challenge.controller').generateChallenge(req, res);
};

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
      message: 'Error fetching challenge limits',
      error: error.message
    });
  }
};

exports.getChallengeDetails = async (req, res) => {
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
    
    // Return challenge without answers if not evaluated
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
    
    // Include full results if evaluated
    if (challenge.status === 'evaluated') {
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
    
    res.json({
      success: true,
      message: 'Challenge started',
      data: {
        challengeId: challenge.challengeId,
        startedAt: challenge.startedAt
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

exports.submitChallenge = async (req, res) => {
  try {
    const { answers } = req.body;

    // ---------------------------------------------------
    // 1. Fetch Challenge
    // ---------------------------------------------------
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

    if (!answers || answers.length !== challenge.questions.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid number of answers'
      });
    }

    // ---------------------------------------------------
    // 2. Save Submission
    // ---------------------------------------------------
    await challenge.submit(answers);

    logger.info('Challenge submitted, auto-evaluation scheduled', {
      challengeId: challenge.challengeId
    });

    // ---------------------------------------------------
    // 3. Async Evaluation + Ledger Anchoring
    // ---------------------------------------------------
    setImmediate(async () => {
      try {
        // 🔹 PURE evaluation engine (no DB writes inside)
        const evaluation = await evaluateChallenge(challenge);
        if (!evaluation) return;

        /**
         * Expected evaluation structure:
         * {
         *   totalScore,
         *   passed,
         *   timeSpent,
         *   competenciesAssessed: [{ competency, score }]
         * }
         */

        // 🔒 IMMUTABLE LEDGER WRITE (CANONICAL)
        await Ledger.create({
          eventType: Ledger.EVENT_TYPES.CHALLENGE_EVALUATED,

          studentId: challenge.studentId,
          schoolId: challenge.schoolId,

          data: {
            challengeId: challenge.challengeId,
            simulationType: challenge.simulationType,
            difficulty: challenge.difficulty,
            totalScore: evaluation.totalScore,
            passed: evaluation.passed,
            timeTaken: evaluation.timeSpent || null,
            competenciesAssessed: evaluation.competenciesAssessed || []
          },

          hash: require('crypto')
            .createHash('sha256')
            .update(
              challenge.challengeId +
              challenge.studentId +
              String(evaluation.totalScore)
            )
            .digest('hex'),

          metadata: {
            timestamp: new Date()
          },

          createdBy: challenge.studentId,
          createdByRole: 'student',
          status: 'confirmed',
          timestamp: new Date()
        });

        logger.info('Ledger anchored for challenge evaluation', {
          challengeId: challenge.challengeId,
          score: evaluation.totalScore
        });

      } catch (err) {
        logger.error('Auto-evaluation / ledger anchoring failed', err);
      }
    });

    // ---------------------------------------------------
    // 4. Immediate Client Response (NON-BLOCKING)
    // ---------------------------------------------------
    return res.json({
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
    return res.status(500).json({
      success: false,
      message: 'Error submitting challenge',
      error: error.message
    });
  }
};



exports.getChallengeResults = async (req, res) => {
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

exports.getAllChallenges = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const challenges = await Challenge.getByStudent(student.studentId);
    res.json({ success: true, data: { challenges } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRecentChallenges = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const challenges = await Challenge.getRecent(student.studentId);
    res.json({ success: true, data: { challenges } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPerformance = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    res.json({ success: true, data: { performance: student.performanceIndex, stats: student.stats } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPerformanceIndex = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    res.json({ success: true, data: { spi: student.performanceIndex, grade: student.grade } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCompetencies = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    res.json({ success: true, data: { competencies: student.competencyScores } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    res.json({ success: true, data: { progress: student.recentChallenges } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStreak = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    res.json({ success: true, data: { streak: student.stats.dailyStreak } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getNEPReports = async (req, res) => {
  try {
    const { NEPReport } = require('../models');
    const reports = await NEPReport.find({ studentId: req.user.studentId });
    res.json({ success: true, data: { reports } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getNEPReportDetails = async (req, res) => {
  try {
    const { NEPReport } = require('../models');
    const report = await NEPReport.findOne({ reportId: req.params.reportId });
    res.json({ success: true, data: { report } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generateReport = async (req, res) => {
  try {
    res.json({ success: true, message: 'Report generation started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createHelpTicket = async (req, res) => {
  try {
    const { HelpTicket } = require('../models');
    const student = await Student.findById(req.user.userId);
    const ticket = await HelpTicket.createTicket({ ...req.body, studentId: student.studentId, schoolId: student.schoolId, teacherId: student.teacherId });
    res.status(201).json({ success: true, data: { ticket } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getHelpTickets = async (req, res) => {
  try {
    const { HelpTicket } = require('../models');
    const student = await Student.findById(req.user.userId);
    const tickets = await HelpTicket.find({ studentId: student.studentId });
    res.json({ success: true, data: { tickets } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getHelpTicketDetails = async (req, res) => {
  try {
    const { HelpTicket } = require('../models');
    const ticket = await HelpTicket.findOne({ ticketId: req.params.ticketId });
    res.json({ success: true, data: { ticket } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.closeHelpTicket = async (req, res) => {
  try {
    const { HelpTicket } = require('../models');
    const ticket = await HelpTicket.findOne({ ticketId: req.params.ticketId });
    await ticket.close();
    res.json({ success: true, message: 'Ticket closed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getClassLeaderboard = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const students = await Student.find({ schoolId: student.schoolId, class: student.class, section: student.section }).sort({ performanceIndex: -1 }).limit(10);
    res.json({ success: true, data: { leaderboard: students } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSchoolLeaderboard = async (req, res) => {
  try {
    const student = await Student.findById(req.user.userId);
    const students = await Student.getTopPerformers(student.schoolId, 20);
    res.json({ success: true, data: { leaderboard: students } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// student.controller.js - Add these two functions

/**
 * @desc    Get challenge for attempting (without correct answers)
 * @route   GET /api/student/challenges/:challengeId/attempt
 * @access  Private (Student)
 */
exports.getChallengeForAttempt = async (req, res) => {
  try {
    const { challengeId } = req.params;
    
    const challenge = await Challenge.findOne({
      challengeId: challengeId,
      studentId: req.user.studentId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Don't send correct answers to student
    const questionsForStudent = challenge.questions.map(q => ({
      questionId: q.questionId,
      type: q.type,
      question: q.question,
      options: q.options,  // For MCQ only
      points: q.points
      // NOT sending: correctAnswer, explanation
    }));
    
    // Get latest draft if exists
    const latestDraft = challenge.draftSaves && challenge.draftSaves.length > 0
      ? challenge.draftSaves[challenge.draftSaves.length - 1]
      : null;
    
    res.json({
      success: true,
      data: {
        challenge: {
          challengeId: challenge.challengeId,
          title: `${challenge.subject} Challenge - ${challenge.simulationType || challenge.customTopic}`,
          subject: challenge.subject,
          simulationType: challenge.simulationType,
          customTopic: challenge.customTopic,
          difficulty: challenge.difficulty,
          questions: questionsForStudent,
          totalPoints: challenge.totalPoints,
          passingScore: challenge.passingScore,
          estimatedTime: challenge.estimatedTime || 600, // 10 minutes default
          status: challenge.status,
          startedAt: challenge.startedAt
        },
        savedDraft: latestDraft
      }
    });
    
  } catch (error) {
    logger.error('Get challenge for attempt error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge',
      error: error.message
    });
  }
};

/**
 * @desc    Save draft answers
 * @route   POST /api/student/challenges/:challengeId/save-draft
 * @access  Private (Student)
 */
exports.saveDraft = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { answers } = req.body;
    
    // Validate answers array
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers array is required'
      });
    }
    
    const challenge = await Challenge.findOne({
      challengeId: challengeId,
      studentId: req.user.studentId
    });
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    
    // Don't allow draft saves for already evaluated challenges
    if (challenge.status === 'evaluated') {
      return res.status(400).json({
        success: false,
        message: 'Cannot save draft for evaluated challenge'
      });
    }
    
    // Save draft
    if (!challenge.draftSaves) {
      challenge.draftSaves = [];
    }
    
    challenge.draftSaves.push({
      savedAt: new Date(),
      answers: answers
    });
    
    await challenge.save();
    
    res.json({
      success: true,
      message: 'Draft saved successfully',
      data: {
        savedAt: new Date(),
        answersCount: answers.length
      }
    });
    
  } catch (error) {
    logger.error('Save draft error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving draft',
      error: error.message
    });
  }
};

module.exports = exports;