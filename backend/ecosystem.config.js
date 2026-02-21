/**
 * ecosystem.config.js — PM2 process manager configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js              # start
 *   pm2 reload ecosystem.config.js             # zero-downtime reload
 *   pm2 stop ecosystem.config.js
 *   pm2 logs nep-workbench-api
 *   pm2 monit
 */

'use strict';

module.exports = {
  apps: [
    {
      name: 'nep-workbench-api',
      script: 'server.js',

      // ── Cluster mode ────────────────────────────────────────────────────────
      // 'max' uses all available CPU cores. On a t3.medium (2 vCPU) this gives
      // 2 workers. Adjust to a fixed number if you need to reserve a core for
      // nginx / MongoDB Atlas proxy.
      exec_mode: 'cluster',
      instances: 2,                     // one per CPU core (2 vCPU) — was 'max' but PM2 defaulted to fork

      // ── Node.js performance flags ────────────────────────────────────────────
      node_args: [
        '--max-old-space-size=350',     // cap V8 heap per worker at 350MB (2×350=700MB total)
        '--optimize-for-size',          // reduce memory footprint
      ],

      // ── Restart policy ──────────────────────────────────────────────────────
      autorestart: true,
      watch: false,                     // never watch in production
      max_memory_restart: '380M',       // was 512M — restart before OOM kills the whole server
      restart_delay: 3000,              // wait 3 s before restart
      max_restarts: 15,                 // was 10
      min_uptime: '10s',                // must stay up 10 s to count as "stable"

      // ── Logs ────────────────────────────────────────────────────────────────
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,                 // merge cluster worker logs into one file
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── Source maps ─────────────────────────────────────────────────────────
      source_map_support: false,

      // ── Environment overrides ────────────────────────────────────────────────
      // These are DEFAULTS. Real secrets must come from the OS environment or
      // AWS Parameter Store — never commit actual values here.
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
    },
  ],
};
