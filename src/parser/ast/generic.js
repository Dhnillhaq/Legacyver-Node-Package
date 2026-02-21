'use strict';

/**
 * Generic regex-based fallback parser for unsupported languages.
 */
const logger = require('../../utils/logger');

function parse(sourceText, relativePath, language) {
  const lines = sourceText.split('\n');
  const functions = [];
  const imports = [];
  const classes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Function-like patterns (very rough)
    let m = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?.*?\)?\s*=>|\bdef\s+(\w+)|(?:public|private|protected|static)?\s+function\s+(\w+))/);
    if (m) {
      const name = m[1] || m[2] || m[3] || m[4];
      if (name) {
        functions.push({
          name,
          params: [],
          returnType: null,
          isExported: /\bexport\b/.test(line),
          isAsync: /\basync\b/.test(line),
          lineStart: i + 1,
          lineEnd: i + 1,
          calls: [],
          complexityScore: null,
          complexityClass: null,
          detectedPatterns: [],
          bodySnippet: null,
          bodySnippetTruncated: false,
        });
      }
    }

    // Import-like lines
    m = line.match(/(?:import|require|from|#include|using)\s+['"]?([^'";\s]+)['"]?/);
    if (m) {
      imports.push({ module: m[1], specifiers: [] });
    }

    // Class definitions
    m = line.match(/\bclass\s+(\w+)/);
    if (m) {
      classes.push({ name: m[1], methods: [], extends: null });
    }
  }

  const exports = functions.filter(f => f.isExported).map(f => f.name);

  logger.warn(`No AST parser for ${language || 'unknown'}, using generic fallback: ${relativePath}`);

  return {
    relativePath,
    language: language || 'unknown',
    linesOfCode: lines.length,
    functions,
    classes,
    imports,
    exports,
    callsTo: [],
    calledBy: [],
    hash: null,
    parserType: 'generic',
  };
}

module.exports = { parse };
