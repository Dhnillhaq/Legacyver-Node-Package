'use strict';

const { mkdirSync } = require('fs');
const { RenderError } = require('../utils/errors');

/**
 * Renderer dispatcher.
 */
async function render(fragments, pkg, outputDir, config) {
  mkdirSync(outputDir, { recursive: true });

  const format = (config.format || 'markdown').toLowerCase();

  try {
    switch (format) {
      case 'html':
        await require('./html').render(fragments, pkg, outputDir, config);
        break;
      case 'json':
        await require('./json').render(fragments, pkg, outputDir, config);
        break;
      case 'markdown':
      default:
        await require('./markdown').render(fragments, pkg, outputDir, config);
        break;
    }
  } catch (e) {
    throw new RenderError(format, e);
  }
}

module.exports = { render };
