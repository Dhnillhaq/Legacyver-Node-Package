'use strict';

const { NoApiKeyError, RateLimitError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct';
// Built-in shared key — lets users run legacyver out of the box without setup.
// Users can override with their own OPENROUTER_API_KEY env var for higher rate limits.
const BUILT_IN_KEY = 'sk-or-v1-YOURBUILTINKEYGOESHERE'; // --- IGNORE ---

class OpenRouterProvider {
  constructor(config) {
    this.apiKey = process.env.OPENROUTER_API_KEY || config.apiKey || BUILT_IN_KEY;
    if (!this.apiKey) {
      throw new NoApiKeyError('openrouter');
    }
    this.model = config.model || DEFAULT_MODEL;
    this.isFreeModel = this.model.endsWith(':free');
    this.name = 'openrouter';
  }

  async complete(chunk) {
    const body = {
      model: this.model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: chunk.systemPrompt },
        { role: 'user', content: chunk.userMessage },
      ],
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://github.com/user/legacyver',
        'X-Title': 'Legacyver',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '1') * 1000;
      throw new RateLimitError('openrouter', retryAfter);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
    const tokensUsed = {
      input: data.usage && data.usage.prompt_tokens || 0,
      output: data.usage && data.usage.completion_tokens || 0,
    };

    return { content, tokensUsed };
  }

  estimateCost(inputTokens, outputTokens) {
    if (this.isFreeModel) return 0;
    // Rough: use fallback rates
    return 0;
  }
}

module.exports = { OpenRouterProvider };
