'use strict';

/**
 * TypeScript parser — extends JS parser, handles type annotations.
 */
const { parse: parseJS } = require('./javascript');

function parse(sourceText, relativePath) {
  const result = parseJS(sourceText, relativePath);
  result.language = 'typescript';
  // TypeScript annotations are partially handled in the JS parser already
  // (the regex catches `: Type` patterns in params and return types)
  return result;
}

module.exports = { parse };
