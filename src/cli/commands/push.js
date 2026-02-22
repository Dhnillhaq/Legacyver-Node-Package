'use strict';

const path = require('path');
const fs = require('fs');
const pc = require('picocolors');
const { loadSession } = require('../../utils/config');
const logger = require('../../utils/logger');

/**
 * legacyver push [target]
 *
 * Manually push existing generated docs to the cloud database.
 * Reads markdown files from the output directory (default: ./legacyver-docs)
 * and pushes them as documentation pages.
 *
 * Useful when:
 * - analyze ran but DB was down at that time
 * - you want to re-push after fixing DB issues
 * - you generated docs on a machine without login and want to push from another
 */
module.exports = async function pushCommand(target, options) {
  const session = loadSession();
  if (!session.token) {
    console.log(pc.red('\n  Not logged in. Run ') + pc.cyan('legacyver login') + pc.red(' first.\n'));
    process.exitCode = 1;
    return;
  }

  const targetDir = path.resolve(target || '.');
  const outDir = path.resolve(options.out || './legacyver-docs');

  // Check if output directory exists
  if (!fs.existsSync(outDir)) {
    console.log(pc.red(`\n  Output directory not found: ${outDir}`));
    console.log(pc.dim('  Run ') + pc.cyan('legacyver analyze') + pc.dim(' first to generate docs.\n'));
    process.exitCode = 1;
    return;
  }

  // Collect all .md files from the output directory
  const fragments = [];
  collectMarkdownFiles(outDir, outDir, fragments);

  if (fragments.length === 0) {
    console.log(pc.yellow('\n  No markdown files found in ') + pc.cyan(outDir));
    console.log(pc.dim('  Run ') + pc.cyan('legacyver analyze') + pc.dim(' first to generate docs.\n'));
    return;
  }

  console.log(pc.bold('\nLegacyver Push\n'));
  console.log(pc.dim(`  Source:  ${targetDir}`));
  console.log(pc.dim(`  Docs:   ${outDir}`));
  console.log(pc.dim(`  Files:  ${fragments.length} markdown files\n`));

  // Dynamically require ora for spinner
  let spinner;
  try {
    const ora = require('ora');
    spinner = ora('Pushing docs to cloud...').start();
  } catch {
    console.log('  Pushing docs to cloud...');
    spinner = { succeed: (m) => console.log(pc.green('  ' + m)), fail: (m) => console.log(pc.red('  ' + m)) };
  }

  try {
    const { pushToDatabase } = require('../../db/index');
    const result = await pushToDatabase(fragments, targetDir);

    if (result.skipped) {
      spinner.fail('Push skipped — token may be invalid or expired. Try logging in again.');
      process.exitCode = 1;
    } else {
      spinner.succeed(`Pushed ${result.pushed} files to cloud`);
      console.log(pc.dim('\n  Docs are now visible on the web dashboard.\n'));
    }
  } catch (err) {
    spinner.fail('Push failed: ' + err.message);
    logger.error('Push error details:', err);
    process.exitCode = 1;
  }
};

/**
 * Recursively collect .md files from a directory.
 * Each file becomes a fragment with { relativePath, content }.
 */
function collectMarkdownFiles(baseDir, dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(baseDir, fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      results.push({ relativePath, content });
    }
  }
}
