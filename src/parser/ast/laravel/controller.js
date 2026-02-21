'use strict';

/**
 * Extract Laravel Controller specifics from FileFacts.
 */
function extract(sourceText, fileFacts) {
  const laravelContext = { type: 'controller', routeActions: [], injectedServices: [], formRequests: [] };

  // Constructor injection: detect typehinted params
  const ctorMatch = sourceText.match(/public\s+function\s+__construct\s*\(([^)]*)\)/);
  if (ctorMatch) {
    const params = ctorMatch[1].split(',');
    for (const p of params) {
      const m = p.trim().match(/^([\w\\]+)\s+\$(\w+)/);
      if (m) laravelContext.injectedServices.push({ type: m[1], name: '$' + m[2] });
    }
  }

  // Route action methods (public non-constructor methods)
  for (const fn of fileFacts.functions) {
    if (fn.isExported && fn.name !== '__construct') {
      laravelContext.routeActions.push(fn.name);
    }
    // Form Request detection in params
    for (const p of fn.params) {
      if (p.type && /Request$/.test(p.type) && p.type !== 'Request') {
        laravelContext.formRequests.push({ method: fn.name, requestClass: p.type });
      }
    }
  }

  return laravelContext;
}

module.exports = { extract };
