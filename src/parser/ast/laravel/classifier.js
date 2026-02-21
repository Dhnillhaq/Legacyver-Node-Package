'use strict';

const path = require('path');

/**
 * Classify a Laravel PHP file into its role.
 * @param {string} relativePath
 * @param {string} sourceText
 * @returns {string} 'controller'|'model'|'middleware'|'provider'|'route_file'|'blade'|'request'|'other'
 */
function classify(relativePath, sourceText) {
  const rel = relativePath.replace(/\\/g, '/');

  if (rel.endsWith('.blade.php')) return 'blade';
  if (/^routes\//.test(rel)) return 'route_file';
  if (/app\/Http\/Controllers\//.test(rel)) return 'controller';
  if (/app\/Models\//.test(rel)) return 'model';
  if (/app\/Http\/Middleware\//.test(rel)) return 'middleware';
  if (/app\/Providers\//.test(rel)) return 'provider';
  if (/app\/Http\/Requests\//.test(rel)) return 'request';

  // Fallback: inspect source
  if (/extends\s+Controller\b/.test(sourceText)) return 'controller';
  if (/extends\s+Model\b/.test(sourceText)) return 'model';
  if (/extends\s+ServiceProvider\b/.test(sourceText)) return 'provider';

  return 'other';
}

module.exports = { classify };
