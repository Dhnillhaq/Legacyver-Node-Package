'use strict';

const path = require('path');
const { loadConfig } = require('../../utils/config');
const { createSpinner, createProgressBar, confirmPrompt, printSummary } = require('../ui');
const logger = require('../../utils/logger');
const pc = require('picocolors');

const { NoApiKeyError } = require('../../utils/errors');

module.exports = async function analyzeCommand(target, flags) {
  target = target || '.';
  // Merge CLI flags into config
  let config = loadConfig({
    provider: flags.provider,
    model: flags.model,
    format: flags.format,
    out: flags.out,
    concurrency: flags.concurrency ? parseInt(flags.concurrency) : undefined,
    dryRun: flags.dryRun,
    incremental: flags.incremental,
    confirm: flags.confirm,
    verbose: flags.verbose,
    maxFileSizeKb: flags.maxFileSize ? parseInt(flags.maxFileSize) : undefined,
  });

  if (config.verbose) logger.setLevel('debug');

  const targetDir = path.resolve(target);
  const outputDir = path.resolve(config.out);

  // ─── Stage 1: Crawler ────────────────────────────────────────────────────
  const crawlerSpinner = createSpinner('Crawling files...');
  crawlerSpinner.start();

  const { crawl } = require('../../crawler/index');
  let manifest;
  try {
    manifest = await crawl(targetDir, config);
    crawlerSpinner.succeed(`Found ${manifest.files.length} files (${manifest.skipped.length} skipped)`);
  } catch (e) {
    crawlerSpinner.fail(`Crawler failed: ${e.message}`);
    process.exit(1);
  }

  if (manifest.files.length === 0) {
    console.log(pc.yellow('No source files found. Check your target directory and .legacyverignore.'));
    process.exit(0);
  }

  // ─── Incremental cache ────────────────────────────────────────────────────
  let cacheMap = {};
  let cacheHits = [];
  let cacheMisses = manifest.files;

  if (config.incremental) {
    const cache = require('../../cache/index');
    const cacheDir = path.join(targetDir, '.legacyver-cache');
    cacheMap = cache.loadCache(cacheDir);
    const { hits, misses } = cache.getCacheHits(manifest.files, cacheMap);
    cacheHits = hits;
    cacheMisses = misses;
    logger.info(`Cache: ${hits.length} hits, ${misses.length} misses`);
  }

  const filesToAnalyze = cacheMisses;

  // ─── Stage 2: AST Parser ─────────────────────────────────────────────────
  const parseSpinner = createSpinner('Parsing AST...');
  parseSpinner.start();

  const { parseFiles } = require('../../parser/index');
  let pkg;
  try {
    pkg = await parseFiles(filesToAnalyze, manifest.meta, config);
    parseSpinner.succeed(`Parsed ${filesToAnalyze.length} files`);
  } catch (e) {
    parseSpinner.fail(`Parser failed: ${e.message}`);
    logger.error(e.stack);
    process.exit(1);
  }

  // ─── Dry run ─────────────────────────────────────────────────────────────
  if (config.dryRun) {
    const { estimateCost } = require('../../llm/cost-estimator');
    const { buildChunks } = require('../../llm/chunker');
    const chunks = buildChunks(pkg, config);
    const est = await estimateCost(chunks, config);

    console.log('');
    console.log(pc.bold('Dry Run Results:'));
    console.log(`  Files:        ${filesToAnalyze.length}`);
    console.log(`  Input tokens: ${est.totalInputTokens}`);
    if (config.model && config.model.endsWith(':free')) {
      console.log(`  Estimated cost: $0.00 (free model)`);
    } else {
      console.log(`  Estimated cost: $${est.estimatedCostUSD.toFixed(4)}`);
    }
    process.exit(0);
  }

  // ─── Free model policy ────────────────────────────────────────────────────
  const { applyFreeModelPolicy } = require('../../llm/free-model');
  config = applyFreeModelPolicy(config);

  // ─── Cost gate ────────────────────────────────────────────────────────────
  const errors = [];
  let totalTokens = 0;
  let totalCost = 0;

  if (!config.isFreeModel) {
    const { estimateCost } = require('../../llm/cost-estimator');
    const { buildChunks } = require('../../llm/chunker');
    const chunks = buildChunks(pkg, config);
    const est = await estimateCost(chunks, config);
    totalTokens = est.totalInputTokens;
    totalCost = est.estimatedCostUSD;

    if (est.estimatedCostUSD > 0.10 && config.confirm) {
      console.log(`\nEstimated cost: ${pc.yellow('$' + est.estimatedCostUSD.toFixed(4))} for ${est.totalInputTokens} tokens`);
      const ok = await confirmPrompt('Proceed with LLM analysis?');
      if (!ok) {
        console.log(pc.yellow('Aborted by user.'));
        process.exit(0);
      }
    }
  }

  // ─── Stage 3: LLM Engine ─────────────────────────────────────────────────
  const llmSpinner = createSpinner('Generating documentation...');
  llmSpinner.start();

  const progressBar = createProgressBar(filesToAnalyze.length);
  progressBar.start();

  const { buildChunks } = require('../../llm/chunker');
  const { createQueue } = require('../../llm/queue');
  const { createProvider } = require('../../llm/index');
  const { validateFragment } = require('../../llm/validator');
  const { reprompt } = require('../../llm/re-prompter');

  let provider;
  try {
    provider = createProvider(config);
  } catch (e) {
    if (e.code === 'NO_API_KEY') {
      const providerName = (config.provider || 'openrouter').toLowerCase();
      const isGroq = providerName === 'groq';
      const isGemini = providerName === 'gemini';
      const isKimi = providerName === 'kimi';
      const isOpenRouter = providerName === 'openrouter';
      const label = isKimi ? 'Kimi (Moonshot)' : isGemini ? 'Google Gemini' : isGroq ? 'Groq' : 'OpenRouter';
      console.error(pc.red(`\n  No API key found for ${label}.\n`));
      console.error('  To fix, choose one of:\n');
      if (isKimi) {
        console.error(pc.cyan('  1. Run the setup wizard:'));
        console.error('       legacyver init\n');
        console.error(pc.cyan('  2. Set an environment variable:'));
        console.error('       export MOONSHOT_API_KEY=your_key_here\n');
        console.error('  Get a key at: https://platform.moonshot.cn/console/api-keys\n');
      } else if (isGemini) {
        console.error(pc.cyan('  1. Run the setup wizard:'));
        console.error('       legacyver init\n');
        console.error(pc.cyan('  2. Set an environment variable:'));
        console.error('       export GEMINI_API_KEY=your_key_here\n');
        console.error('  Get a free key at: https://aistudio.google.com/apikey\n');
      } else if (isOpenRouter) {
        console.error(pc.cyan('  1. Run the setup wizard:'));
        console.error('       legacyver init\n');
        console.error(pc.cyan('  2. Set an environment variable:'));
        console.error('       export OPENROUTER_API_KEY=your_key_here\n');
        console.error('  Get a free OpenRouter key at: https://openrouter.ai/keys\n');
      } else {
        // Default: OpenRouter
        console.error(pc.cyan('  1. Run the setup wizard:'));
        console.error('       legacyver init\n');
        console.error(pc.cyan('  2. Set an environment variable:'));
        console.error('       export OPENROUTER_API_KEY=your_key_here\n');
        console.error('  Get a free OpenRouter key at: https://openrouter.ai/keys\n');
        console.error(pc.cyan('  3. Use Google Gemini instead (free, 15 req/min):'));
        console.error('       legacyver analyze --provider gemini\n');
        console.error(pc.cyan('  4. Use Kimi (Moonshot) instead (free credits):'));
        console.error('       legacyver analyze --provider kimi\n');
        console.error(pc.cyan('  5. Use local Ollama instead (no key needed):'));
        console.error('       legacyver analyze --provider ollama\n');
      }
      process.exit(1);
    }
    throw e;
  }
  const chunks = buildChunks(pkg, config);
  let qualityWarnings = 0;

  const docFragments = await createQueue(chunks, provider, config, {
    onProgress: () => progressBar.increment(),
    onError: (e, chunk) => errors.push(`${chunk.relativePath}: ${e.message}`),
  });

  progressBar.stop();
  llmSpinner.succeed('Documentation generated');

  // Quality validation
  for (const frag of docFragments) {
    const fileFacts = pkg.files[frag.relativePath];
    const result = validateFragment(frag, fileFacts);
    frag._qualityWarnings = result.hallucinations.concat(result.missingExports.map(s => `Missing export: ${s}`));
    qualityWarnings += frag._qualityWarnings.length;

    if (result.missingExports.length > 0) {
      const pct = result.missingExports.length / (fileFacts && fileFacts.exports ? fileFacts.exports.length : 1);
      if (pct > 0.3) {
        const improved = await reprompt(frag, fileFacts, provider, config);
        if (improved) frag.content = improved.content;
      }
    }
  }

  // Merge cached fragments
  const allFragments = [...docFragments];
  if (config.incremental && cacheHits.length > 0) {
    const fs = require('fs');
    for (const hit of cacheHits) {
      const cachedInfo = cacheMap[hit.relativePath];
      if (cachedInfo && cachedInfo.docFile) {
        try {
          const content = fs.readFileSync(cachedInfo.docFile, 'utf8');
          allFragments.push({
            ...hit,
            content
          });
        } catch (e) {
          logger.warn(`Failed to read cached file for ${hit.relativePath}`);
        }
      }
    }
  }

  // ─── Stage 4: Renderer ───────────────────────────────────────────────────
  const renderSpinner = createSpinner('Rendering output...');
  renderSpinner.start();

  const { render } = require('../../renderer/index');
  try {
    await render(allFragments, pkg, outputDir, config);
    renderSpinner.succeed(`Output written to ${outputDir}`);
  } catch (e) {
    renderSpinner.fail(`Renderer failed: ${e.message}`);
    errors.push(e.message);
  }

  // ─── Save cache ───────────────────────────────────────────────────────────
  if (config.incremental || filesToAnalyze.length > 0) {
    const cache = require('../../cache/index');
    const cacheDir = path.join(targetDir, '.legacyver-cache');
    const updatedMap = { ...cacheMap };
    for (const file of filesToAnalyze) {
      updatedMap[file.relativePath] = {
        hash: file.hash,
        docFile: path.join(outputDir, file.relativePath.replace(/\.[^.]+$/, '.md')),
        generatedAt: new Date().toISOString(),
      };
    }
    // Purge deleted
    const currentPaths = manifest.files.map(f => f.relativePath);
    cache.purgeDeleted(updatedMap, currentPaths);
    cache.saveCache(cacheDir, updatedMap);
    cache.autoAddToGitignore(targetDir);
  }

  // ─── Stage 5: Cloud sync ──────────────────────────────────────────────────
  let cloudResult = { skipped: true };
  try {
    const { pushToDatabase } = require('../../db/index');
    const syncSpinner = createSpinner('Syncing docs to cloud...');

    // Only show spinner if user is logged in
    const { loadSession } = require('../../utils/config');
    const session = loadSession();
    if (session.token) {
      syncSpinner.start();
    }

    cloudResult = await pushToDatabase(allFragments, targetDir);

    if (!cloudResult.skipped) {
      syncSpinner.succeed(`Docs synced to cloud (${cloudResult.pushed} files)`);
    } else if (session.token) {
      syncSpinner.stop(); // Stops spinner gracefully if skipped without error
    }
  } catch (syncErr) {
    if (typeof syncSpinner !== 'undefined') syncSpinner.fail('Cloud sync failed');
    logger.warn('Cloud sync failed: ' + syncErr.message);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  const stats = {
    filesAnalyzed: filesToAnalyze.length,
    filesCached: cacheHits.length,
    filesSkipped: manifest.skipped.length,
    tokensUsed: totalTokens || undefined,
    estimatedCost: totalCost || undefined,
    qualityWarnings,
    errors,
    outputDir,
  };

  if (flags.jsonSummary) {
    console.log(JSON.stringify(stats));
  } else {
    printSummary(stats);
  }
};
