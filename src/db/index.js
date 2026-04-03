'use strict';

const path = require('path');
const { createDbClient } = require('./config');
const { loadSession } = require('../utils/config');
const { validateToken } = require('../api/auth');
const logger = require('../utils/logger');

/**
 * Find or create a repository for the given user + project path.
 * @param {string} userId  app.users.id (BIGINT as string)
 * @param {string} projectPath  absolute path of the analyzed directory
 * @returns {Promise<string>} repository id (UUID)
 */
async function getOrCreateRepo(supabase, userId, projectPath) {
  const name = path.basename(projectPath);
  const fullName = projectPath;

  // Try find existing
  const { data: existing, error: findErr } = await supabase
    .schema('public')
    .from('repositories')
    .select('id')
    .eq('user_id', userId)
    .eq('full_name', fullName)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing.id;

  // Insert new
  const { data: inserted, error: insertErr } = await supabase
    .schema('public')
    .from('repositories')
    .insert({ user_id: userId, name, full_name: fullName })
    .select('id')
    .single();

  if (insertErr) throw insertErr;
  return inserted.id;
}

/**
 * Find or create a documentation record for a repository.
 * One documentation per repository (title = repo name).
 * @param {string} repositoryId  UUID
 * @param {string} repoName
 * @returns {Promise<string>} documentation id (UUID)
 */
async function getOrCreateDocumentation(supabase, repositoryId, repoName) {
  const { data: existing, error: findErr } = await supabase
    .schema('public')
    .from('documentations')
    .select('id')
    .eq('repository_id', repositoryId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing.id;

  const { data: inserted, error: insertErr } = await supabase
    .schema('public')
    .from('documentations')
    .insert({
      repository_id: repositoryId,
      title: `${repoName} Documentation`,
      description: `Auto-generated documentation for ${repoName}`,
    })
    .select('id')
    .single();

  if (insertErr) throw insertErr;
  return inserted.id;
}

/**
 * Upsert documentation pages.
 * Each fragment becomes a page; slug = file path, title = file name.
 * Uses (documentation_id, slug) as the logical unique key.
 * @param {string} documentationId  UUID
 * @param {Array<{relativePath: string, content: string}>} fragments
 * @returns {Promise<number>} count of upserted pages
 */
async function upsertPages(supabase, documentationId, fragments) {
  const rows = fragments.map((frag, i) => ({
    documentation_id: documentationId,
    slug: frag.relativePath.replace(/\\/g, '/'),
    title: path.basename(frag.relativePath),
    content: frag.content,
    page_order: i + 1,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .schema('public')
    .from('documentation_pages')
    .upsert(rows, { onConflict: 'documentation_id,slug' });

  if (error) throw error;
  return rows.length;
}

/**
 * Top-level push function. Called from analyze command.
 * Validates the CLI token, then pushes docs to DB.
 * Short-circuits if user is not logged in or token is invalid.
 * @param {Array<{relativePath: string, content: string}>} fragments
 * @param {string} projectPath  absolute path of the analyzed directory
 * @param {object} [opts]          optional overrides for testing
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

  const supabase = createDbClient(session.token);

  const repoName = path.basename(projectPath);
  const repoId = await getOrCreateRepo(supabase, user.userId, projectPath);
  const docId = await getOrCreateDocumentation(supabase, repoId, repoName);
  const pushed = await upsertPages(supabase, docId, fragments);
  return { skipped: false, pushed };
}

module.exports = { getOrCreateRepo, getOrCreateDocumentation, upsertPages, pushToDatabase };
