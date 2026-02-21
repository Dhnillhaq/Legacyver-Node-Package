'use strict';

const { OpenRouterProvider } = require('./providers/openrouter');
const { OllamaProvider } = require('./providers/ollama');
const { GroqProvider } = require('./providers/groq');
const { GeminiProvider } = require('./providers/gemini');
const { KimiProvider } = require('./providers/kimi');

/**
 * Provider factory — returns the appropriate LLM adapter.
 * @param {Object} config
 * @returns {OpenRouterProvider|OllamaProvider|GroqProvider|GeminiProvider|KimiProvider}
 */
function createProvider(config) {
  const provider = (config.provider || 'openrouter').toLowerCase();
  switch (provider) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'groq':
      return new GroqProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'kimi':
      return new KimiProvider(config);
    case 'openrouter':
    default:
      return new OpenRouterProvider(config);
  }
}

module.exports = { createProvider };
