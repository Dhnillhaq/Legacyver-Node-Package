'use strict';

const pc = require('picocolors');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = 'info';
let isCI = !process.stdout.isTTY;

function setLevel(level) {
  if (LOG_LEVELS[level] !== undefined) currentLevel = level;
}

function setCI(val) {
  isCI = val;
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function debug(...args) {
  if (shouldLog('debug')) {
    console.debug(pc.gray('[debug]'), ...args);
  }
}

function info(...args) {
  if (shouldLog('info')) {
    console.log(pc.cyan('[info]'), ...args);
  }
}

function warn(...args) {
  if (shouldLog('warn')) {
    console.warn(pc.yellow('[warn]'), ...args);
  }
}

function error(...args) {
  if (shouldLog('error')) {
    console.error(pc.red('[error]'), ...args);
  }
}

module.exports = { debug, info, warn, error, setLevel, setCI };
