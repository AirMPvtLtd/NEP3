/**
 * SPI CONTROLLER
 * ------------------------------------------------------------
 * SPI = STATE ENGINE
 * - Executes SPI computation
 * - Persists Kalman / HMM / Bayesian state
 * - Writes SPI snapshot (SPIRecord)
 * - NO ledger writes
 * - NO report writes
 */

const {
  Student,
  KalmanState,
  HMMState,
  BayesianNetwork,
  SPIRecord
} = require('../models');

const logger = require('../utils/logger');
const { calculateSPI } = require('../services/spi.service');

/**
 * POST /api/spi/calculate/:studentId
 * INTERNAL / SYSTEM / ADMIN ONLY
 */
exports.calculateStudentSPI = async (req, res) => {
  try {
    const { studentId } = req.params;

    // ----------------------------------------------------------
    // 0️⃣ Validate input
    // ----------------------------------------------------------
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // ----------------------------------------------------------
    // 1️⃣ Resolve Student
    // ----------------------------------------------------------
    const student = await Student.findOne({ studentId }).lean();
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // ----------------------------------------------------------
    // 2️⃣ Execute SPI Engine (AUTHORITATIVE)
    // ----------------------------------------------------------
    const spiResult = await calculateSPI(studentId, {
      includeBreakdown: true
    });

    // ----------------------------------------------------------
    // 3️⃣ Persist Kalman State
    // ----------------------------------------------------------
    await KalmanState.findOneAndUpdate(
      { studentId },
      {
        studentId,
        estimatedAbility: spiResult.kalman_estimate,
        uncertainty: spiResult.kalman_uncertainty,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // ----------------------------------------------------------
    // 4️⃣ Persist HMM Learning State (GLOBAL, not per competency)
    // ----------------------------------------------------------
    await HMMState.findOneAndUpdate(
      { studentId, competency: 'global' },
      {
        studentId,
        competency: 'global',
        currentState: spiResult.learning_state,
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // ----------------------------------------------------------
    // 5️⃣ Persist Bayesian Concept Mastery
    // ----------------------------------------------------------
    await BayesianNetwork.findOneAndUpdate(
      { studentId },
      {
        studentId,
        beliefs: spiResult.concept_mastery || {},
        updatedAt: new Date()
      },
      { upsert: true }
    );

    // ----------------------------------------------------------
    // 6️⃣ Persist SPI Snapshot (REPORT CONSUMPTION ONLY)
    // ----------------------------------------------------------
    if (!SPIRecord || typeof SPIRecord.create !== 'function') {
      throw new Error('SPIRecord model not loaded – check models/index.js');
    }

    const spiRecord = await SPIRecord.create({
      studentId,
      spi: spiResult.spi,
      spi_raw: spiResult.spi_raw,
      grade: spiResult.grade,
      learning_state: spiResult.learning_state,
      kalman_uncertainty: spiResult.kalman_uncertainty,
      concept_mastery: spiResult.concept_mastery || {},
      totalChallenges: spiResult.totalChallenges,
      source: 'challenge_evaluated',
      calculatedAt: new Date()
    });

    logger.info('SPI calculated successfully', {
      studentId,
      spi: spiResult.spi,
      learning_state: spiResult.learning_state
    });

    // ----------------------------------------------------------
    // 7️⃣ RESPONSE
    // ----------------------------------------------------------
    return res.status(200).json({
      success: true,
      message: 'SPI calculated and persisted successfully',
      data: {
        studentId,
        spi: spiResult.spi,
        grade: spiResult.grade,
        learning_state: spiResult.learning_state,
        kalman_uncertainty: spiResult.kalman_uncertainty,
        recordId: spiRecord._id,
        calculatedAt: spiRecord.calculatedAt
      }
    });

  } catch (error) {
    logger.error('SPI calculation failed', error);

    return res.status(500).json({
      success: false,
      message: 'SPI calculation failed',
      error: error.message
    });
  }
};
