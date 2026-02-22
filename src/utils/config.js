'use strict';

const { cosmiconfigSync } = require('cosmiconfig');
const fs = require('fs');
const path = require('path');

/**
 * Session file stores auth state across CLI invocations.
 * Lives in ~/.legacyver/session.json (user-level, not project-level).
 */
const SESSION_DIR = path.join(require('os').homedir(), '.legacyver');
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

function loadSession() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveSession(data) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function clearSession() {
  try { fs.unlinkSync(SESSION_FILE); } catch { /* ignore */ }
}

const explorer = cosmiconfigSync('legacyver', {
  searchPlaces: [
    '.legacyverrc',
    '.legacyverrc.json',
    '.legacyverrc.yaml',
    '.legacyverrc.yml',
    '.legacyverrc.js',
    'legacyver.config.js',
    'legacyver.config.yaml',
    'legacyver.config.yml',
  ],
});

/**
 * Load configuration from file and merge with CLI flags.
 * CLI flags always win over file config.
 * @param {Object} cliFlags
 * @returns {Object}
 */
function loadConfig(cliFlags = {}) {
  let fileConfig = {};
  try {
    const result = explorer.search();
    if (result && result.config) {
      fileConfig = { ...result.config }; // shallow copy — never mutate the cached object
    }
  } catch (e) {
    // no config file found — use defaults
  }

  const defaults = {
    provider: 'groq',
    model: undefined,
    format: 'markdown',
    out: './legacyver-docs',
    concurrency: 3,
    maxFileSizeKb: 500,
    dryRun: false,
    incremental: false,
    confirm: true,
    verbose: false,
  };

  // Merge: defaults < fileConfig < cliFlags (strip undefined cliFlags)
  const cleanCli = Object.fromEntries(
    Object.entries(cliFlags).filter(([, v]) => v !== undefined)
  );

  // If CLI specifies a different provider than what's in the config file,
  // discard the file's model — it belongs to the old provider.
  const effectiveProvider = cleanCli.provider || fileConfig.provider || defaults.provider;
  const fileConfigProvider = fileConfig.provider || defaults.provider;
  if (effectiveProvider !== fileConfigProvider && !cleanCli.model) {
    delete fileConfig.model;
  }

  return { ...defaults, ...fileConfig, ...cleanCli };
}

module.exports = { loadConfig, loadSession, saveSession, clearSession };
