'use strict';

const { existsSync } = require('fs');
const path = require('path');
const { walk } = require('./walk');
const { buildManifest } = require('./manifest');
const { detectPrimaryLanguage } = require('./filters');
const logger = require('../utils/logger');

/**
 * @typedef {Object} FileManifest
 * @property {string} relativePath
 * @property {string} absolutePath
 * @property {string} language
 * @property {number} sizeBytes
 * @property {string} hash
 */

/**
 * Main crawler entrypoint.
 * @param {string} targetDir
 * @param {Object} config
 * @returns {{ files: FileManifest[], skipped: Object[], meta: Object }}
 */
async function crawl(targetDir, config) {
  const maxSizeBytes = (config.maxFileSizeKb || 500) * 1024;

  const absPaths = await walk(targetDir, config);
  let allFiles = buildManifest(absPaths, targetDir);

  // Size filter
  const skipped = [];
  const files = allFiles.filter((f) => {
    if (f.sizeBytes > maxSizeBytes) {
      logger.warn(`Skipping large file (${Math.round(f.sizeBytes / 1024)}KB): ${f.relativePath}`);
      skipped.push({ ...f, reason: 'too large' });
      return false;
    }
    return true;
  });

  const primaryLanguage = detectPrimaryLanguage(files);

  // Laravel detection
  let framework = null;
  const artisanPath = path.join(targetDir, 'artisan');
  const appDir = path.join(targetDir, 'app');
  if (existsSync(artisanPath) && existsSync(appDir)) {
    framework = 'laravel';
    logger.info('Detected Laravel project.');
  }

  const meta = {
    name: path.basename(targetDir),
    primaryLanguage,
    framework,
    targetDir,
    totalFiles: files.length,
    analyzedAt: new Date().toISOString(),
  };

  return { files, skipped, meta };
}

module.exports = { crawl };
