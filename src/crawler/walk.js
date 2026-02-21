'use strict';

const fg = require('fast-glob');
const ignore = require('ignore');
const { readFileSync, existsSync } = require('fs');
const path = require('path');
const { DEFAULT_IGNORE_PATTERNS, ALL_EXTENSIONS } = require('./filters');

/**
 * Walk a directory and return all matching source file paths.
 * @param {string} targetDir
 * @param {Object} config
 * @returns {string[]} absolute paths
 */
async function walk(targetDir, config) {
  // Build ignore manager
  const ig = ignore();

  // Load .legacyverignore
  const legacyverIgnorePath = path.join(targetDir, '.legacyverignore');
  if (existsSync(legacyverIgnorePath)) {
    const content = readFileSync(legacyverIgnorePath, 'utf8');
    ig.add(content);
  }

  // Load .gitignore
  const gitignorePath = path.join(targetDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf8');
    ig.add(content);
  }

  // Build extension glob patterns
  const extGlobs = ALL_EXTENSIONS.map(ext => `**/*${ext}`);

  const rawPaths = await fg(extGlobs, {
    cwd: targetDir,
    absolute: true,
    ignore: DEFAULT_IGNORE_PATTERNS,
    dot: false,
    followSymbolicLinks: false,
  });

  // Apply .legacyverignore and .gitignore on relative paths
  return rawPaths.filter((absPath) => {
    const rel = path.relative(targetDir, absPath);
    return !ig.ignores(rel);
  });
}

module.exports = { walk };
