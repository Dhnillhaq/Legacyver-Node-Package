'use strict';

const { scoreComplexity } = require('../complexity-scorer');
const { extractBodySnippet } = require('../body-extractor');

function parse(sourceText, relativePath) {
  const lines = sourceText.split('\n');
  const functions = [];
  const classes = [];
  const imports = [];
  const exports = [];

  // Namespace detection
  let namespace = null;
  const nsMatch = sourceText.match(/^namespace\s+([\w\\]+)\s*;/m);
  if (nsMatch) namespace = nsMatch[1];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Use statements
    let m = trimmed.match(/^use\s+([\w\\]+)(?:\s+as\s+\w+)?;/);
    if (m) { imports.push({ module: m[1], specifiers: [] }); continue; }

    // Class definition
    m = trimmed.match(/^(?:abstract\s+|final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s\\]+))?/);
    if (m) {
      const cls = { name: m[1], methods: [], extends: m[2] || null, implements: m[3] ? m[3].split(',').map(s => s.trim()) : [] };
      classes.push(cls);
      continue;
    }

    // Interface
    m = trimmed.match(/^interface\s+(\w+)/);
    if (m) {
      classes.push({ name: m[1], methods: [], extends: null, isInterface: true });
      continue;
    }

    // Methods
    m = trimmed.match(/^(?:(public|protected|private)\s+)?(?:(static)\s+)?(?:(abstract|final)\s+)?(?:(async)\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*\??([\w\\|]+))?/);
    if (m) {
      const visibility = m[1] || 'public';
      const isStatic = !!m[2];
      const name = m[5];
      const paramsStr = m[6] || '';
      const returnType = m[7] || null;
      const params = parsePhpParams(paramsStr);
      const lineEnd = findBlockEnd(lines, i);
      const body = lines.slice(i, lineEnd).join('\n');
      const complexity = scoreComplexity(body);
      const snippet = extractBodySnippet(sourceText, i + 1, lineEnd, complexity.complexityScore);
      const fn = {
        name,
        params,
        returnType,
        isExported: visibility === 'public',
        isStatic,
        isAsync: !!m[4],
        visibility,
        lineStart: i + 1,
        lineEnd,
        calls: extractCalls(body),
        ...complexity,
        bodySnippet: snippet.bodySnippet,
        bodySnippetTruncated: snippet.bodySnippetTruncated,
      };
      functions.push(fn);
      if (classes.length > 0) classes[classes.length - 1].methods.push(name);
    }
  }

  const publicFns = functions.filter(f => f.isExported).map(f => f.name);

  return {
    relativePath,
    language: 'php',
    linesOfCode: lines.length,
    namespace,
    functions,
    classes,
    imports,
    exports: publicFns,
    callsTo: [],
    calledBy: [],
    hash: null,
    parserType: 'ast',
    laravelContext: null,
  };
}

function parsePhpParams(paramsStr) {
  if (!paramsStr.trim()) return [];
  return paramsStr.split(',').map(p => {
    const trimmed = p.trim();
    // Type hint + variable: e.g. "Request $request" or "?string $name = null"
    const m = trimmed.match(/^(?:\?)?([\w\\|]+)\s+\$(\w+)/) || trimmed.match(/^\$(\w+)/);
    if (!m) return { name: trimmed, type: null };
    if (m[2]) return { name: '$' + m[2], type: m[1] };
    return { name: '$' + m[1], type: null };
  }).filter(p => p.name);
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
  const keywords = new Set(['if', 'foreach', 'for', 'while', 'switch', 'catch', 'function', 'return', 'throw', 'new', 'echo', 'print', 'empty', 'isset', 'unset', 'list', 'array', 'class', 'interface', 'abstract', 'static', 'public', 'private', 'protected', 'namespace', 'use', 'require', 'include', 'elseif', 'else', 'try', 'finally', 'match', 'fn']);
  for (const match of body.matchAll(/\b(\w+)\s*\(/g)) {
    const name = match[1];
    if (!keywords.has(name) && name.length > 1) calls.add(name);
  }
  return [...calls];
}

module.exports = { parse };
