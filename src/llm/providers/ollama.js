'use strict';

const logger = require('../../utils/logger');

const OLLAMA_BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';

class OllamaProvider {
  constructor(config) {
    this.model = config.model || DEFAULT_MODEL;
    this.name = 'ollama';
    this.isFreeModel = true;
  }

  async complete(chunk) {
    const body = {
      model: this.model,
      stream: false,
      messages: [
        { role: 'system', content: chunk.systemPrompt },
        { role: 'user', content: chunk.userMessage },
      ],
    };

    let response;
    try {
      response = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(
        `Could not connect to Ollama at ${OLLAMA_BASE}. ` +
          `Make sure Ollama is running: run \`ollama serve\` in a terminal, ` +
          `then \`ollama pull ${this.model}\` to download the model.`
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.message && data.message.content || '';
    const tokensUsed = {
      input: data.prompt_eval_count || 0,
      output: data.eval_count || 0,
    };

    return { content, tokensUsed };
  }

  estimateCost() { return 0; }
}

module.exports = { OllamaProvider };
