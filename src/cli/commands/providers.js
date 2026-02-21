'use strict';

const pc = require('picocolors');
const logger = require('../../utils/logger');

const RECOMMENDED_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', context: '128k', inputCost: 0, outputCost: 0, free: true },
  { id: 'anthropic/claude-haiku-3-5', context: '200k', inputCost: 0.80, outputCost: 4.00, free: false },
  { id: 'anthropic/claude-sonnet-4-5', context: '200k', inputCost: 3.00, outputCost: 15.00, free: false },
  { id: 'openai/gpt-4o-mini', context: '128k', inputCost: 0.15, outputCost: 0.60, free: false },
  { id: 'openai/gpt-4o', context: '128k', inputCost: 5.00, outputCost: 15.00, free: false },
  { id: 'google/gemini-flash-1.5', context: '1M', inputCost: 0.075, outputCost: 0.30, free: false },
  { id: 'mistralai/mistral-7b-instruct:free', context: '32k', inputCost: 0, outputCost: 0, free: true },
];

module.exports = async function providersCommand() {
  const { loadConfig } = require('../../utils/config');
  const config = loadConfig({});

  console.log(pc.bold('\nLegacyver — Supported LLM Providers\n'));
  console.log(pc.bold('OpenRouter') + '  (https://openrouter.ai)');
  console.log('  Unified gateway to 200+ models. Set OPENROUTER_API_KEY env variable.');
  console.log('  Status: ' + (process.env.OPENROUTER_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('');
  console.log(pc.bold('Ollama') + '       (https://ollama.ai)');
  console.log('  Local offline LLM. No API key required. Run `ollama serve` first.');
  console.log('');
  console.log(pc.bold('Groq') + '         (https://groq.com)');
  console.log('  Fastest free LLM inference. Set GROQ_API_KEY env variable.');
  console.log('  Status: ' + (process.env.GROQ_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('  Get a free key at: https://console.groq.com/keys');
  console.log('');
  console.log(pc.bold('Google Gemini') + ' (https://ai.google.dev)');
  console.log('  Free tier: 15 req/min, 1,500 req/day. Set GEMINI_API_KEY env variable.');
  console.log('  Status: ' + (process.env.GEMINI_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('  Get a free key at: https://aistudio.google.com/apikey');
  console.log('');
  console.log(pc.bold('Kimi (Moonshot AI)') + ' (https://platform.moonshot.cn)');
  console.log('  Free credits on sign-up. Models: moonshot-v1-8k/32k/128k. Set MOONSHOT_API_KEY env variable.');
  console.log('  Status: ' + (process.env.MOONSHOT_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('  Get a key at: https://platform.moonshot.cn/console/api-keys');
  console.log('');

  console.log(pc.bold('Recommended Models (via OpenRouter):'));
  console.log('');
  const header = `  ${'Model ID'.padEnd(48)} ${'Context'.padEnd(8)} ${'Input $/1M'.padEnd(12)} ${'Output $/1M'.padEnd(12)}`;
  console.log(pc.dim(header));
  console.log(pc.dim('  ' + '-'.repeat(84)));

  for (const m of RECOMMENDED_MODELS) {
    const badge = m.free ? pc.green(' [FREE]') : '';
    const selected = m.id === config.model ? pc.cyan(' ◀ selected') : '';
    const inputCostStr = m.free ? 'FREE' : `$${m.inputCost.toFixed(3)}`;
    const outputCostStr = m.free ? 'FREE' : `$${m.outputCost.toFixed(3)}`;
    console.log(
      `  ${m.id.padEnd(48)} ${m.context.padEnd(8)} ${inputCostStr.padEnd(12)} ${outputCostStr.padEnd(12)}${badge}${selected}`
    );
  }

  console.log('');
  console.log(pc.dim('Fetch live model list from OpenRouter: https://openrouter.ai/api/v1/models'));
  console.log('');
};
