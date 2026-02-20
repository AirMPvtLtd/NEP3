/**
 * jobs/backup.job.js
 *
 * Automated database backup scheduler using node-cron.
 *
 * Schedule (configurable via environment variables):
 *   BACKUP_SCHEDULE_DAILY   — incremental backup  (default: "0 2 * * *"  → 2:00 AM daily)
 *   BACKUP_SCHEDULE_WEEKLY  — full backup          (default: "0 3 * * 0"  → 3:00 AM Sunday)
 *
 * The actual backup logic lives in scripts/backup.js so it can also be
 * run manually: `npm run backup:full` or `npm run backup:incremental`
 */

'use strict';

const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

const BACKUP_SCRIPT    = path.join(__dirname, '..', 'scripts', 'backup.js');
const BACKUP_S3_SCRIPT = path.join(__dirname, '..', 'scripts', 'backup-s3.js');

const SCHEDULE_DAILY  = process.env.BACKUP_SCHEDULE_DAILY  || '0 2 * * *';
const SCHEDULE_WEEKLY = process.env.BACKUP_SCHEDULE_WEEKLY || '0 3 * * 0';

// Only upload to S3 when the bucket is configured
const S3_ENABLED = !!(process.env.BACKUP_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID);

/**
 * Runs backup.js as a child process so it gets its own connection and memory.
 * @param {'full'|'incremental'} mode
 */
function runBackup(mode) {
  logger.info(`[backup.job] Starting ${mode} backup...`);

  const child = spawn(process.execPath, [BACKUP_SCRIPT, mode], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', chunk => {
    chunk.toString().split('\n').filter(Boolean).forEach(line => {
      logger.info(`[backup.job] ${line}`);
    });
  });

  child.stderr.on('data', chunk => {
    chunk.toString().split('\n').filter(Boolean).forEach(line => {
      logger.error(`[backup.job] STDERR: ${line}`);
    });
  });

  child.on('close', code => {
    if (code === 0 || code === 2) {
      if (code === 0) {
        logger.info(`[backup.job] ${mode} backup completed successfully.`);
      } else {
        logger.warn(`[backup.job] ${mode} backup completed with partial errors (exit ${code}).`);
      }

      // Upload to S3 after a successful (or partial) local backup
      if (S3_ENABLED) {
        runS3Upload();
      }
    } else {
      logger.error(`[backup.job] ${mode} backup FAILED (exit ${code}). Skipping S3 upload.`);
    }
  });

  child.on('error', err => {
    logger.error(`[backup.job] Failed to spawn backup process: ${err.message}`);
  });
}

/**
 * Uploads the latest local backup to S3 (fire-and-forget child process).
 */
function runS3Upload() {
  logger.info('[backup.job] Starting S3 upload of latest backup...');

  const s3Child = spawn(process.execPath, [BACKUP_S3_SCRIPT], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  s3Child.stdout.on('data', chunk => {
    chunk.toString().split('\n').filter(Boolean).forEach(line => {
      logger.info(`[backup.job/s3] ${line}`);
    });
  });

  s3Child.stderr.on('data', chunk => {
    chunk.toString().split('\n').filter(Boolean).forEach(line => {
      logger.error(`[backup.job/s3] STDERR: ${line}`);
    });
  });

  s3Child.on('close', code => {
    if (code === 0) {
      logger.info('[backup.job/s3] S3 upload completed successfully.');
    } else {
      logger.error(`[backup.job/s3] S3 upload FAILED (exit ${code}).`);
    }
  });

  s3Child.on('error', err => {
    logger.error(`[backup.job/s3] Failed to spawn S3 upload process: ${err.message}`);
  });
}

/**
 * Registers both cron schedules and logs startup info.
 */
function scheduleBackupJobs() {
  if (!cron.validate(SCHEDULE_DAILY)) {
    logger.error(`[backup.job] Invalid BACKUP_SCHEDULE_DAILY: "${SCHEDULE_DAILY}"`);
    return;
  }
  if (!cron.validate(SCHEDULE_WEEKLY)) {
    logger.error(`[backup.job] Invalid BACKUP_SCHEDULE_WEEKLY: "${SCHEDULE_WEEKLY}"`);
    return;
  }

  // Daily incremental backup
  cron.schedule(SCHEDULE_DAILY, () => runBackup('incremental'), {
    timezone: 'Asia/Kolkata',  // Adjust to your server timezone
  });

  // Weekly full backup
  cron.schedule(SCHEDULE_WEEKLY, () => runBackup('full'), {
    timezone: 'Asia/Kolkata',
  });

  logger.info(`[backup.job] Incremental backup scheduled: ${SCHEDULE_DAILY}`);
  logger.info(`[backup.job] Full backup scheduled:        ${SCHEDULE_WEEKLY}`);
}

module.exports = { scheduleBackupJobs, runBackup };
