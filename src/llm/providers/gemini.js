'use strict';

const { NoApiKeyError } = require('../../utils/errors');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';

class GeminiProvider {
  constructor(config) {
    this.apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
    if (!this.apiKey) throw new NoApiKeyError('gemini');
    this.model = config.model || DEFAULT_MODEL;
    this.name = 'gemini';
    this.isFreeModel = true;
  }

  async complete(chunk) {
    const url = `${GEMINI_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: chunk.systemPrompt + '\n\n' + chunk.userMessage },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    };

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`Could not connect to Gemini API: ${e.message}`);
    }

    if (response.status === 429) {
      const body = await response.text();
      const { RateLimitError } = require('../../utils/errors');
      const headerVal = parseInt(response.headers.get('retry-after') || '0');
      const retryAfter = Math.max(headerVal * 1000, 15000);
      const err = new RateLimitError('gemini', retryAfter);
      // Include Gemini's actual error detail so user can see what's wrong
      try {
        const parsed = JSON.parse(body);
        const detail = parsed.error && parsed.error.message ? parsed.error.message : body.substring(0, 200);
        err.message = `Rate limit exceeded for provider "gemini": ${detail}`;
      } catch (_) {
        err.message = `Rate limit exceeded for provider "gemini": ${body.substring(0, 200)}`;
      }
      throw err;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text.substring(0, 500)}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text}`);
    }

    const data = await response.json();

    // Extract content from Gemini response format
    let content = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const parts = data.candidates[0].content.parts || [];
      content = parts.map((p) => p.text || '').join('');
    }

    // Extract usage metadata
    const usage = data.usageMetadata || {};
    const tokensUsed = {
      input: usage.promptTokenCount || 0,
      output: usage.candidatesTokenCount || 0,
    };

    return { content, tokensUsed };
  }

  estimateCost() { return 0; }
}

module.exports = { GeminiProvider };
