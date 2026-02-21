'use strict';

const { existsSync, rmSync } = require('fs');
const { join } = require('path');
const pc = require('picocolors');

module.exports = async function cacheClearCommand() {
  const cacheDir = join(process.cwd(), '.legacyver-cache');
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
    console.log(pc.green('✓ Cache cleared: .legacyver-cache/'));
  } else {
    console.log(pc.yellow('No cache directory found (.legacyver-cache/).'));
  }
};
