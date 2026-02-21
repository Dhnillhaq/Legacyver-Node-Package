'use strict';

const { classify } = require('./classifier');
const { extract: extractController } = require('./controller');
const { extract: extractModel } = require('./model');
const { extract: extractRoutes } = require('./routes');
const { extract: extractBlade } = require('./blade');
const { extract: extractProvider } = require('./provider');

/**
 * Enrich a FileFacts object with Laravel-specific context.
 * @param {string} sourceText
 * @param {Object} fileFacts  base FileFacts from PHP parser
 * @returns {Object} enriched FileFacts
 */
function enrich(sourceText, fileFacts) {
  const fileType = classify(fileFacts.relativePath, sourceText);

  if (fileType === 'blade') {
    const { extract } = require('./blade');
    return extract(sourceText, fileFacts.relativePath);
  }

  let laravelContext = { type: fileType };

  switch (fileType) {
    case 'controller':
      laravelContext = extractController(sourceText, fileFacts);
      break;
    case 'model':
      laravelContext = extractModel(sourceText, fileFacts);
      break;
    case 'route_file':
      laravelContext = extractRoutes(sourceText);
      break;
    case 'provider':
      laravelContext = extractProvider(sourceText, fileFacts);
      break;
    case 'middleware': {
      const handleFn = fileFacts.functions.find(f => f.name === 'handle');
      laravelContext = {
        type: 'middleware',
        handleMethod: handleFn ? { params: handleFn.params, returnType: handleFn.returnType } : null,
      };
      break;
    }
    default:
      laravelContext = { type: 'other' };
  }

  return { ...fileFacts, laravelContext };
}

module.exports = { enrich };
