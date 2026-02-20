/**
 * scripts/backup-s3.js
 *
 * Uploads the most recent local backup directory to AWS S3.
 * Run after backup.js completes, or call directly:
 *   node scripts/backup-s3.js [path/to/backup/dir]
 *
 * Required environment variables:
 *   AWS_REGION           e.g. ap-south-1
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   BACKUP_S3_BUCKET     e.g. nep-workbench-backups
 *
 * Optional:
 *   BACKUP_DIR           local backup root (default: ./backups)
 *   BACKUP_S3_PREFIX     S3 key prefix    (default: db-backups)
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ── Config ────────────────────────────────────────────────────────────────────
const REGION      = process.env.AWS_REGION;
const BUCKET      = process.env.BACKUP_S3_BUCKET;
const BACKUP_DIR  = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'));
const S3_PREFIX   = process.env.BACKUP_S3_PREFIX || 'db-backups';

if (!REGION || !BUCKET) {
  console.error('ERROR: AWS_REGION and BACKUP_S3_BUCKET must be set.');
  process.exit(1);
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('ERROR: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set.');
  process.exit(1);
}

const s3 = new S3Client({ region: REGION });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Find the backup directory to upload.
 * If a specific path is passed as CLI arg, use that.
 * Otherwise, find the most recently modified backup dir.
 */
function resolveBackupDir() {
  const explicit = process.argv[2];
  if (explicit) {
    const abs = path.resolve(explicit);
    if (!fs.existsSync(abs)) throw new Error(`Backup dir not found: ${abs}`);
    return abs;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`No backup directory found at ${BACKUP_DIR}`);
  }

  const dirs = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(f))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (dirs.length === 0) throw new Error('No backup directories found to upload.');
  return path.join(BACKUP_DIR, dirs[0].name);
}

/**
 * Upload a single file to S3.
 */
async function uploadFile(localPath, s3Key) {
  const stream = fs.createReadStream(localPath);
  const contentType = localPath.endsWith('.gz')
    ? 'application/gzip'
    : 'application/json';

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    Body: stream,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',    // S3 managed encryption
    StorageClass: 'STANDARD_IA',       // cheaper for backup archives
  }));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  const backupDir = resolveBackupDir();
  const backupName = path.basename(backupDir);
  const s3Prefix = `${S3_PREFIX}/${backupName}`;

  console.log(`\n=== NEP3 Backup → S3 ===`);
  console.log(`Source : ${backupDir}`);
  console.log(`Target : s3://${BUCKET}/${s3Prefix}\n`);

  const files = fs.readdirSync(backupDir);
  let uploaded = 0;
  let totalBytes = 0;

  for (const file of files) {
    const localPath = path.join(backupDir, file);
    const s3Key = `${s3Prefix}/${file}`;

    process.stdout.write(`  Uploading: ${file.padEnd(45)}`);
    const size = fs.statSync(localPath).size;

    await uploadFile(localPath, s3Key);

    totalBytes += size;
    uploaded++;
    console.log(`${Math.round(size / 1024)} KB`);
  }

  console.log(`\nDone: ${uploaded} files (${Math.round(totalBytes / 1024)} KB total) in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`S3 path: s3://${BUCKET}/${s3Prefix}\n`);
}

main().catch(err => {
  console.error('S3 upload failed:', err.message);
  process.exit(1);
});
