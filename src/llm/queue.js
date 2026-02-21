'use strict';

const pLimit = require('p-limit');
const pRetry = require('p-retry');
const logger = require('../utils/logger');

/**
 * Process chunks through the LLM provider with concurrency and retry.
 * @param {Array} chunks
 * @param {Object} provider
 * @param {Object} config
 * @param {{ onProgress, onError }} callbacks
 * @returns {Promise<Array>} DocFragment[]
 */
async function createQueue(chunks, provider, config, callbacks = {}) {
  const concurrency = config.concurrency || 3;
  const limit = pLimit(concurrency);
  const fragments = [];

  const tasks = chunks.map((chunk) =>
    limit(async () => {
      try {
        const result = await pRetry(
          async () => {
            try {
              return await provider.complete(chunk);
            } catch (err) {
              // If it's a rate-limit error, wait for the retry-after period
              // before letting p-retry schedule the next attempt.
              if (err.code === 'RATE_LIMIT' && err.retryAfter) {
                await new Promise((r) => setTimeout(r, err.retryAfter));
              }
              throw err;
            }
          },
          {
            retries: 3,
            minTimeout: config.isFreeModel ? 8000 : 1000,
            factor: 3,
            onFailedAttempt: (error) => {
              logger.warn(`Retry ${error.attemptNumber}/3 for ${chunk.relativePath}: ${error.message}`);
            },
          }
        );
        fragments.push({
          relativePath: chunk.relativePath,
          content: result.content,
          tokensUsed: result.tokensUsed,
          _qualityWarnings: [],
        });
      } catch (e) {
        logger.error(`Failed to generate docs for ${chunk.relativePath}: ${e.message}`);
        if (callbacks.onError) callbacks.onError(e, chunk);
        fragments.push({
          relativePath: chunk.relativePath,
          content: `<!-- Documentation generation failed: ${e.message} -->`,
          tokensUsed: { input: 0, output: 0 },
          _qualityWarnings: [`Generation failed: ${e.message}`],
        });
      }

      if (callbacks.onProgress) callbacks.onProgress();
    })
  );

  await Promise.all(tasks);
  return fragments;
}

module.exports = { createQueue };
