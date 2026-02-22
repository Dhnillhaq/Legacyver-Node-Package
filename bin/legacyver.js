#!/usr/bin/env node
'use strict';

require('dotenv').config();

const { program } = require('commander');
const { readFileSync } = require('fs');
const { join } = require('path');

const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
  .name('legacyver')
  .description('AI-powered CLI tool to auto-generate technical documentation from legacy/undocumented codebases')
  .version(pkg.version, '-v, --version', 'Output the current version')
  .option('--verbose', 'Enable verbose debug logging');

// analyze command
const analyzeCmd = require('../src/cli/commands/analyze');
program
  .command('analyze [target]')
  .description('Analyze a directory and generate documentation')
  .option('--out <dir>', 'Output directory', './legacyver-docs')
  .option('--format <fmt>', 'Output format: markdown | html | json', 'markdown')
  .option('--model <model>', 'LLM model to use')
  .option('--provider <provider>', 'LLM provider: groq | ollama', 'groq')
  .option('--concurrency <n>', 'Concurrent LLM requests (1-10)', '3')
  .option('--dry-run', 'Run AST parsing only, no LLM calls')
  .option('--incremental', 'Only re-analyze changed files')
  .option('--no-confirm', 'Skip cost confirmation prompt')  
  .option('--json-summary', 'Output machine-readable JSON summary')
  .option('--max-file-size <kb>', 'Skip files larger than this size in KB', '500')
  .action(analyzeCmd);

// init command
const initCmd = require('../src/cli/commands/init');
program
  .command('init')
  .description('Interactive setup wizard — saves API key and creates .legacyverrc')
  .action(initCmd);

// providers command
const providersCmd = require('../src/cli/commands/providers');
program
  .command('providers')
  .description('List supported LLM providers and available models')
  .action(providersCmd);

// cache command
const cacheCmd = require('../src/cli/commands/cache');
program
  .command('cache')
  .description('Manage the incremental analysis cache')
  .command('clear')
  .description('Delete the .legacyver-cache/ directory')
  .action(cacheCmd);

// login command
const loginCmd = require('../src/cli/commands/login');
program
  .command('login')
  .description('Log in to sync generated docs to the cloud')
  .action(loginCmd);

// logout command
const logoutCmd = require('../src/cli/commands/logout');
program
  .command('logout')
  .description('Log out and stop syncing docs to the cloud')
  .action(logoutCmd);

program.parse(process.argv);
