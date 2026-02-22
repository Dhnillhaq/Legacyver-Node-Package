'use strict';

const { Pool } = require('pg');
const path = require('path');
const dbConfig = require('./config');
const { loadSession } = require('../utils/config');
const { validateToken } = require('../api/auth');
const logger = require('../utils/logger');

let _pool = null;

/**
 * Lazy singleton pool — created on first use, ended after push.
 */
function getPool() {
  if (!_pool) {
    _pool = new Pool(dbConfig);
  }
  return _pool;
}

/**
 * Find or create a repository for the given user + project path.
 * @param {Pool} pool
 * @param {string} userId  app.users.id (BIGINT as string)
 * @param {string} projectPath  absolute path of the analyzed directory
 * @returns {Promise<string>} repository id (UUID)
 */
async function getOrCreateRepo(pool, userId, projectPath) {
  const name = path.basename(projectPath);
  const fullName = projectPath;

  // Try find existing
  const existing = await pool.query(
    'SELECT id FROM app.repositories WHERE user_id = $1 AND full_name = $2',
    [userId, fullName]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Insert new
  const inserted = await pool.query(
    'INSERT INTO app.repositories (user_id, name, full_name) VALUES ($1, $2, $3) RETURNING id',
    [userId, name, fullName]
  );
  return inserted.rows[0].id;
}

/**
 * Find or create a documentation record for a repository.
 * One documentation per repository (title = repo name).
 * @param {Pool} pool
 * @param {string} repositoryId  UUID
 * @param {string} repoName
 * @returns {Promise<string>} documentation id (UUID)
 */
async function getOrCreateDocumentation(pool, repositoryId, repoName) {
  const existing = await pool.query(
    'SELECT id FROM app.documentations WHERE repository_id = $1',
    [repositoryId]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await pool.query(
    'INSERT INTO app.documentations (repository_id, title, description) VALUES ($1, $2, $3) RETURNING id',
    [repositoryId, `${repoName} Documentation`, `Auto-generated documentation for ${repoName}`]
  );
  return inserted.rows[0].id;
}

/**
 * Upsert documentation pages.
 * Each fragment becomes a page; slug = file path, title = file name.
 * Uses (documentation_id, slug) as the logical unique key.
 * @param {Pool} pool
 * @param {string} documentationId  UUID
 * @param {Array<{relativePath: string, content: string}>} fragments
 * @returns {Promise<number>} count of upserted pages
 */
async function upsertPages(pool, documentationId, fragments) {
  let count = 0;
  for (let i = 0; i < fragments.length; i++) {
    const frag = fragments[i];
    const slug = frag.relativePath.replace(/\\/g, '/');
    const title = path.basename(frag.relativePath);

    // Check if page exists
    const existing = await pool.query(
      'SELECT id FROM app.documentation_pages WHERE documentation_id = $1 AND slug = $2',
      [documentationId, slug]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE app.documentation_pages SET content = $1, title = $2, page_order = $3, created_at = NOW() WHERE id = $4',
        [frag.content, title, i + 1, existing.rows[0].id]
      );
    } else {
      // Insert new
      await pool.query(
        'INSERT INTO app.documentation_pages (documentation_id, slug, title, content, page_order) VALUES ($1, $2, $3, $4, $5)',
        [documentationId, slug, title, frag.content, i + 1]
      );
    }
    count++;
  }
  return count;
}

/**
 * Top-level push function. Called from analyze command.
 * Validates the CLI token, then pushes docs to DB.
 * Short-circuits if user is not logged in or token is invalid.
 * @param {Array<{relativePath: string, content: string}>} fragments
 * @param {string} projectPath  absolute path of the analyzed directory
 * @param {object} [opts]          optional overrides for testing
 * @param {object} [opts.pool]     pg Pool instance (skips singleton pool)
 * @param {object} [opts.session]  session object (skips loadSession)
 * @param {object} [opts.user]     user object (skips validateToken) — { userId, username, email }
 * @returns {Promise<{skipped: boolean, pushed?: number}>}
 */
async function pushToDatabase(fragments, projectPath, opts) {
  const session = (opts && opts.session) || loadSession();
  if (!session.token) {
    return { skipped: true };
  }

  // Validate the token to get user info
  let user = (opts && opts.user) || null;
  if (!user) {
    user = await validateToken(session.token);
    if (!user) {
      return { skipped: true };
    }
  }

  const ownPool = !(opts && opts.pool);
  const pool = (opts && opts.pool) || getPool();
  try {
    const repoName = path.basename(projectPath);
    const repoId = await getOrCreateRepo(pool, user.userId, projectPath);
    const docId = await getOrCreateDocumentation(pool, repoId, repoName);
    const pushed = await upsertPages(pool, docId, fragments);
    return { skipped: false, pushed };
  } finally {
    if (ownPool) {
      await pool.end().catch(() => {});
      _pool = null;
    }
  }
}

module.exports = { getPool, getOrCreateRepo, getOrCreateDocumentation, upsertPages, pushToDatabase };
