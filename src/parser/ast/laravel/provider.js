'use strict';

/**
 * Extract Service Provider specifics.
 */
function extract(sourceText, fileFacts) {
  const laravelContext = { type: 'provider', registerBindings: [], bootActions: [] };

  // register() method body
  const registerFn = fileFacts.functions.find(f => f.name === 'register');
  if (registerFn && registerFn.bodySnippet) {
    const bindRegex = /\$this->app->(?:bind|singleton|instance|scoped)\s*\(\s*(['"])([\w\\]+)\1/g;
    let m;
    while ((m = bindRegex.exec(registerFn.bodySnippet)) !== null) {
      laravelContext.registerBindings.push(m[2]);
    }
  }

  // boot() method body
  const bootFn = fileFacts.functions.find(f => f.name === 'boot');
  if (bootFn && bootFn.bodySnippet) {
    laravelContext.bootActions.push('boot() method present');
  }

  return laravelContext;
}

module.exports = { extract };
