'use strict';

const pc = require('picocolors');
const logger = require('../../utils/logger');

const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b',                        context: '128k', isDefault: true },
  { id: 'llama-3.3-70b-versatile',                    context: '128k', isDefault: false },
  { id: 'llama-3.1-8b-instant',                       context: '128k', isDefault: false },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct',  context: '128k', isDefault: false },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', context: '128k', isDefault: false },
  { id: 'gemma2-9b-it',                               context: '8k',   isDefault: false },
];

module.exports = async function providersCommand() {
  const { loadConfig, loadSession } = require('../../utils/config');
  const config = loadConfig({});

  // ─── Legacyver Account ────────────────────────────────────────────────────
  const session = loadSession();
  console.log(pc.bold('\nLegacyver Account'));
  if (session.token) {
    console.log(`  ${pc.green('Logged in')} as ${session.username} (${session.email})`);
    console.log('  Generated docs will sync to the cloud after each analyze run.');
  } else {
    console.log(`  ${pc.yellow('Not logged in')} — run ${pc.cyan('legacyver login')} to enable cloud sync`);
  }
  console.log('');

  console.log(pc.bold('Legacyver — Supported LLM Providers\n'));

  console.log(pc.bold('Groq') + pc.green(' [DEFAULT]') + '  (https://groq.com)');
  console.log('  Fastest free LLM inference. 30 req/min, 14,400 req/day.');
  console.log('  Default model: ' + pc.cyan('openai/gpt-oss-120b') + ' — override with your own GROQ_API_KEY for higher limits.');
  console.log('  Status: ' + (process.env.GROQ_API_KEY ? pc.green('Own API key detected ✓') : pc.dim('Using built-in shared key (set GROQ_API_KEY for higher rate limits)')));
  console.log('  Get a free key at: https://console.groq.com/keys');
  console.log('');
  console.log(pc.bold('Google Gemini') + '  (https://ai.google.dev)');
  console.log('  Free tier: 15 req/min, 1,500 req/day. Set GEMINI_API_KEY env variable.');
  console.log('  Status: ' + (process.env.GEMINI_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('  Get a free key at: https://aistudio.google.com/apikey');
  console.log('');
  console.log(pc.bold('Kimi (Moonshot AI)') + '  (https://platform.moonshot.cn)');
  console.log('  Free credits on sign-up. Models: moonshot-v1-8k/32k/128k. Set MOONSHOT_API_KEY env variable.');
  console.log('  Status: ' + (process.env.MOONSHOT_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('  Get a key at: https://platform.moonshot.cn/console/api-keys');
  console.log('');
  console.log(pc.bold('OpenRouter') + '  (https://openrouter.ai)');
  console.log('  Unified gateway to 200+ models (Claude, GPT-4o, Llama, etc). Set OPENROUTER_API_KEY env variable.');
  console.log('  Status: ' + (process.env.OPENROUTER_API_KEY ? pc.green('API key detected') : pc.yellow('No API key found')));
  console.log('  Get a key at: https://openrouter.ai/keys');
  console.log('');
  console.log(pc.bold('Ollama') + '  (https://ollama.ai)');
  console.log('  Local offline LLM. No API key required. Run `ollama serve` first.');
  console.log('');

  console.log(pc.bold('Available Groq Models (free, no key required):'));
  console.log('');
  const header = `  ${'Model ID'.padEnd(52)} ${'Context'.padEnd(8)}`;
  console.log(pc.dim(header));
  console.log(pc.dim('  ' + '-'.repeat(62)));

  for (const m of GROQ_MODELS) {
    const defaultBadge = m.isDefault ? pc.green(' [DEFAULT]') : '';
    const selected = m.id === config.model ? pc.cyan(' ◀ selected') : '';
    console.log(`  ${m.id.padEnd(52)} ${m.context.padEnd(8)}${defaultBadge}${selected}`);
  }

  console.log('');
  console.log(pc.dim('Full Groq model list: https://console.groq.com/docs/models'));
  console.log(pc.dim('For premium models (Claude, GPT-4o, etc.) use --provider openrouter'));
  console.log('');
};
