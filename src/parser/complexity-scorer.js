'use strict';

/**
 * Complexity scorer — given function/method facts + body text,
 * computes a complexityScore and classifies it.
 */

const DOMAIN_PATTERNS = require('./pattern-detector');

/**
 * Score a function based on its body text using heuristics.
 * @param {string} bodyText  raw source of the function body
 * @returns {{ complexityScore: number, complexityClass: string, detectedPatterns: string[] }}
 */
function scoreComplexity(bodyText) {
  if (!bodyText) {
    return { complexityScore: 0, complexityClass: 'simple', detectedPatterns: [] };
  }

  let score = 0;

  // Binary/ternary operators
  const arithmeticOps = (bodyText.match(/[\+\-\*\/\%\*\*\?\?]/g) || []).length;
  score += Math.min(arithmeticOps, 5); // cap to avoid noise

  // Conditional branches
  const ifCount = (bodyText.match(/\bif\s*\(/g) || []).length;
  const elseIfCount = (bodyText.match(/\belse\s+if\s*\(/g) || []).length;
  const switchCase = (bodyText.match(/\bcase\b/g) || []).length;
  const ternary = (bodyText.match(/\?[^:]/g) || []).length;
  score += ifCount + elseIfCount + switchCase + ternary;

  // Loop constructs
  const forCount = (bodyText.match(/\bfor\s*\(/g) || []).length;
  const foreachCount = (bodyText.match(/\bforeach\s*\(/g) || []).length;
  const whileCount = (bodyText.match(/\bwhile\s*\(/g) || []).length;
  const doCount = (bodyText.match(/\bdo\s*\{/g) || []).length;
  score += forCount + foreachCount + whileCount + doCount;

  // Nesting depth beyond level 1
  let depth = 0;
  let maxDepth = 0;
  for (const ch of bodyText) {
    if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; }
    else if (ch === '}') { depth--; }
  }
  if (maxDepth > 1) score += maxDepth - 1;

  // Domain patterns
  const detectedPatterns = DOMAIN_PATTERNS.detectPatterns(bodyText);
  score += detectedPatterns.length * 2;

  const complexityClass =
    score <= 3 ? 'simple' : score <= 8 ? 'moderate' : 'complex';

  return { complexityScore: score, complexityClass, detectedPatterns };
}

module.exports = { scoreComplexity };
