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
    let m = trimmed.match(/^import\s+([\w.]+(?:\s*,\s*[\w.]+)*)/);
    if (m) { m[1].split(',').forEach(imp => imports.push({ module: imp.trim(), specifiers: [] })); continue; }
    m = trimmed.match(/^import\s+[\w.]+\.\{([^}]+)\}/);
    if (m) { imports.push({ module: trimmed.replace(/^import\s+/, '').split('.')[0], specifiers: m[1].split(',').map(s => s.trim()) }); continue; }

    // Class
    m = trimmed.match(/^(?:public\s+|private\s+|abstract\s+)*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/);
    if (m) {
      classes.push({ name: m[1], methods: [], extends: m[2] || null });
      continue;
    }

    // Methods
    m = trimmed.match(/^(?:(public|private|protected|static|final|abstract|synchronized)\s+)*(?:(\w+(?:<[^>]+>)?)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w,\s]+)?\s*\{/);
    if (m && m[3] && m[3] !== 'if' && m[3] !== 'for' && m[3] !== 'while' && m[3] !== 'switch' && m[3] !== 'catch') {
      const name = m[3];
      const visibility = m[1] || 'package';
      const returnType = m[2] || 'void';
      const paramsStr = m[4] || '';
      const params = paramsStr.split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        return { name: parts[parts.length - 1] || '', type: parts[parts.length - 2] || null };
      }).filter(p => p.name);
      const lineEnd = findBlockEnd(lines, i);
      const body = lines.slice(i, lineEnd).join('\n');
      const complexity = scoreComplexity(body);
      const snippet = extractBodySnippet(sourceText, i + 1, lineEnd, complexity.complexityScore);
      functions.push({
        name,
        params,
        returnType,
        isExported: visibility === 'public',
        isAsync: false,
        lineStart: i + 1,
        lineEnd,
        calls: extractCalls(body),
        ...complexity,
        bodySnippet: snippet.bodySnippet,
        bodySnippetTruncated: snippet.bodySnippetTruncated,
      });
      if (classes.length > 0) classes[classes.length - 1].methods.push(name);
    }
  }

  const publicFns = functions.filter(f => f.isExported).map(f => f.name);

  return {
    relativePath,
    language: 'java',
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
  const keywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'new', 'return', 'throw', 'instanceof', 'class', 'void', 'int', 'long', 'double', 'float', 'boolean', 'String', 'System', 'else', 'try', 'finally']);
  for (const match of body.matchAll(/\b(\w+)\s*\(/g)) {
    const name = match[1];
    if (!keywords.has(name) && name.length > 1) calls.add(name);
  }
  return [...calls];
}

module.exports = { parse };
