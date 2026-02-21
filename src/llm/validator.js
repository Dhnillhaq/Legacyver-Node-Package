'use strict';

const logger = require('../utils/logger');

/**
 * Post-generation quality validator.
 *
 * Two checks:
 *  1. Hallucination check: identifiers in LLM output not found in FileFacts or raw source
 *  2. Completeness check: exported symbols not mentioned in LLM output
 */

/**
 * @param {Object} fragment  { relativePath, content }
 * @param {Object} fileFacts
 * @returns {{ hallucinations: string[], missingExports: string[], passed: boolean }}
 */
function validateFragment(fragment, fileFacts) {
  const hallucinations = [];
  const missingExports = [];

  if (!fileFacts) return { hallucinations, missingExports, passed: true };

  const outputText = fragment.content || '';

  // ── Hallucination check ──────────────────────────────────────────────────
  // Collect all known identifiers from FileFacts
  const knownIdentifiers = new Set();
  for (const fn of (fileFacts.functions || [])) {
    knownIdentifiers.add(fn.name);
    for (const p of (fn.params || [])) knownIdentifiers.add(p.name && p.name.replace(/^\$/, ''));
  }
  for (const cls of (fileFacts.classes || [])) {
    knownIdentifiers.add(cls.name);
    for (const m of (cls.methods || [])) knownIdentifiers.add(m);
  }
  for (const imp of (fileFacts.imports || [])) {
    for (const s of (imp.specifiers || [])) knownIdentifiers.add(s);
  }
  for (const exp of (fileFacts.exports || [])) knownIdentifiers.add(exp);

  // Common words to skip (not identifiers)
  const stopWords = new Set(['The', 'This', 'File', 'Function', 'Class', 'Method', 'Returns', 'Return', 'Parameter', 'Param', 'Import', 'Export', 'Overview', 'Usage', 'Example', 'Dependencies', 'Async', 'Static', 'Public', 'Private', 'Protected', 'Boolean', 'String', 'Number', 'Object', 'Array', 'Void', 'Null', 'Undefined', 'True', 'False', 'Error', 'Promise', 'Request', 'Response', 'Node', 'JavaScript', 'TypeScript', 'PHP', 'Python', 'Laravel', 'Express', 'Route', 'Controller', 'Model', 'Service', 'Repository', 'Middleware', 'Provider', 'Summary']);

  const capitalizedIdentifiers = outputText.match(/\b([A-Z][a-zA-Z]{2,})\b/g) || [];
  for (const identifier of capitalizedIdentifiers) {
    if (stopWords.has(identifier)) continue;
    if (!knownIdentifiers.has(identifier)) {
      // Check raw source — it's embedded in the user message so we approximate
      // by checking against function/class names only
      const isInFacts = [...knownIdentifiers].some(k => k && k.toLowerCase() === identifier.toLowerCase());
      if (!isInFacts) {
        logger.warn(`Possible hallucination in ${fragment.relativePath}: identifier '${identifier}' not found in source facts`);
        hallucinations.push(`Suspected hallucination: '${identifier}'`);
      }
    }
  }

  // ── Completeness check ───────────────────────────────────────────────────
  const exportedSymbols = fileFacts.exports || [];
  for (const symbol of exportedSymbols) {
    if (symbol && !outputText.includes(symbol)) {
      logger.warn(`Incomplete doc in ${fragment.relativePath}: exported symbol '${symbol}' not documented`);
      missingExports.push(symbol);
    }
  }

  const passed = hallucinations.length === 0 && missingExports.length === 0;
  return { hallucinations, missingExports, passed };
}

module.exports = { validateFragment };
