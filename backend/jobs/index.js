// jobs/index.js
const { scheduleIRTJobs } = require('./irtCalibration.job');
const { scheduleBackupJobs } = require('./backup.job');

scheduleIRTJobs();
scheduleBackupJobs();
