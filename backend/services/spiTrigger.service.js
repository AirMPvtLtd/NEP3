/**
 * spiTrigger.service.js
 *
 * Internal-only helper: recalculates and persists SPI after a challenge
 * is evaluated, without going through the HTTP controller.
 *
 * Mirrors exactly what spi.controller.js does, but as a plain async
 * function so it can be called from other services.
 */

'use strict';

const {
  KalmanState,
  HMMState,
  BayesianNetwork,
  SPIRecord,
} = require('../models');
const logger = require('../utils/logger');
const { calculateSPI } = require('./spi.service');

/**
 * Recalculate and persist SPI for a student.
 * Non-fatal: logs errors but never throws so callers can fire-and-forget.
 *
 * @param {string} studentId
 */
async function triggerSPIUpdate(studentId) {
  try {
    const spiResult = await calculateSPI(studentId, { includeBreakdown: true });

    await KalmanState.findOneAndUpdate(
      { studentId },
      {
        studentId,
        estimatedAbility: spiResult.kalman_estimate,
        uncertainty: spiResult.kalman_uncertainty,
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    await HMMState.findOneAndUpdate(
      { studentId, competency: 'global' },
      {
        studentId,
        competency: 'global',
        currentState: spiResult.learning_state,
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    await BayesianNetwork.findOneAndUpdate(
      { studentId },
      {
        studentId,
        beliefs: spiResult.concept_mastery || {},
        updatedAt: new Date(),
      },
      { upsert: true }
    );

    await SPIRecord.create({
      studentId,
      spi: spiResult.spi,
      spi_raw: spiResult.spi_raw,
      grade: spiResult.grade,
      learning_state: spiResult.learning_state,
      kalman_uncertainty: spiResult.kalman_uncertainty,
      concept_mastery: spiResult.concept_mastery || {},
      totalChallenges: spiResult.totalChallenges,
      source: 'challenge_evaluated',
      calculatedAt: new Date(),
    });

    logger.info('[spiTrigger] SPI updated after challenge evaluation', {
      studentId,
      spi: spiResult.spi,
      learning_state: spiResult.learning_state,
    });
  } catch (error) {
    // Non-fatal — evaluation is already saved. SPI will be recalculated
    // next time the student completes a challenge or via the admin API.
    logger.error('[spiTrigger] SPI update failed (non-fatal)', {
      studentId,
      error: error.message,
    });
  }
}

module.exports = { triggerSPIUpdate };
