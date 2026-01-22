/**
 * IRT CALIBRATION JOB
 * Periodic recalibration of items
 */

const cron = require('node-cron');
const irtService = require('../services/algorithms/irt.algorithm.service');
const { Challenge } = require('../models');
const logger = require('../utils/logger');

/**
 * Calibrate uncalibrated items
 */
const calibrateNewItems = async () => {
  try {
    logger.info('Starting IRT calibration job...');

    // Find challenges without IRT calibration
    const uncalibratedChallenges = await Challenge.find({
      'metadata.irt': { $exists: false },
      status: { $in: ['completed', 'evaluated'] }
    }).distinct('challengeId');

    let calibrated = 0;
    let insufficient = 0;

    for (const challengeId of uncalibratedChallenges) {
      const result = await irtService.calibrateItem(challengeId);
      
      if (result.calibrated) {
        calibrated++;
        logger.info(`Calibrated item ${challengeId}: b=${result.difficulty.toFixed(2)}`);
      } else if (result.reason === 'insufficient_data') {
        insufficient++;
      }
    }

    logger.info(`IRT calibration complete: ${calibrated} calibrated, ${insufficient} insufficient data`);

    return { calibrated, insufficient };

  } catch (error) {
    logger.error('IRT calibration job error:', error);
    throw error;
  }
};

/**
 * Recalibrate existing items (weekly)
 */
const recalibrateExistingItems = async () => {
  try {
    logger.info('Starting IRT recalibration job...');

    // Find items calibrated more than 7 days ago
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const itemsToRecalibrate = await Challenge.find({
      'metadata.irt.calibratedAt': { $lt: weekAgo }
    }).distinct('challengeId').limit(50); // Limit to avoid overload

    let recalibrated = 0;

    for (const challengeId of itemsToRecalibrate) {
      const result = await irtService.calibrateItem(challengeId);
      if (result.calibrated) recalibrated++;
    }

    logger.info(`IRT recalibration complete: ${recalibrated} items updated`);

    return { recalibrated };

  } catch (error) {
    logger.error('IRT recalibration job error:', error);
    throw error;
  }
};

/**
 * Schedule IRT jobs
 */
const scheduleIRTJobs = () => {
  // Calibrate new items daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily IRT calibration...');
    try {
      await calibrateNewItems();
    } catch (error) {
      logger.error('Daily IRT calibration failed:', error);
    }
  });

  // Recalibrate existing items weekly (Sunday 3 AM)
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Running weekly IRT recalibration...');
    try {
      await recalibrateExistingItems();
    } catch (error) {
      logger.error('Weekly IRT recalibration failed:', error);
    }
  });

  logger.info('✅ IRT calibration jobs scheduled');
};

module.exports = {
  calibrateNewItems,
  recalibrateExistingItems,
  scheduleIRTJobs
};