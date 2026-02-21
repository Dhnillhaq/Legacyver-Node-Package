'use strict';

const { scoreComplexity } = require('../complexity-scorer');
const { extractBodySnippet } = require('../body-extractor');

function parse(sourceText, relativePath) {
  const lines = sourceText.split('\n');
  const functions = [];
  const classes = [];
  const imports = [];
  const exports = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Imports
    let m = trimmed.match(/^import\s+(\w+)$/);
    if (m) { imports.push({ module: m[1], specifiers: [] }); continue; }
    m = trimmed.match(/^from\s+(\S+)\s+import\s+(.+)$/);
    if (m) {
      const specifiers = m[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
      imports.push({ module: m[1], specifiers });
      continue;
    }
    m = trimmed.match(/^import\s+(\S+)\s+as\s+\w+$/);
    if (m) { imports.push({ module: m[1], specifiers: [] }); continue; }

    // Class
    m = trimmed.match(/^class\s+(\w+)/);
    if (m) {
      classes.push({ name: m[1], methods: [], extends: null });
      continue;
    }

    // Function / def
    m = trimmed.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?:/);
    if (m) {
      const name = m[1];
      const params = m[2].split(',').map(p => {
        const pm = p.trim().match(/(\w+)(?:\s*:\s*(\S+?))?(?:\s*=.*)?$/);
        return pm ? { name: pm[1], type: pm[2] || null } : { name: p.trim(), type: null };
      }).filter(p => p.name && p.name !== 'self' && p.name !== 'cls');
      const returnType = m[3] || null;
      const lineEnd = findBlockEnd(lines, i);
      const body = lines.slice(i, lineEnd).join('\n');
      const complexity = scoreComplexity(body);
      const snippet = extractBodySnippet(sourceText, i + 1, lineEnd, complexity.complexityScore);
      functions.push({
        name,
        params,
        returnType,
        isExported: !name.startsWith('_'),
        isAsync: /^async\s+def/.test(trimmed),
        lineStart: i + 1,
        lineEnd,
        calls: extractCalls(body),
        ...complexity,
        bodySnippet: snippet.bodySnippet,
        bodySnippetTruncated: snippet.bodySnippetTruncated,
      });
    }
  }

  const publicFns = functions.filter(f => f.isExported).map(f => f.name);

  return {
    relativePath,
    language: 'python',
    linesOfCode: lines.length,
    functions,
    classes,
    imports,
    exports: publicFns,
    callsTo: [],
    calledBy: [],
    hash: null,
    parserType: 'ast',
  };
}

function findBlockEnd(lines, startIdx) {
  const baseIndent = lines[startIdx] ? lines[startIdx].match(/^(\s*)/)[1].length : 0;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent <= baseIndent) return i;
  }
  return lines.length;
}

function extractCalls(body) {
  const calls = new Set();
  const m = body.matchAll(/\b(\w+)\s*\(/g);
  const keywords = new Set(['if', 'for', 'while', 'def', 'class', 'return', 'import', 'from', 'with', 'as', 'not', 'and', 'or', 'in', 'is', 'elif', 'else', 'try', 'except', 'finally', 'raise', 'del', 'lambda', 'yield', 'async', 'await', 'pass', 'break', 'continue', 'print']);
  for (const match of m) {
    const name = match[1];
    if (!keywords.has(name) && name.length > 1) calls.add(name);
  }
  return [...calls];
}

module.exports = { parse };
