'use strict';

const { existsSync, writeFileSync } = require('fs');
const { join } = require('path');
const readline = require('readline');
const pc = require('picocolors');

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

module.exports = async function initCommand() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(pc.bold('\nWelcome to Legacyver setup wizard!\n'));

  const rcPath = join(process.cwd(), '.legacyverrc');
  if (existsSync(rcPath)) {
    const overwrite = await ask(rl, pc.yellow('⚠ .legacyverrc already exists. Overwrite? [y/N] '));
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('Aborted.');
      rl.close();
      return;
    }
  }

  const providerRaw = await ask(rl, `LLM provider [groq/gemini/kimi/openrouter/ollama] (default: groq): `);
  const providerChoice = providerRaw.trim() || 'groq';
  const isOllama = providerChoice === 'ollama';
  const isGroq = providerChoice === 'groq';
  const isGemini = providerChoice === 'gemini';
  const isKimi = providerChoice === 'kimi';

  const defaultModel = isOllama
    ? 'llama3.2'
    : isGroq
      ? 'llama-3.3-70b-versatile'
      : isGemini
        ? 'gemini-2.0-flash'
        : isKimi
          ? 'moonshot-v1-8k'
          : 'meta-llama/llama-3.3-70b-instruct:free';

  let apiKey = '';
  if (!isOllama) {
    const keyLabel = isKimi ? 'Kimi (Moonshot)' : isGemini ? 'Google Gemini' : isGroq ? 'Groq' : 'OpenRouter';
    const keyHint = isKimi ? 'https://platform.moonshot.cn/console/api-keys' : isGemini ? 'https://aistudio.google.com/apikey' : isGroq ? 'https://console.groq.com/keys' : 'https://openrouter.ai/keys';
    apiKey = await ask(rl, `${keyLabel} API key (leave blank to set via env var — see ${keyHint}): `);
  }

  const modelRaw = await ask(rl, `Default model (default: ${defaultModel}): `);
  const formatRaw = await ask(rl, `Default output format [markdown/html/json] (default: markdown): `);

  rl.close();

  const config = {
    provider: providerChoice,
    model: modelRaw.trim() || defaultModel,
    format: formatRaw.trim() || 'markdown',
    out: './legacyver-docs',
  };

  if (apiKey.trim()) {
    if (isKimi) {
      config.kimiApiKey = apiKey.trim();
    } else if (isGemini) {
      config.geminiApiKey = apiKey.trim();
    } else if (isGroq) {
      config.groqApiKey = apiKey.trim();
    } else {
      config.apiKey = apiKey.trim();
    }
  }

  writeFileSync(rcPath, JSON.stringify(config, null, 2), 'utf8');
  console.log(pc.green('\n✓ Created .legacyverrc'));

  const exampleCmd = isOllama
    ? 'legacyver analyze --provider ollama'
    : isGroq
      ? 'legacyver analyze --provider groq'
      : isGemini
        ? 'legacyver analyze --provider gemini'
        : isKimi
          ? 'legacyver analyze --provider kimi'
          : 'legacyver analyze';
  console.log(pc.cyan(`\nRun \`${exampleCmd}\` to generate documentation.`));
};
