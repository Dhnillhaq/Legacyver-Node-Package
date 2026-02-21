'use strict';

/**
 * Assemble all FileFacts into a Project Knowledge Graph (PKG).
 */
function buildPKG(allFacts, meta) {
  const files = {};
  const graph = {};
  const entryPoints = [];

  for (const facts of allFacts) {
    files[facts.relativePath] = facts;
    graph[facts.relativePath] = facts.callsTo || [];
    if (!facts.calledBy || facts.calledBy.length === 0) {
      entryPoints.push(facts.relativePath);
    }
  }

  // Laravel meta aggregation
  let laravelMeta = null;
  if (meta && meta.framework === 'laravel') {
    const routeMap = [];
    const relationships = [];
    const providerBindings = [];
    const modelNames = [];

    for (const facts of allFacts) {
      if (facts.laravelContext) {
        const ctx = facts.laravelContext;
        if (ctx.type === 'route_file' && ctx.routes) {
          routeMap.push(...ctx.routes);
        }
        if (ctx.type === 'model') {
          if (facts.classes && facts.classes.length > 0) modelNames.push(facts.classes[0].name);
          if (ctx.relationships) relationships.push(...ctx.relationships.map(r => ({ ...r, fromModel: facts.classes && facts.classes[0] ? facts.classes[0].name : facts.relativePath })));
        }
        if (ctx.type === 'provider' && ctx.registerBindings) {
          providerBindings.push({ provider: facts.relativePath, bindings: ctx.registerBindings });
        }
      }
    }

    laravelMeta = { routeMap, relationships, providerBindings, modelNames };
  }

  return {
    meta: {
      ...meta,
      totalFiles: allFacts.length,
    },
    files,
    entryPoints,
    graph,
    laravelMeta,
  };
}

module.exports = { buildPKG };
