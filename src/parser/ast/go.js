'use strict';

const { scoreComplexity } = require('../complexity-scorer');
const { extractBodySnippet } = require('../body-extractor');

function parse(sourceText, relativePath) {
  const lines = sourceText.split('\n');
  const functions = [];
  const classes = []; // structs/interfaces in Go
  const imports = [];
  const exports = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Imports
    let m = trimmed.match(/^import\s+"([^"]+)"/);
    if (m) { imports.push({ module: m[1], specifiers: [] }); continue; }

    // Import blocks
    if (trimmed === 'import (') {
      i++;
      while (i < lines.length && lines[i].trim() !== ')') {
        const imp = lines[i].trim().replace(/['"]/g, '').split(/\s+/).pop();
        if (imp) imports.push({ module: imp, specifiers: [] });
        i++;
      }
      continue;
    }

    // Struct / Interface
    m = trimmed.match(/^type\s+(\w+)\s+(struct|interface)\s*\{/);
    if (m) {
      classes.push({ name: m[1], methods: [], extends: null });
      continue;
    }

    // Functions and methods
    m = trimmed.match(/^func\s+(?:\((\w+)\s+\*?(\w+)\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s+(?:\(([^)]*)\)|(\w+)))?\s*\{/);
    if (m) {
      const receiver = m[2] || null;
      const name = m[3];
      const paramsStr = m[4] || '';
      const params = paramsStr.split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        return { name: parts[0] || '', type: parts[1] || null };
      }).filter(p => p.name);
      const returnType = m[5] || m[6] || null;
      const isExported = /^[A-Z]/.test(name); // Go export convention
      const lineEnd = findBlockEnd(lines, i);
      const body = lines.slice(i, lineEnd).join('\n');
      const complexity = scoreComplexity(body);
      const snippet = extractBodySnippet(sourceText, i + 1, lineEnd, complexity.complexityScore);
      functions.push({
        name,
        params,
        returnType,
        isExported,
        isAsync: false,
        receiver,
        lineStart: i + 1,
        lineEnd,
        calls: extractCalls(body),
        ...complexity,
        bodySnippet: snippet.bodySnippet,
        bodySnippetTruncated: snippet.bodySnippetTruncated,
      });
      if (receiver) {
        const cls = classes.find(c => c.name === receiver);
        if (cls) cls.methods.push(name);
      }
    }
  }

  const exportedFns = functions.filter(f => f.isExported).map(f => f.name);

  return {
    relativePath,
    language: 'go',
    linesOfCode: lines.length,
    functions,
    classes,
    imports,
    exports: exportedFns,
    callsTo: [],
    calledBy: [],
    hash: null,
    parserType: 'ast',
  };
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
  const keywords = new Set(['if', 'for', 'range', 'switch', 'case', 'return', 'defer', 'go', 'select', 'func', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'make', 'new', 'len', 'cap', 'append', 'copy', 'delete', 'close', 'panic', 'recover', 'print', 'println', 'error']);
  for (const match of body.matchAll(/\b(\w+)\s*\(/g)) {
    const name = match[1];
    if (!keywords.has(name) && name.length > 1) calls.add(name);
  }
  return [...calls];
}

module.exports = { parse };
