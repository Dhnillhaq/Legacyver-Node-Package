'use strict';

const MAX_BODY_LINES = 60;

/**
 * Extract body snippet from source text given line start/end positions.
 * Returns null for simple functions (complexityScore <= 3).
 * @param {string} sourceText
 * @param {number} lineStart  1-indexed
 * @param {number} lineEnd    1-indexed
 * @param {number} complexityScore
 * @returns {{ bodySnippet: string|null, bodySnippetTruncated: boolean }}
 */
function extractBodySnippet(sourceText, lineStart, lineEnd, complexityScore) {
  if (complexityScore <= 3) {
    return { bodySnippet: null, bodySnippetTruncated: false };
  }

  if (!sourceText || lineStart == null || lineEnd == null) {
    return { bodySnippet: null, bodySnippetTruncated: false };
  }

  const lines = sourceText.split('\n');
  const startIdx = Math.max(0, (lineStart || 1) - 1);
  const endIdx = Math.min(lines.length, lineEnd || lines.length);
  const bodyLines = lines.slice(startIdx, endIdx);

  let truncated = false;
  let snippet;
  if (bodyLines.length > MAX_BODY_LINES) {
    snippet = bodyLines.slice(0, MAX_BODY_LINES).join('\n');
    truncated = true;
  } else {
    snippet = bodyLines.join('\n');
  }

  return { bodySnippet: snippet, bodySnippetTruncated: truncated };
}

module.exports = { extractBodySnippet };
