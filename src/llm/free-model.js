'use strict';

const logger = require('../utils/logger');
const pc = require('picocolors');

/**
 * Apply free model policies when model ID ends with `:free`.
 * @param {Object} config
 * @returns {Object} mutated config
 */
function applyFreeModelPolicy(config) {
  const provider = (config.provider || 'openrouter').toLowerCase();

  // Ollama, Groq, Gemini, and Kimi are always free — skip openrouter-specific logic
  if (provider === 'ollama' || provider === 'groq' || provider === 'gemini' || provider === 'kimi') {
    config.isFreeModel = true;
    config.skipCostEstimation = true;
    if (provider === 'groq') {
      console.log(pc.cyan('[info] Using Groq — free tier. Rate limit: 30 req/min, 14,400 req/day'));
      // Cap concurrency to 1 for Groq to avoid rate limits (30 req/min)
      const requested = parseInt(config.concurrency) || 1;
      if (requested > 1) {
        logger.warn(`Groq free tier: capping concurrency from ${requested} to 1.`);
        config.concurrency = 1;
      }
    }
    if (provider === 'gemini') {
      console.log(pc.cyan('[info] Using Gemini — free tier. Rate limit: 15 req/min, 1,500 req/day'));
      // Cap concurrency to 2 for Gemini (15 req/min is more generous)
      const requested = parseInt(config.concurrency) || 1;
      if (requested > 2) {
        logger.warn(`Gemini free tier: capping concurrency from ${requested} to 2.`);
        config.concurrency = 2;
      }
    }
    if (provider === 'kimi') {
      console.log(pc.cyan('[info] Using Kimi (Moonshot AI) — free credits. Rate limit: 3 req/min'));
      // Cap concurrency to 1 for Kimi (conservative rate limit)
      const requested = parseInt(config.concurrency) || 1;
      if (requested > 1) {
        logger.warn(`Kimi free tier: capping concurrency from ${requested} to 1.`);
        config.concurrency = 1;
      }
    }
    return config;
  }

  const model = config.model || 'meta-llama/llama-3.3-70b-instruct:free';
  if (!model.endsWith(':free')) {
    config.isFreeModel = false;
    return config;
  }

  config.isFreeModel = true;

  // Display notice
  console.log(pc.cyan('[info] Using free model — no cost estimate available. Rate limit: 200 req/day'));

  // Cap concurrency
  const requestedConcurrency = parseInt(config.concurrency) || 1;
  if (requestedConcurrency > 2) {
    logger.warn(`Free model: capping concurrency from ${requestedConcurrency} to 2.`);
    config.concurrency = 2;
  } else if (requestedConcurrency > 1) {
    config.concurrency = requestedConcurrency;
  } else {
    config.concurrency = 1;
  }

  // Skip cost estimation
  config.skipCostEstimation = true;

  return config;
}

module.exports = { applyFreeModelPolicy };
