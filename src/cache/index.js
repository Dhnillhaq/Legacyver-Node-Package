'use strict';

const { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CACHE_FILE = 'hashes.json';

/**
 * Load cache from .legacyver-cache/hashes.json.
 * @param {string} cacheDir
 * @returns {Object} map of relativePath -> { hash, docFile, generatedAt }
 */
function loadCache(cacheDir) {
  const cachePath = path.join(cacheDir, CACHE_FILE);
  if (!existsSync(cachePath)) return {};
  try {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  } catch (e) {
    logger.warn(`Could not read cache: ${e.message}`);
    return {};
  }
}

/**
 * Save cache to .legacyver-cache/hashes.json.
 * @param {string} cacheDir
 * @param {Object} map
 */
function saveCache(cacheDir, map) {
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, CACHE_FILE);
  writeFileSync(cachePath, JSON.stringify(map, null, 2), 'utf8');
}

/**
 * Separate files into cache hits and misses.
 * @param {Array} manifest  FileManifest[]
 * @param {Object} cacheMap
 * @returns {{ hits: Array, misses: Array }}
 */
function getCacheHits(manifest, cacheMap) {
  const hits = [];
  const misses = [];
  for (const file of manifest) {
    const cached = cacheMap[file.relativePath];
    if (cached && cached.hash === file.hash) {
      hits.push(file);
    } else {
      misses.push(file);
    }
  }
  return { hits, misses };
}

/**
 * Remove entries for files that no longer exist on disk.
 * @param {Object} cacheMap  mutated in place
 * @param {string[]} currentPaths  relative paths currently on disk
 */
function purgeDeleted(cacheMap, currentPaths) {
  const current = new Set(currentPaths);
  for (const key of Object.keys(cacheMap)) {
    if (!current.has(key)) {
      delete cacheMap[key];
    }
  }
}

/**
 * Auto-add .legacyver-cache/ to .gitignore if it exists in projectRoot.
 * @param {string} projectRoot
 */
function autoAddToGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!existsSync(gitignorePath)) return;
  const content = readFileSync(gitignorePath, 'utf8');
  if (!content.includes('.legacyver-cache')) {
    appendFileSync(gitignorePath, '\n.legacyver-cache/\n');
    logger.info('Added .legacyver-cache/ to .gitignore');
  }
}

module.exports = { loadCache, saveCache, getCacheHits, purgeDeleted, autoAddToGitignore };
