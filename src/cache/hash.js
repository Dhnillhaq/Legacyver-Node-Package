'use strict';

const { createHash } = require('crypto');
const { readFileSync } = require('fs');

/**
 * Compute SHA-256 hash of a file.
 * @param {string} filePath
 * @returns {string} hex string prefixed with 'sha256:'
 */
function computeHash(filePath) {
  const content = readFileSync(filePath);
  return 'sha256:' + createHash('sha256').update(content).digest('hex');
}

module.exports = { computeHash };
