'use strict';

const crypto = require('crypto');
const { supabase, createDbClient } = require('../db/config');

/**
 * Validate a CLI session token against app.user_sessions.
 * Returns user info if valid, null if expired/revoked/not found.
 *
 * @param {string} token  raw token from ~/.legacyver/session.json
 * @returns {Promise<{userId: string, username: string, email: string} | null>}
 */
async function validateToken(token) {
  if (!token) return null;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = createDbClient(token); // Use token to bypass RLS

  const { data, error } = await client
    .schema('public')
    .from('user_sessions')
    .select('user_id, users!inner(username, email)')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .is('revoked_at', null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: String(data.user_id),
    username: data.users?.username || 'unknown',
    email: data.users?.email || '',
  };
}

/**
 * Revoke a CLI session token (logout).
 * @param {string} token  raw token
 */
async function revokeToken(token) {
  if (!token) return;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const client = createDbClient(token);

  const { error } = await client
    .schema('public')
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);

  if (error) throw error;
}

module.exports = { validateToken, revokeToken };
