'use strict';

/**
 * PostgreSQL connection config for the Legacyver hackathon database.
 * Uses SSL with self-signed certificate (rejectUnauthorized: false).
 */
module.exports = {
  host: '103.185.52.138',
  port: 1185,
  user: 'weci_holic',
  password: 'f==+HLH_bvzLN2fo82f3x239MZE3@bGF',
  database: 'weci_holic',
  ssl: { rejectUnauthorized: false },
  // Keep pool small — CLI is short-lived
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
};
