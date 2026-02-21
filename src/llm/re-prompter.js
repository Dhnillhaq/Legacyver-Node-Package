'use strict';

const { SYSTEM_PROMPT } = require('./prompts');
const logger = require('../utils/logger');

/**
 * Re-prompt the LLM for missing exports.
 * @param {Object} fragment
 * @param {Object} fileFacts
 * @param {Object} provider
 * @param {Object} config
 * @returns {Promise<Object|null>} updated fragment or null
 */
async function reprompt(fragment, fileFacts, provider, config) {
  const missing = (fileFacts.exports || []).filter(sym => sym && !fragment.content.includes(sym));

  if (missing.length === 0) return null;

  const followUpMessage =
    `The following exported symbols were not documented in your previous response. ` +
    `Please document each one based only on the FileFacts provided:\n\n` +
    missing.map(s => `- ${s}`).join('\n');

  try {
    const result = await provider.complete({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: followUpMessage,
      relativePath: fragment.relativePath,
    });
    logger.info(`Re-prompted for ${fragment.relativePath}: ${missing.length} missing exports covered.`);
    return {
      ...fragment,
      content: fragment.content + '\n\n' + result.content,
    };
  } catch (e) {
    logger.warn(`Re-prompt failed for ${fragment.relativePath}: ${e.message}`);
    return null;
  }
}

module.exports = { reprompt };
