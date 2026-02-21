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
  const stopWords = new Set(['The', 'This', 'File', 'Function', 'Functions', 'Class', 'Method', 'Returns', 'Return', 'Parameter', 'Parameters', 'Param', 'Import', 'Export', 'Overview', 'Usage', 'Example', 'Dependencies', 'Dependency', 'Async', 'Static', 'Public', 'Private', 'Protected', 'Boolean', 'String', 'Number', 'Object', 'Array', 'Void', 'Null', 'Undefined', 'True', 'False', 'Error', 'Promise', 'Request', 'Response', 'Node', 'JavaScript', 'TypeScript', 'PHP', 'Python', 'Laravel', 'Express', 'Route', 'Controller', 'Model', 'Service', 'Repository', 'Middleware', 'Provider', 'Summary', 'None', 'Name', 'Description', 'Value', 'Type', 'Map', 'Set', 'Date', 'Creates', 'Create', 'Retrieves', 'Retrieve', 'Updates', 'Update', 'Deletes', 'Delete', 'Validates', 'Validate', 'Destroys', 'Destroy', 'Returns', 'Return', 'Gets', 'Get', 'Sets', 'Set', 'Checks', 'Check', 'Handles', 'Handle', 'Builds', 'Build', 'Loads', 'Load', 'Saves', 'Save', 'Sends', 'Send', 'Reads', 'Read', 'Writes', 'Write', 'Parses', 'Parse', 'Formats', 'Format', 'Converts', 'Convert', 'Generates', 'Generate', 'Initializes', 'Initialize', 'Registers', 'Register', 'Removes', 'Remove', 'Adds', 'Add', 'Lists', 'List', 'Fetches', 'Fetch', 'Renders', 'Render', 'Runs', 'Run', 'Starts', 'Start', 'Stops', 'Stop', 'Optional', 'Required', 'Default', 'Properties', 'Methods', 'Fields', 'Attributes', 'Throws', 'Emits', 'For', 'With', 'From', 'Into', 'Upon', 'When', 'After', 'Before', 'During', 'John', 'Jane', 'Doe', 'Example', 'New', 'Old', 'Current', 'Previous', 'Next', 'First', 'Last', 'All', 'Each', 'Every', 'Any', 'Given', 'Note', 'See', 'Also', 'More', 'Less', 'Here', 'There', 'Where', 'How', 'What', 'Which', 'Such', 'Like', 'Used', 'Uses', 'Using']);

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
