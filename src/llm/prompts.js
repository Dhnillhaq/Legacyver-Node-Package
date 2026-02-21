'use strict';

const SYSTEM_PROMPT = `You are a technical documentation writer. Given a file's structure and source code, write accurate Markdown documentation based ONLY on what is present.

Rules:
- Do NOT infer behavior not shown in the code
- Do NOT fabricate descriptions
- For complex functions, explain the logic from the bodySnippet
- For functions with detectedPatterns, describe what each pattern does

Output format:
## Overview
[1-2 sentences]

## Functions
[### per function: description, params table, return value]

## Dependencies
[Bullet list of imports]

## Usage Example
[Only if a clear pattern is visible in the code]`;

/**
 * Strip null/undefined values and empty arrays from an object (shallow).
 */
function stripEmpty(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    result[k] = v;
  }
  return result;
}

/**
 * Build a slim version of FileFacts for the prompt — remove noise, keep signal.
 */
function slimFacts(fileFacts) {
  const slim = {
    file: fileFacts.relativePath,
    lang: fileFacts.language,
    lines: fileFacts.linesOfCode,
  };

  // Functions — only include useful fields
  if (fileFacts.functions && fileFacts.functions.length > 0) {
    slim.functions = fileFacts.functions.map(fn => {
      const entry = { name: fn.name };
      if (fn.params && fn.params.length > 0) {
        entry.params = fn.params.map(p => p.type ? `${p.name}:${p.type}` : p.name);
      }
      if (fn.returnType) entry.returns = fn.returnType;
      if (fn.isExported) entry.exported = true;
      if (fn.isAsync) entry.async = true;
      if (fn.complexityClass && fn.complexityClass !== 'simple') {
        entry.complexity = fn.complexityClass;
      }
      if (fn.detectedPatterns && fn.detectedPatterns.length > 0) {
        entry.patterns = fn.detectedPatterns;
      }
      if (fn.bodySnippet) entry.body = fn.bodySnippet;
      if (fn.calls && fn.calls.length > 0) entry.calls = fn.calls;
      return entry;
    });
  }

  // Classes
  if (fileFacts.classes && fileFacts.classes.length > 0) {
    slim.classes = fileFacts.classes.map(c => {
      const entry = { name: c.name };
      if (c.superClass) entry.extends = c.superClass;
      if (c.methods && c.methods.length > 0) entry.methods = c.methods.map(m => m.name || m);
      return entry;
    });
  }

  // Imports — compact
  if (fileFacts.imports && fileFacts.imports.length > 0) {
    slim.imports = fileFacts.imports.map(i => {
      if (i.specifiers && i.specifiers.length > 0) {
        return `${i.module}: ${i.specifiers.join(', ')}`;
      }
      return i.module;
    });
  }

  // Exports
  if (fileFacts.exports && fileFacts.exports.length > 0) {
    slim.exports = fileFacts.exports;
  }

  return slim;
}

/**
 * Build the user message for a single file.
 * @param {Object} fileFacts
 * @param {string} rawSource
 * @returns {string}
 */
function buildUserMessage(fileFacts, rawSource) {
  const slim = slimFacts(fileFacts);

  // Truncate source to ~150 lines to keep prompt small
  const lines = rawSource.split('\n');
  let source = rawSource;
  if (lines.length > 150) {
    source = lines.slice(0, 150).join('\n') + '\n// ... truncated';
  }

  return `STRUCTURE:
${JSON.stringify(slim)}

CODE:
${source}

Generate documentation following the system instructions.`;
}

module.exports = { SYSTEM_PROMPT, buildUserMessage };
