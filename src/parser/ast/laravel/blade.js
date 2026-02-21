'use strict';

/**
 * Extract Blade template facts.
 */
function extract(sourceText, relativePath) {
  const directives = [];
  const includedViews = [];
  const outputExpressions = [];

  // @extends, @section, @yield, @include, @component, @foreach, @forelse, @if
  const directiveRegex = /@(extends|section|yield|include|component|foreach|forelse|if|for|while|push|stack|slot|php)\s*(?:\(([^)]*)\))?/g;
  let m;
  while ((m = directiveRegex.exec(sourceText)) !== null) {
    const dir = { name: m[1], arg: m[2] ? m[2].replace(/['"]/g, '').trim() : null };
    directives.push(dir);
    if (m[1] === 'include' || m[1] === 'component' || m[1] === 'extends') {
      if (dir.arg) includedViews.push(dir.arg);
    }
  }

  // {{ $var }} expressions
  const varRegex = /\{\{\s*([^}]+)\s*\}\}/g;
  while ((m = varRegex.exec(sourceText)) !== null) {
    outputExpressions.push(m[1].trim());
  }

  // {!! $raw !!}
  const rawRegex = /\{!!\s*([^!]+)\s*!!\}/g;
  while ((m = rawRegex.exec(sourceText)) !== null) {
    outputExpressions.push(m[1].trim() + ' (raw)');
  }

  return {
    relativePath,
    language: 'php',
    fileType: 'blade',
    linesOfCode: sourceText.split('\n').length,
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    callsTo: [],
    calledBy: [],
    hash: null,
    parserType: 'blade',
    laravelContext: {
      type: 'blade',
      directives,
      includedViews: [...new Set(includedViews)],
      outputExpressions,
    },
  };
}

module.exports = { extract };
