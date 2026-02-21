'use strict';

const { readFileSync } = require('fs');
const { SYSTEM_PROMPT, buildUserMessage } = require('./prompts');
const { countTokens } = require('./cost-estimator');
const logger = require('../utils/logger');

const DEFAULT_MAX_TOKENS = 120000;

/**
 * Build LLM request chunks from the PKG.
 * @param {Object} pkg
 * @param {Object} config
 * @returns {Array<{relativePath, systemPrompt, userMessage, tokenCount}>}
 */
function buildChunks(pkg, config) {
  const chunks = [];
  const maxTokens = DEFAULT_MAX_TOKENS;

  for (const [relativePath, fileFacts] of Object.entries(pkg.files || {})) {
    let rawSource = '';
    try {
      rawSource = readFileSync(fileFacts.relativePath && fileFacts.absolutePath ? fileFacts.absolutePath : (pkg.meta.targetDir + '/' + relativePath), 'utf8');
    } catch (e) {
      // file might not be available; use empty source
      rawSource = '';
    }

    let userMessage = buildUserMessage(fileFacts, rawSource);
    const combined = SYSTEM_PROMPT + '\n' + userMessage;
    let tokenCount = countTokens(combined);

    // If over limit, truncate raw source (never truncate FileFacts)
    if (tokenCount > maxTokens) {
      const factsPart = buildUserMessage(fileFacts, '');
      const factsTokens = countTokens(SYSTEM_PROMPT + '\n' + factsPart);
      const budgetChars = Math.max(0, (maxTokens - factsTokens) * 4 - 200);
      const truncatedSource = rawSource.slice(0, budgetChars) + '\n...[truncated]';
      userMessage = buildUserMessage(fileFacts, truncatedSource);
      tokenCount = countTokens(SYSTEM_PROMPT + '\n' + userMessage);
      logger.warn(`Truncated source for ${relativePath} to fit context window.`);
    }

    chunks.push({
      relativePath,
      systemPrompt: SYSTEM_PROMPT,
      userMessage,
      tokenCount,
    });
  }

  return chunks;
}

module.exports = { buildChunks };
