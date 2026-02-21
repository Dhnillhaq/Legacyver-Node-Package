'use strict';

const path = require('path');
const { readFileSync } = require('fs');
const logger = require('../utils/logger');

const PARSERS = {
  javascript: () => require('./ast/javascript'),
  typescript: () => require('./ast/typescript'),
  python: () => require('./ast/python'),
  java: () => require('./ast/java'),
  go: () => require('./ast/go'),
  php: () => require('./ast/php'),
};

/**
 * Dispatch parsing to the appropriate language parser.
 * @param {import('../crawler/index').FileManifest} fileManifest
 * @param {Object} meta  project metadata (includes framework)
 * @returns {Object} FileFacts
 */
function parseFile(fileManifest, meta) {
  const { absolutePath, relativePath, language } = fileManifest;

  let sourceText;
  try {
    sourceText = readFileSync(absolutePath, 'utf8');
  } catch (e) {
    logger.warn(`Could not read file: ${relativePath}`);
    return null;
  }

  let facts;
  if (language && PARSERS[language]) {
    try {
      const parser = PARSERS[language]();
      facts = parser.parse(sourceText, relativePath);
    } catch (e) {
      logger.warn(`AST parse failed for ${relativePath}: ${e.message}. Falling back to generic.`);
      facts = require('./ast/generic').parse(sourceText, relativePath, language);
    }
  } else {
    facts = require('./ast/generic').parse(sourceText, relativePath, language);
  }

  if (!facts) return null;

  facts.hash = fileManifest.hash;

  // Laravel enrichment
  if (language === 'php' && meta && meta.framework === 'laravel') {
    const { enrich } = require('./ast/laravel/index');
    facts = enrich(sourceText, facts);
  }

  return facts;
}

/**
 * Parse all files and assemble the PKG.
 * @param {import('../crawler/index').FileManifest[]} files
 * @param {Object} meta
 * @param {Object} config
 * @returns {Object} PKG
 */
async function parseFiles(files, meta, config) {
  const allFacts = [];

  for (const file of files) {
    const facts = parseFile(file, meta);
    if (facts) allFacts.push(facts);
  }

  const { buildCallGraph } = require('./call-graph');
  const factsWithGraph = buildCallGraph(allFacts);

  const { buildPKG } = require('./pkg-builder');
  return buildPKG(factsWithGraph, meta);
}

module.exports = { parseFile, parseFiles };
