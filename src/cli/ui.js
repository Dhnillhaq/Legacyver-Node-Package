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

  // Show login tip if user is not logged in
  const { loadSession } = require('../utils/config');
  const session = loadSession();
  if (!session.token) {
    console.log(pc.dim('─────────────────────────────────────────────────'));
    console.log(pc.cyan('  Sync docs to the cloud:'));
    console.log('');
    console.log(`  Run ${pc.bold('legacyver login')} to create an account and`);
    console.log('  auto-sync generated docs after every analyze run.');
    console.log(pc.dim('─────────────────────────────────────────────────'));
    console.log('');
  }

  // Show upgrade tip only when user is on the shared/default key (no personal env var set)
  const usingOwnKey = !!(
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.MOONSHOT_API_KEY ||
    process.env.OPENROUTER_API_KEY
  );
  if (!usingOwnKey) {
    const isWin = process.platform === 'win32';
    console.log(pc.dim('─────────────────────────────────────────────────'));
    console.log(pc.cyan('  Running on built-in Groq key') + pc.dim(' (openai/gpt-oss-120b)'));
    console.log('');
    console.log('  To get higher rate limits, set your own free Groq key:');
    console.log(pc.dim('  Get key: https://console.groq.com/keys'));
    if (isWin) {
      console.log(pc.dim('  PowerShell: $env:GROQ_API_KEY = "your_key"'));
      console.log(pc.dim('  CMD:        set GROQ_API_KEY=your_key'));
    } else {
      console.log(pc.dim('  Mac/Linux:  export GROQ_API_KEY=your_key'));
    }
    console.log(pc.dim('  Or run:  legacyver init'));
    console.log('');
    console.log(`  ${pc.bold('Want premium models?')} (Claude, GPT-4o, etc.)`);
    console.log(pc.dim('  Get key: https://openrouter.ai/keys'));
    if (isWin) {
      console.log(pc.dim('  PowerShell: $env:OPENROUTER_API_KEY = "your_key"'));
      console.log(pc.dim('  CMD:        set OPENROUTER_API_KEY=your_key'));
    } else {
      console.log(pc.dim('  Mac/Linux:  export OPENROUTER_API_KEY=your_key'));
    }
    console.log(pc.dim('  legacyver analyze --provider openrouter --model anthropic/claude-haiku-3-5'));
    console.log(pc.dim('─────────────────────────────────────────────────'));
    console.log('');
  }
}

module.exports = { createSpinner, createProgressBar, confirmPrompt, printSummary };
