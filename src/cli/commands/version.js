'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

module.exports = function versionCommand() {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8'));
  console.log(pkg.version);
};
