'use strict';

/**
 * Extract route definitions from Laravel route files.
 */
function extract(sourceText) {
  const routes = [];

  // Route::METHOD('uri', [Controller::class, 'method'])->middleware(...)->name(...)
  const routeRegex = /Route::(get|post|put|patch|delete|options|any)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:\[([^\]]+)\]|['"]([^'"]+)['"]|\$?(\w+))/gi;
  let m;
  while ((m = routeRegex.exec(sourceText)) !== null) {
    const method = m[1].toUpperCase();
    const uri = m[2];
    let controller = null;
    let action = null;

    if (m[3]) {
      // Array syntax: [Controller::class, 'method']
      const parts = m[3].split(',').map(s => s.trim().replace(/['"]/g, '').replace(/::class$/, ''));
      controller = parts[0] ? parts[0].split('\\').pop() : null;
      action = parts[1] || null;
    } else if (m[4]) {
      // String 'Controller@method'
      const parts = m[4].split('@');
      controller = parts[0] ? parts[0].split('\\').pop() : null;
      action = parts[1] || null;
    }

    // Extract middleware
    const afterRoute = sourceText.slice(m.index, m.index + 200);
    const middlewareMatch = afterRoute.match(/->middleware\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    const middleware = middlewareMatch ? middlewareMatch[1] : null;

    // Extract name
    const nameMatch = afterRoute.match(/->name\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    const name = nameMatch ? nameMatch[1] : null;

    routes.push({ method, uri, controller, action, middleware, name });
  }

  return { type: 'route_file', routes };
}

module.exports = { extract };
