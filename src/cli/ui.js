'use strict';

const ora = require('ora');
const { SingleBar, Presets } = require('cli-progress');
const readline = require('readline');
const pc = require('picocolors');

const isCI = !process.stdout.isTTY;

function createSpinner(text) {
  if (isCI) {
    console.log(`[spinner] ${text}`);
    return {
      start: (t) => t && console.log(`[spinner] ${t}`),
      succeed: (t) => console.log(`[done] ${t || text}`),
      fail: (t) => console.error(`[fail] ${t || text}`),
      warn: (t) => console.warn(`[warn] ${t || text}`),
      stop: () => {},
      text: text,
    };
  }
  return ora({ text, spinner: 'dots' });
}

function createProgressBar(total) {
  if (isCI) {
    let current = 0;
    return {
      start: () => {},
      increment: () => {
        current++;
        process.stdout.write(`Progress: ${current}/${total}\n`);
      },
      stop: () => {},
    };
  }
  const bar = new SingleBar(
    {
      format: `${pc.cyan('Analyzing')} [{bar}] {percentage}% | {value}/{total} files`,
      clearOnComplete: false,
      hideCursor: true,
    },
    Presets.shades_classic
  );
  return {
    start: () => bar.start(total, 0),
    increment: () => bar.increment(),
    stop: () => bar.stop(),
  };
}

async function confirmPrompt(message) {
  if (isCI) {
    console.error(`[confirm] ${message} — non-interactive mode, aborting. Use --no-confirm to skip.`);
    process.exit(4);
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${pc.yellow('?')} ${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

function printSummary(stats) {
  console.log('');
  console.log(pc.bold('=== Legacyver Summary ==='));
  console.log(`  Files analyzed:   ${pc.green(stats.filesAnalyzed)}`);
  console.log(`  Files cached:     ${pc.cyan(stats.filesCached || 0)}`);
  console.log(`  Files skipped:    ${pc.yellow(stats.filesSkipped || 0)}`);
  console.log(`  Tokens used:      ${stats.tokensUsed !== undefined ? stats.tokensUsed : 'n/a'}`);
  console.log(`  Estimated cost:   ${stats.estimatedCost !== undefined ? '$' + stats.estimatedCost.toFixed(4) : 'n/a'}`);
  if (stats.qualityWarnings > 0) {
    console.log(`  Quality warnings: ${pc.yellow(stats.qualityWarnings)}`);
  }
  if (stats.errors && stats.errors.length > 0) {
    console.log(`  Errors:           ${pc.red(stats.errors.length)}`);
    stats.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log(`  Output:           ${stats.outputDir}`);
  console.log('');

  // Show upgrade tip only when user is on the shared/default key (no personal env var set)
  const usingOwnKey = !!(
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.OPENROUTER_API_KEY
  );
  if (!usingOwnKey) {
    console.log(pc.dim('─────────────────────────────────────────────────'));
    console.log(pc.cyan('  Bring your own API key for better results:'));
    console.log('');
    console.log(`  ${pc.bold('Free tiers')}  — more quota, same zero cost`);
    console.log(pc.dim('  Groq:      https://console.groq.com/keys'));
    console.log(pc.dim('  Gemini:    https://aistudio.google.com/apikey'));
    console.log('');
    console.log(`  ${pc.bold('Premium')}     — smarter models (Claude, GPT-4o, etc.)`);
    console.log(pc.dim('  OpenRouter: https://openrouter.ai/keys'));
    console.log(pc.dim('  Access 200+ models, pay only for what you use.'));
    console.log('');
    console.log(pc.dim('  Run `legacyver init` to set your key, then:'));
    console.log(pc.dim('  legacyver analyze --provider openrouter --model anthropic/claude-haiku-3-5'));
    console.log(pc.dim('─────────────────────────────────────────────────'));
    console.log('');
  }
}

module.exports = { createSpinner, createProgressBar, confirmPrompt, printSummary };
