/**
 * scripts/backup.js
 *
 * Mongoose-based database backup — no external binaries required.
 * Streams each collection to a gzipped NDJSON file, then writes a manifest.
 *
 * Modes:
 *   full          Backs up every collection.
 *   incremental   Backs up records modified since the last successful backup.
 *                 Falls back to full if no prior manifest exists.
 *
 * Usage:
 *   node scripts/backup.js [full|incremental]
 *
 * Environment variables (all optional except MONGODB_URI):
 *   MONGODB_URI            — MongoDB connection string (required)
 *   BACKUP_DIR             — Where to write backups  (default: ./backups)
 *   BACKUP_RETENTION_DAYS  — How many days to keep   (default: 30)
 */

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const mongoose = require('mongoose');

const pipelineAsync = promisify(pipeline);

// ── Config ────────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set.');
  process.exit(1);
}

const BACKUP_DIR = path.resolve(
  process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups')
);
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const MODE = (process.argv[2] || 'incremental').toLowerCase();

if (!['full', 'incremental'].includes(MODE)) {
  console.error(`ERROR: Unknown mode "${MODE}". Use "full" or "incremental".`);
  process.exit(1);
}

// Collections that hold time-series / research data — always back up fully
const LONGITUDINAL_COLLECTIONS = new Set([
  'activities',
  'ailogs',
  'spirecrords',
  'ledgers',
  'longitudinaldatas',
  'neprepports',
  'challenges',
  'simulationsessions',
  'attentionmetrics',
  'cognitiveprofiles',
  'predictionvalidations',
  'knowledgegraphs',
  'hmmstates',
  'kalmanstates',
  'bayesiannetworks',
]);

// ── Utilities ─────────────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function manifestPath(backupRoot) {
  return path.join(backupRoot, 'manifest.json');
}

function latestManifest() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const dirs = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(f))
    .sort()
    .reverse();
  for (const dir of dirs) {
    const mp = manifestPath(path.join(BACKUP_DIR, dir));
    if (fs.existsSync(mp)) {
      try { return JSON.parse(fs.readFileSync(mp, 'utf8')); }
      catch { /* corrupt manifest, skip */ }
    }
  }
  return null;
}

function purgeOldBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const dirs = fs.readdirSync(BACKUP_DIR)
    .filter(f => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(f));
  for (const dir of dirs) {
    const fullPath = path.join(BACKUP_DIR, dir);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`  [PURGE] Removed old backup: ${dir}`);
    }
  }
}

// ── Backup a single collection ────────────────────────────────────────────────
async function backupCollection(db, collectionName, outputDir, since) {
  const outputFile = path.join(outputDir, `${collectionName}.ndjson.gz`);
  const writeStream = fs.createWriteStream(outputFile);
  const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

  // Build query: incremental uses updatedAt or _id insertion time
  let query = {};
  if (since && !LONGITUDINAL_COLLECTIONS.has(collectionName)) {
    query = {
      $or: [
        { updatedAt: { $gte: since } },
        { createdAt: { $gte: since } },
      ],
    };
  }

  const cursor = db.collection(collectionName).find(query).batchSize(500);

  let count = 0;
  const chunks = [];

  // Buffer in chunks to avoid holding entire collection in RAM
  const CHUNK_SIZE = 200;
  let docBuffer = [];

  await new Promise((resolve, reject) => {
    cursor.forEach(
      doc => {
        docBuffer.push(JSON.stringify(doc) + '\n');
        count++;
        if (docBuffer.length >= CHUNK_SIZE) {
          const chunk = docBuffer.join('');
          docBuffer = [];
          if (!gzip.write(chunk)) {
            cursor.pause();
            gzip.once('drain', () => cursor.resume());
          }
        }
      },
      err => {
        if (err) { reject(err); return; }
        if (docBuffer.length > 0) gzip.write(docBuffer.join(''));
        gzip.end();
        resolve();
      }
    );
    gzip.pipe(writeStream);
    writeStream.on('error', reject);
    gzip.on('error', reject);
    writeStream.on('finish', () => {});
  });

  const fileSizeKB = Math.round(fs.statSync(outputFile).size / 1024);
  return { collection: collectionName, documents: count, fileSizeKB };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();
  console.log(`\n=== NEP3 Database Backup [${MODE.toUpperCase()}] ===`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Determine incremental cutoff
  let since = null;
  let effectiveMode = MODE;
  if (MODE === 'incremental') {
    const last = latestManifest();
    if (last && last.completedAt) {
      since = new Date(last.completedAt);
      console.log(`Incremental since: ${since.toISOString()}\n`);
    } else {
      console.log('No prior manifest found — falling back to full backup.\n');
      effectiveMode = 'full';
    }
  }

  // Create backup directory
  const ts = timestamp();
  const backupRoot = path.join(BACKUP_DIR, ts);
  fs.mkdirSync(backupRoot, { recursive: true });

  // Connect
  await mongoose.connect(MONGODB_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  console.log(`Connected to MongoDB.\n`);

  // List collections
  const collectionInfos = await db.listCollections().toArray();
  const collectionNames = collectionInfos.map(c => c.name).sort();

  console.log(`Collections to back up: ${collectionNames.length}\n`);

  // Back up each collection
  const results = [];
  let totalDocs = 0;
  for (const name of collectionNames) {
    process.stdout.write(`  Backing up: ${name.padEnd(35)}`);
    try {
      const result = await backupCollection(db, name, backupRoot, since);
      totalDocs += result.documents;
      results.push({ ...result, status: 'ok' });
      console.log(`${String(result.documents).padStart(7)} docs  ${result.fileSizeKB} KB`);
    } catch (err) {
      results.push({ collection: name, status: 'error', error: err.message });
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Write manifest
  const completedAt = new Date().toISOString();
  const manifest = {
    version: 2,
    mode: effectiveMode,
    startedAt: new Date(startTime).toISOString(),
    completedAt,
    since: since ? since.toISOString() : null,
    mongoUri: MONGODB_URI.replace(/\/\/[^@]+@/, '//<credentials>@'),
    totalCollections: collectionNames.length,
    totalDocuments: totalDocs,
    durationMs: Date.now() - startTime,
    collections: results,
  };
  fs.writeFileSync(manifestPath(backupRoot), JSON.stringify(manifest, null, 2));

  // Purge old backups
  purgeOldBackups();

  await mongoose.disconnect();

  console.log(`\n=== Backup Complete ===`);
  console.log(`Location : ${backupRoot}`);
  console.log(`Duration : ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`Documents: ${totalDocs.toLocaleString()}`);
  const errors = results.filter(r => r.status === 'error');
  if (errors.length) {
    console.warn(`\nWARNING: ${errors.length} collection(s) failed:`);
    errors.forEach(e => console.warn(`  - ${e.collection}: ${e.error}`));
    process.exit(2);
  }
  console.log('');
}

main().catch(err => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
