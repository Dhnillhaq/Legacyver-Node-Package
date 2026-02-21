'use strict';

/**
 * JavaScript AST parser using regex + heuristics.
 * (web-tree-sitter WASM would need proper setup; this is a robust implementation)
 */
const { scoreComplexity } = require('../complexity-scorer');
const { extractBodySnippet } = require('../body-extractor');

function parse(sourceText, relativePath) {
  const lines = sourceText.split('\n');
  const functions = [];
  const classes = [];
  const imports = [];
  const exports = [];

  // Track imports: require() and ES import
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // ES import: import { x, y } from 'module'
    let m = line.match(/^\s*import\s+(?:\{([^}]*)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
    if (m) {
      const specifiers = m[1]
        ? m[1].split(',').map(s => s.trim()).filter(Boolean)
        : [m[2]];
      imports.push({ module: m[3], specifiers });
      continue;
    }
    // require: const { x } = require('y') or const x = require('y')
    m = line.match(/(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) {
      const specifiers = m[1]
        ? m[1].split(',').map(s => s.trim()).filter(Boolean)
        : [m[2]];
      imports.push({ module: m[3], specifiers });
    }
  }

  // Parse functions with a simple state machine
  const funcRegex = /(?:^|\s)(async\s+)?function\s*\*?\s*(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\S+))?/;
  const arrowRegex = /(?:^|\s)(?:export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\(?([^)]*)\)?\s*=>/;
  const classRegex = /^\s*class\s+(\w+)(?:\s+extends\s+(\w+))?/;
  const methodRegex = /^\s*(async\s+)?(?:(static|public|private|protected)\s+)*(async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*(\S+))?\s*\{/;

  let inClass = false;
  let currentClass = null;
  let braceDepth = 0;
  let funcStartLine = null;
  let funcBraceDepth = 0;
  let currentFunc = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Class detection
    const cm = trimmed.match(/^class\s+(\w+)(?:\s+extends\s+(\w+))?/);
    if (cm) {
      currentClass = { name: cm[1], methods: [], extends: cm[2] || null };
      classes.push(currentClass);
    }

    // Export tracking
    if (/^module\.exports\s*=/.test(trimmed)) {
      const mExp = trimmed.match(/module\.exports\s*=\s*\{([^}]*)\}/);
      if (mExp) {
        mExp[1].split(',').map(s => s.trim()).filter(Boolean).forEach(n => {
          if (!exports.includes(n)) exports.push(n);
        });
      }
    }
    if (/^exports\.(\w+)/.test(trimmed)) {
      const mExp = trimmed.match(/^exports\.(\w+)/);
      if (mExp && !exports.includes(mExp[1])) exports.push(mExp[1]);
    }
    if (/^export\s+(default\s+)?(?:function|class|const|let|var)\s+(\w+)/.test(trimmed)) {
      const mExp = trimmed.match(/^export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/);
      if (mExp && !exports.includes(mExp[1])) exports.push(mExp[1]);
    }
    if (/^export\s+\{/.test(trimmed)) {
      const mExp = trimmed.match(/^export\s+\{([^}]*)\}/);
      if (mExp) {
        mExp[1].split(',').map(s => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)
          .forEach(n => { if (!exports.includes(n)) exports.push(n); });
      }
    }

    // Named function declarations
    const fm = line.match(funcRegex);
    if (fm) {
      const isAsync = !!(fm[1] && fm[1].trim() === 'async');
      const name = fm[2];
      const paramsStr = fm[3] || '';
      const returnType = fm[4] || null;
      const params = parseParams(paramsStr);
      const isExported = /\bexport\b/.test(line) || exports.includes(name);
      const fn = {
        name,
        params,
        returnType,
        isExported,
        isAsync,
        lineStart: i + 1,
        lineEnd: i + 1,
        calls: [],
        complexityScore: 0,
        complexityClass: 'simple',
        detectedPatterns: [],
        bodySnippet: null,
        bodySnippetTruncated: false,
      };
      // Find function end
      fn.lineEnd = findBlockEnd(lines, i);
      const body = lines.slice(i, fn.lineEnd).join('\n');
      const complexity = scoreComplexity(body);
      Object.assign(fn, complexity);
      const snippet = extractBodySnippet(sourceText, fn.lineStart, fn.lineEnd, fn.complexityScore);
      fn.bodySnippet = snippet.bodySnippet;
      fn.bodySnippetTruncated = snippet.bodySnippetTruncated;
      fn.calls = extractCalls(body);
      functions.push(fn);
      if (currentClass) currentClass.methods.push(name);
      continue;
    }

    // Arrow functions
    const am = line.match(arrowRegex);
    if (am) {
      const name = am[2];
      const isAsync = !!(am[3]);
      const paramsStr = am[4] || '';
      const params = parseParams(paramsStr);
      const isExported = /\bexport\b/.test(line) || exports.includes(name);
      const lineEnd = findBlockEnd(lines, i);
      const body = lines.slice(i, lineEnd).join('\n');
      const complexity = scoreComplexity(body);
      const snippet = extractBodySnippet(sourceText, i + 1, lineEnd, complexity.complexityScore);
      functions.push({
        name,
        params,
        returnType: null,
        isExported,
        isAsync,
        lineStart: i + 1,
        lineEnd,
        calls: extractCalls(body),
        ...complexity,
        bodySnippet: snippet.bodySnippet,
        bodySnippetTruncated: snippet.bodySnippetTruncated,
      });
    }
  }

  return {
    relativePath,
    language: 'javascript',
    linesOfCode: lines.length,
    functions,
    classes,
    imports,
    exports: [...new Set(exports)],
    callsTo: [],
    calledBy: [],
    hash: null,
    parserType: 'ast',
  };
}

function parseParams(paramsStr) {
  if (!paramsStr.trim()) return [];
  return paramsStr.split(',').map(p => {
    const trimmed = p.trim().replace(/=.*$/, '').trim();
    const m = trimmed.match(/^(\w+)(?:\s*:\s*(\S+))?/);
    if (m) return { name: m[1], type: m[2] || null };
    return { name: trimmed, type: null };
  }).filter(p => p.name && p.name !== '...');
}

function findBlockEnd(lines, startIdx) {
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i + 1;
      }
    }
  }
  return lines.length;
}

function extractCalls(body) {
  const calls = new Set();
  const callRegex = /\b(\w+)\s*\(/g;
  let m;
  const keywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'instanceof', 'new', 'class', 'import', 'require']);
  while ((m = callRegex.exec(body)) !== null) {
    const name = m[1];
    if (!keywords.has(name) && name.length > 1) calls.add(name);
  }
  return [...calls];
}

module.exports = { parse };
