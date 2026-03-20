'use strict';

const { readFileSync } = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Simple token estimator (tiktoken may have WASM issues in some envs)
let encoder = null;
function countTokens(text) {
  try {
    if (!encoder) {
      const { get_encoding } = require('tiktoken');
      encoder = get_encoding('cl100k_base');
    }
    return encoder.encode(text).length;
  } catch (e) {
    // Fallback: rough approximation (1 token ≈ 4 chars)
    return Math.ceil(text.length / 4);
  }
}

// Cached model pricing (populated lazily)
let modelPricingCache = null;
let modelPricingCachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const FALLBACK_PRICING = {
  'meta-llama/llama-3.1-8b-instruct': { input: 0.02 / 1e6, output: 0.05 / 1e6 },
  'anthropic/claude-haiku-3-5': { input: 0.8 / 1e6, output: 4.0 / 1e6 },
  'anthropic/claude-sonnet-4-5': { input: 3.0 / 1e6, output: 15.0 / 1e6 },
  'openai/gpt-4o-mini': { input: 0.15 / 1e6, output: 0.6 / 1e6 },
  'openai/gpt-4o': { input: 5.0 / 1e6, output: 15.0 / 1e6 },
  'google/gemini-flash-1.5': { input: 0.075 / 1e6, output: 0.3 / 1e6 },
};

async function fetchModelPricing() {
  if (modelPricingCache && Date.now() - modelPricingCachedAt < CACHE_TTL_MS) {
    return modelPricingCache;
  }
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/models');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const pricing = {};
    for (const m of (data.data || [])) {
      pricing[m.id] = {
        input: parseFloat(m.pricing && m.pricing.prompt) || 0,
        output: parseFloat(m.pricing && m.pricing.completion) || 0,
      };
    }
    modelPricingCache = pricing;
    modelPricingCachedAt = Date.now();
    return pricing;
  } catch (e) {
    logger.warn(`Could not fetch model pricing from OpenRouter: ${e.message}. Using fallback.`);
    return FALLBACK_PRICING;
  }
}

/**
 * Estimate cost for a list of LLM request chunks.
 * @param {Array} chunks
 * @param {Object} config
 * @returns {Promise<{totalInputTokens, totalOutputTokens, estimatedCostUSD, modelId}>}
 */
async function estimateCost(chunks, config) {
  const modelId = config.model || 'meta-llama/llama-3.1-8b-instruct';
  const pricing = await fetchModelPricing();
  const modelPricing = pricing[modelId] || { input: 0, output: 0 };

  let totalInputTokens = 0;
  for (const chunk of chunks) {
    totalInputTokens += countTokens(chunk.systemPrompt + '\n' + chunk.userMessage);
  }
  const avgOutputTokens = 400;
  const totalOutputTokens = chunks.length * avgOutputTokens;

  const estimatedCostUSD =
    totalInputTokens * modelPricing.input + totalOutputTokens * modelPricing.output;

  return { totalInputTokens, totalOutputTokens, estimatedCostUSD, modelId };
}

module.exports = { estimateCost, countTokens };
