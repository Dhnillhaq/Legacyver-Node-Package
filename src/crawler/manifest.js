'use strict';

const { createHash } = require('crypto');
const { statSync, readFileSync } = require('fs');
const path = require('path');
const { detectLanguage } = require('./filters');

/**
 * Build a FileManifest[] from a list of absolute paths.
 * @param {string[]} absPaths
 * @param {string} targetDir
 * @returns {import('./index').FileManifest[]}
 */
function buildManifest(absPaths, targetDir) {
  return absPaths.map((absPath) => {
    const ext = path.extname(absPath).toLowerCase();
    const language = detectLanguage(ext);
    const stat = statSync(absPath);
    const sizeBytes = stat.size;

    let hash = null;
    try {
      const content = readFileSync(absPath);
      hash = 'sha256:' + createHash('sha256').update(content).digest('hex');
    } catch (e) {
      // unreadable file
    }

    return {
      relativePath: path.relative(targetDir, absPath).replace(/\\/g, '/'),
      absolutePath: absPath,
      language,
      sizeBytes,
      hash,
    };
  });
}

module.exports = { buildManifest };
