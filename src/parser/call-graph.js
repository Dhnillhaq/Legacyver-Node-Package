'use strict';

/**
 * Build cross-file call graph by resolving import paths.
 */
function buildCallGraph(allFacts) {
  const fileMap = new Map();
  for (const facts of allFacts) {
    fileMap.set(facts.relativePath, facts);
  }

  for (const facts of allFacts) {
    facts.callsTo = [];
    facts.calledBy = [];
  }

  for (const facts of allFacts) {
    for (const imp of (facts.imports || [])) {
      const resolved = resolveImport(imp.module, facts.relativePath, fileMap);
      if (resolved && !facts.callsTo.includes(resolved)) {
        facts.callsTo.push(resolved);
        const target = fileMap.get(resolved);
        if (target && !target.calledBy.includes(facts.relativePath)) {
          target.calledBy.push(facts.relativePath);
        }
      }
    }

    // Laravel: resolve controller references from route laravelContext
    if (facts.laravelContext && facts.laravelContext.type === 'route_file') {
      for (const route of (facts.laravelContext.routes || [])) {
        if (route.controller) {
          // Try to find a matching controller file
          for (const [relPath] of fileMap) {
            if (relPath.includes(route.controller)) {
              if (!facts.callsTo.includes(relPath)) facts.callsTo.push(relPath);
              const target = fileMap.get(relPath);
              if (target && !target.calledBy.includes(facts.relativePath)) {
                target.calledBy.push(facts.relativePath);
              }
            }
          }
        }
      }
    }
  }

  return allFacts;
}

function resolveImport(modulePath, fromPath, fileMap) {
  if (!modulePath.startsWith('.')) return null;

  const fromDir = fromPath.includes('/') ? fromPath.split('/').slice(0, -1).join('/') : '';
  const candidates = [
    `${fromDir}/${modulePath}`,
    `${fromDir}/${modulePath}.js`,
    `${fromDir}/${modulePath}.ts`,
    `${fromDir}/${modulePath}/index.js`,
    `${fromDir}/${modulePath}/index.ts`,
  ].map(p => p.replace(/^\//, '').replace(/\/\//g, '/'));

  for (const candidate of candidates) {
    if (fileMap.has(candidate)) return candidate;
  }
  return null;
}

module.exports = { buildCallGraph };
