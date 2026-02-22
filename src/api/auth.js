'use strict';

const crypto = require('crypto');
const { Pool } = require('pg');
const dbConfig = require('../db/config');

/**
 * Validate a CLI session token against app.user_sessions.
 * Returns user info if valid, null if expired/revoked/not found.
 *
 * @param {string} token  raw token from ~/.legacyver/session.json
 * @param {object} [opts]          optional overrides for testing
 * @param {object} [opts.pool]     pg Pool instance
 * @returns {Promise<{userId: string, username: string, email: string} | null>}
 */
async function validateToken(token, opts) {
  if (!token) return null;

  const ownPool = !(opts && opts.pool);
  const pool = (opts && opts.pool) || new Pool(dbConfig);
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT s.user_id, u.username, u.email
       FROM app.user_sessions s
       JOIN app.users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
         AND s.revoked_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: String(row.user_id),
      username: row.username || 'unknown',
      email: row.email || '',
    };
  } finally {
    if (ownPool) await pool.end().catch(() => {});
  }
}

/**
 * Revoke a CLI session token (logout).
 * @param {string} token  raw token
 * @param {object} [opts]          optional overrides for testing
 * @param {object} [opts.pool]     pg Pool instance
 */
async function revokeToken(token, opts) {
  if (!token) return;

  const ownPool = !(opts && opts.pool);
  const pool = (opts && opts.pool) || new Pool(dbConfig);
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query(
      'UPDATE app.user_sessions SET revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  } finally {
    if (ownPool) await pool.end().catch(() => {});
  }
}

module.exports = { validateToken, revokeToken };
