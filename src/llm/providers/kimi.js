'use strict';

const { NoApiKeyError } = require('../../utils/errors');

const KIMI_BASE = 'https://api.moonshot.cn/v1';
const DEFAULT_MODEL = 'moonshot-v1-8k';

class KimiProvider {
  constructor(config) {
    this.apiKey = process.env.MOONSHOT_API_KEY || config.kimiApiKey;
    if (!this.apiKey) throw new NoApiKeyError('kimi');
    this.model = config.model || DEFAULT_MODEL;
    this.name = 'kimi';
    this.isFreeModel = true; // Kimi free credits on sign-up
  }

  async complete(chunk) {
    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: chunk.systemPrompt },
        { role: 'user', content: chunk.userMessage },
      ],
      temperature: 0.3,
    };

    let response;
    try {
      response = await fetch(`${KIMI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`Could not connect to Kimi (Moonshot) API: ${e.message}`);
    }

    if (response.status === 429) {
      const { RateLimitError } = require('../../utils/errors');
      const headerVal = parseInt(response.headers.get('retry-after') || '0');
      // Kimi rate limits are moderate; 10s minimum wait
      const retryAfter = Math.max(headerVal * 1000, 10000);
      const err = new RateLimitError('kimi', retryAfter);
      try {
        const text = await response.text();
        const parsed = JSON.parse(text);
        const detail = parsed.error && parsed.error.message ? parsed.error.message : text.substring(0, 200);
        err.message = `Rate limit exceeded for provider "kimi": ${detail}`;
      } catch (_) {
        // keep default message
      }
      throw err;
    }

    if (response.status === 401) {
      const text = await response.text();
      throw new Error(
        `Kimi API authentication failed (401). Check your MOONSHOT_API_KEY.\n` +
        `Get a key at: https://platform.moonshot.cn/console/api-keys\n` +
        `Detail: ${text.substring(0, 300)}`
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kimi API error ${response.status}: ${text.substring(0, 500)}`);
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

module.exports = { KimiProvider };
