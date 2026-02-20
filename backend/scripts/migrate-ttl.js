/**
 * scripts/migrate-ttl.js
 *
 * Migrates TTL index expiry values on existing MongoDB Atlas collections.
 * Uses the `collMod` command so indexes are updated in-place without
 * dropping/recreating them (safe for live databases).
 *
 * Changes:
 *   Activity.timestamp  TTL: 90 days  → 5 years  (157,680,000 s)
 *   AILog.createdAt     TTL: 30 days  → 2 years   (63,072,000 s)
 *
 * Usage:
 *   node scripts/migrate-ttl.js
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

// ── TTL targets ──────────────────────────────────────────────────────────────
const MIGRATIONS = [
  {
    collection: 'activities',
    indexName: 'timestamp_1',          // Mongoose default name: <field>_<direction>
    field: 'timestamp',
    newTTL: 157680000,                 // 5 years in seconds
    description: 'Activity audit trail (90 days → 5 years)',
  },
  {
    collection: 'ailogs',
    indexName: 'createdAt_1',
    field: 'createdAt',
    newTTL: 63072000,                  // 2 years in seconds
    description: 'AI evaluation log (30 days → 2 years)',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getIndexExpiry(db, collection, indexName) {
  const indexes = await db.collection(collection).indexes();
  const idx = indexes.find(i => i.name === indexName);
  return idx ? idx.expireAfterSeconds : null;
}

async function updateTTL(db, migration) {
  const { collection, indexName, field, newTTL, description } = migration;

  // Check current value
  const current = await getIndexExpiry(db, collection, indexName);

  if (current === null) {
    console.warn(`  [SKIP] Index "${indexName}" not found on "${collection}". ` +
                 `It will be created with the correct TTL when the app next starts.`);
    return;
  }

  if (current === newTTL) {
    console.log(`  [OK]   "${collection}.${field}" already at ${newTTL}s (${description})`);
    return;
  }

  console.log(`  [UPD]  "${collection}.${field}" ${current}s → ${newTTL}s`);
  console.log(`         (${description})`);

  await db.command({
    collMod: collection,
    index: {
      name: indexName,
      expireAfterSeconds: newTTL,
    },
  });

  console.log(`  [DONE] TTL updated for "${collection}.${field}"`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== NEP3 TTL Migration ===\n');

  await mongoose.connect(MONGODB_URI, { autoIndex: false });
  const db = mongoose.connection.db;

  console.log(`Connected to: ${MONGODB_URI.replace(/\/\/[^@]+@/, '//<credentials>@')}\n`);

  for (const migration of MIGRATIONS) {
    await updateTTL(db, migration);
  }

  console.log('\nMigration complete.\n');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
