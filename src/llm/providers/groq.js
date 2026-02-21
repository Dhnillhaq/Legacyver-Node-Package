'use strict';

const { NoApiKeyError } = require('../../utils/errors');

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
// Built-in shared key — lets users run legacyver out of the box without setup.
// Users can override with their own GROQ_API_KEY env var for higher rate limits.
const BUILT_IN_KEY = process.env.GROQ_API_KEY;
class GroqProvider {
  constructor(config) {
    this.apiKey = process.env.GROQ_API_KEY || config.groqApiKey || BUILT_IN_KEY;
    if (!this.apiKey) throw new NoApiKeyError('groq');
    this.model = config.model || DEFAULT_MODEL;
    this.name = 'groq';
    this.isFreeModel = true; // Groq free tier
  }

  async complete(chunk) {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: chunk.systemPrompt },
        { role: 'user', content: chunk.userMessage },
      ],
    };

    let response;
    try {
      response = await fetch(`${GROQ_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`Could not connect to Groq API: ${e.message}`);
    }

    if (response.status === 429) {
      const { RateLimitError } = require('../../utils/errors');
      const headerVal = parseInt(response.headers.get('retry-after') || '0');
      // Minimum 15s wait — Groq free tier needs breathing room
      const retryAfter = Math.max(headerVal * 1000, 15000);
      throw new RateLimitError('groq', retryAfter);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const usage = data.usage || {};
    const tokensUsed = {
      input: usage.prompt_tokens || 0,
      output: usage.completion_tokens || 0,
    };

    return { content, tokensUsed };
  }

  estimateCost() { return 0; }
}

module.exports = { GroqProvider };
