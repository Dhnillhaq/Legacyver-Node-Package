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

  const providerRaw = await ask(rl, `LLM provider [groq/openrouter/gemini/kimi/ollama] (default: groq): `);
  const providerChoice = providerRaw.trim() || 'groq';
  const isOllama = providerChoice === 'ollama';
  const isGroq = providerChoice === 'groq';
  const isGemini = providerChoice === 'gemini';
  const isKimi = providerChoice === 'kimi';

  const defaultModel = isOllama
    ? 'llama3.2'
    : isGroq
      ? 'openai/gpt-oss-120b'
      : isGemini
        ? 'gemini-2.0-flash'
        : isKimi
          ? 'moonshot-v1-8k'
          : 'meta-llama/llama-3.1-8b-instruct'; // default: openrouter

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

  // If user left key blank, show how to set env var (cross-platform)
  if (!isOllama && !apiKey.trim()) {
    const isWin = process.platform === 'win32';
    const envVarMap = {
      groq:       { varName: 'GROQ_API_KEY',       url: 'https://console.groq.com/keys' },
      openrouter: { varName: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/keys' },
      gemini:     { varName: 'GEMINI_API_KEY',      url: 'https://aistudio.google.com/apikey' },
      kimi:       { varName: 'MOONSHOT_API_KEY',    url: 'https://platform.moonshot.cn/console/api-keys' },
    };
    const envInfo = envVarMap[providerChoice] || envVarMap['openrouter'];

    console.log('');
    if (isGroq) {
      console.log(pc.dim('i  No key entered — using built-in Groq key (openai/gpt-oss-120b).'));
      console.log(pc.dim('   For higher rate limits, set your own key:'));
    } else {
      console.log(pc.yellow(`!  No API key saved. Set ${envInfo.varName} before running analyze.`));
      console.log(pc.dim(`   Get a key: ${envInfo.url}`));
    }
    console.log('');
    if (isWin) {
      console.log(pc.dim(`   PowerShell:  $env:${envInfo.varName} = "your_key"`));
      console.log(pc.dim(`   CMD:         set ${envInfo.varName}=your_key`));
    } else {
      console.log(pc.dim(`   Mac/Linux:   export ${envInfo.varName}=your_key`));
    }
    console.log(pc.dim('   Or re-run:   legacyver init  (enter the key when prompted)'));
  }

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

