# Tasks: legacyver-cli

## Group 1: Project Scaffold

- [x] 1.1 Initialize npm package with `npm init`; set `name: "legacyver"`, `version: "1.0.0"`, `engines: { node: ">=18.0.0" }`, `license: "MIT"`
- [x] 1.2 Create `bin/legacyver.js` with `#!/usr/bin/env node` shebang and execute permission (`chmod 755`)
- [x] 1.3 Set `"bin": { "legacyver": "./bin/legacyver.js" }` in `package.json`
- [x] 1.4 Install all production dependencies: `commander`, `fast-glob`, `web-tree-sitter`, `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-python`, `tree-sitter-java`, `tree-sitter-go`, `tree-sitter-php`, `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, `groq-sdk`, `p-limit`, `p-retry`, `ora`, `chalk`, `cli-progress`, `conf`, `ignore`, `marked`, `tiktoken`, `cosmiconfig`, `picocolors`
- [x] 1.5 Install dev dependencies: `vitest`, `eslint`
- [x] 1.6 Create full directory structure: `bin/`, `src/cli/commands/`, `src/crawler/`, `src/parser/ast/`, `src/llm/providers/`, `src/renderer/`, `src/cache/`, `src/utils/`, `test/fixtures/js-express/`, `test/fixtures/python-flask/`, `test/fixtures/ts-react/`
- [x] 1.7 Create `src/utils/errors.js` with custom error classes: `LegacyverError`, `NoApiKeyError`, `RateLimitError`, `ParseError`, `RenderError`
- [x] 1.8 Create `src/utils/logger.js` — structured logger with log levels (`info`, `warn`, `error`, `debug`) and TTY detection for CI mode
- [x] 1.9 Create `src/utils/config.js` — uses `cosmiconfig` to load `.legacyverrc` / `legacyver.config.js` / `legacyver.config.yaml`; merges with CLI flags (CLI wins)

## Group 2: CLI Layer

- [x] 2.1 Create `src/cli/flags.js` — defines all shared flag definitions with types, defaults, and descriptions
- [x] 2.2 Create `src/cli/ui.js` — exports `createSpinner(text)`, `createProgressBar(total)`, `confirmPrompt(message)`, `printSummary(stats)`
- [x] 2.3 Create `src/cli/commands/version.js` — reads version from `package.json`, prints it
- [x] 2.4 Create `src/cli/commands/init.js` — interactive wizard using `conf` to save API key to OS user config; detects existing `.legacyverrc` and warns before overwriting; creates example `.legacyverrc` file
- [x] 2.5 Create `src/cli/commands/analyze.js` — main pipeline orchestrator; calls Crawler → Parser → LLM Engine → Renderer in sequence; manages progress bar; aggregates errors; prints final summary
- [x] 2.6 Wire all commands in `bin/legacyver.js` using `commander`; add `--version`, `--help`, global `--verbose` flag
- [x] 2.7 Add `providers` subcommand that lists all supported providers, API key status (detected/missing), and cost per 1000 tokens
- [x] 2.8 Add `cache clear` subcommand that deletes `.legacyver-cache/` directory

## Group 3: File Crawler

- [x] 3.1 Create `src/crawler/filters.js` — language extension map (`{ javascript: ['.js', '.jsx', '.mjs'], typescript: ['.ts', '.tsx'], python: ['.py'], java: ['.java'], go: ['.go'], php: ['.php', '.blade.php'] }`); default ignore patterns list including `vendor/`, `storage/`, `bootstrap/cache/`
- [x] 3.2 Create `src/crawler/walk.js` — uses `fast-glob` with `ignore` package; loads `.legacyverignore` if present; applies default ignores + custom ignores; returns `FileManifest[]`
- [x] 3.3 Create `src/crawler/manifest.js` — for each discovered file: compute `sizeBytes`, detect `language` from extension, compute SHA-256 `hash` using Node.js `crypto` module
- [x] 3.4 Create `src/crawler/index.js` — main export, composes `walk.js` and `manifest.js`; applies size filter (skip > `maxFileSizeKb`); logs warnings for skipped files; detects Laravel project by checking for `artisan` file in root, sets `framework: "laravel"` in manifest metadata
- [x] 3.5 Write `test/crawler.test.js` — tests for file discovery, ignore rules, language detection, size filtering using temp directories; add test for Laravel project detection with mock `artisan` file

## Group 4: AST Parser

- [x] 4.1 Create `src/parser/ast/javascript.js` — initializes `web-tree-sitter` with `tree-sitter-javascript`; extracts functions (name, params, return type from JSDoc if present), classes, imports (`require`/`import`), exports; passes each function node to `complexity-scorer.js`; returns `FileFacts`
- [x] 4.2 Create `src/parser/ast/typescript.js` — extends JS parser with TypeScript grammar; extracts type annotations from parameter declarations and return type nodes; passes function nodes to `complexity-scorer.js`
- [x] 4.3 Create `src/parser/ast/python.js` — `tree-sitter-python` grammar; extracts `def` functions (name, params, type hints), `class` definitions, `import`/`from...import` statements; passes function nodes to `complexity-scorer.js`
- [x] 4.4 Create `src/parser/ast/java.js` — `tree-sitter-java` grammar; extracts methods (name, params, return type, visibility), class hierarchy, import statements; passes method nodes to `complexity-scorer.js`
- [x] 4.5 Create `src/parser/ast/go.js` — `tree-sitter-go` grammar; extracts functions, structs, interfaces, import blocks; passes function nodes to `complexity-scorer.js`
- [x] 4.5b Create `src/parser/ast/php.js` — `tree-sitter-php` grammar; extracts class names with namespace and visibility, all methods with params/return type hints/visibility, `use` imports, `extends`/`implements`; passes method nodes to `complexity-scorer.js`; returns base `FileFacts` with `language: "php"`
- [x] 4.5c Create `src/parser/ast/laravel/classifier.js` — Laravel file type classifier (controller/model/middleware/provider/route_file/blade/other)
- [x] 4.5d Create `src/parser/ast/laravel/controller.js` — extracts constructor DI, route action methods, Form Request references
- [x] 4.5e Create `src/parser/ast/laravel/model.js` — extracts `$table`, `$fillable`, `$guarded`, Eloquent relationship methods
- [x] 4.5f Create `src/parser/ast/laravel/routes.js` — extracts all `Route::METHOD()` definitions with URI, controller, middleware, name
- [x] 4.5g Create `src/parser/ast/laravel/blade.js` — extracts Blade directives, included views, output expressions
- [x] 4.5h Create `src/parser/ast/laravel/index.js` — Laravel enrichment pipeline entrypoint
- [x] 4.5i Create `src/parser/complexity-scorer.js` — given a Tree-sitter function/method node and the raw source text, computes `complexityScore` by counting: binary/ternary operators (`+`, `-`, `*`, `/`, `%`, `**`, `??`) each +1, conditional branches (`if`, `else if`, `switch case`, `? :`) each +1, loop constructs (`for`, `foreach`, `while`, `do`) each +1, nesting depth beyond level 1 adds +1 per extra level, domain pattern matches add +2 each; classifies result as `"simple"` (0–3), `"moderate"` (4–8), or `"complex"` (9+); returns `{ complexityScore, complexityClass, detectedPatterns[] }`
- [x] 4.5j Create `src/parser/pattern-detector.js` — scans function body AST nodes and raw text for domain-specific patterns; detects: `"arithmetic"` (math operators or `Math.*`), `"mqtt"` (`.publish()`, `.subscribe()`, `.connect()`, `mqtts?://`), `"http_call"` (`fetch`, `axios`, `http.get`, `curl`, `Guzzle`), `"database_query"` (`query()`, `->where()`, `->select()`, `DB::`, `PDO`, `mongoose`, `prisma`), `"event_emit"` (`.emit()`, `.dispatch()`, `event()`, `Event::dispatch()`), `"caching"` (`cache()`, `Cache::`, `Redis::`), `"queue_job"` (`dispatch()`, `Queue::push()`, `->delay()`); returns `string[]` of matched pattern names
- [x] 4.5k Create `src/parser/body-extractor.js` — given a Tree-sitter node with `startPosition` and `endPosition`, slices the raw source text to extract the function body; if body exceeds 60 lines, truncates and sets `bodySnippetTruncated: true`; returns `{ bodySnippet: string | null, bodySnippetTruncated: boolean }`; returns `null` for functions with `complexityScore <= 3`
- [x] 4.6 Create `src/parser/ast/generic.js` — regex-based fallback; extracts function-like patterns, import-like lines; returns partial `FileFacts` with `parserType: "generic"`; no complexity scoring (sets `complexityScore: null`)
- [x] 4.7 Create `src/parser/index.js` — language-aware dispatcher; for `php` in Laravel projects calls `laravel/index.js`; all language parsers now pipe function nodes through `complexity-scorer.js` and `body-extractor.js` before returning `FileFacts`
- [x] 4.8 Create `src/parser/call-graph.js` — post-processes all `FileFacts`; resolves import paths; populates `calledBy` arrays; for Laravel resolves controller references from route definitions
- [x] 4.9 Create `src/parser/pkg-builder.js` — aggregates all `FileFacts` into PKG; for Laravel projects assembles `pkg.laravelMeta` (route map, model relationship graph, provider bindings)
- [x] 4.10 Write `test/parser.test.js` — tests for each language parser; assert function names, param counts, imports correctly extracted
- [x] 4.11 Create `test/fixtures/js-express/` — small Express REST API, intentionally undocumented
- [x] 4.12 Create `test/fixtures/python-flask/` — Flask app with blueprints, no docstrings
- [x] 4.13 Create `test/fixtures/ts-react/` — React component library with hooks, TypeScript
- [x] 4.14 Install PHP parser dependency: add `tree-sitter-php` to `package.json`
- [x] 4.15 Create `test/fixtures/laravel-api/` — realistic Laravel 10 REST API project (~15 files, zero comments): 3 Models with relationships, 3 Controllers, 2 Form Requests, 1 Middleware, 1 Service Provider, `routes/api.php`; must include at least one method with arithmetic logic, one with MQTT/HTTP call pattern, and one with database query chaining
- [x] 4.16 Write `test/parser.laravel.test.js` — tests for Laravel sub-parsers; assert route/model/controller extraction
- [x] 4.17 Write `test/complexity-scorer.test.js` — unit tests for complexity scoring: assert simple getter scores 0–3, assert tiered discount function scores 4–8, assert deeply nested algorithm scores 9+; assert `"arithmetic"` pattern detected on math-heavy function; assert `"mqtt"` pattern detected on `.publish()` call; assert `bodySnippet` is null for simple functions and non-null for moderate/complex ones

## Group 5: LLM Engine

- [x] 5.1 Create `src/llm/prompts.js` — defines and exports `SYSTEM_PROMPT` (anti-hallucination prompt contract including instruction to explain `bodySnippet` logic in plain language and describe `detectedPatterns` in context) and `buildUserMessage(fileFacts, rawSource)` which inlines `bodySnippet` per function when present; this file is the SINGLE SOURCE OF TRUTH for all LLM prompts
- [x] 5.2 Create `src/llm/cost-estimator.js` — uses `tiktoken` to count tokens in each request; calculates total cost using OpenRouter's per-model pricing fetched from `https://openrouter.ai/api/v1/models`; caches the model list locally for 1 hour; returns `{ totalInputTokens, totalOutputTokens, estimatedCostUSD, modelId }`
- [x] 5.3 Create `src/llm/chunker.js` — for each file in PKG: builds user message from `FileFacts` + raw source; checks token count vs model context limit; if over limit, truncates raw source (NEVER truncates `FileFacts`); returns `LLMRequest[]`
- [x] 5.4 Create `src/llm/queue.js` — `p-limit` wrapper with configurable concurrency; wraps each call in `p-retry` (maxRetries: 3, exponential backoff starting 1000ms); emits `progress` events for UI; catches HTTP 429 and retries; logs failures to summary array
- [x] 5.5 Create `src/llm/providers/openrouter.js` — primary LLM adapter; sends requests to `https://openrouter.ai/api/v1/chat/completions` using OpenAI-compatible payload format; resolves API key from `OPENROUTER_API_KEY` env or user config; includes required headers `HTTP-Referer: https://github.com/user/legacyver` and `X-Title: Legacyver`; default model `meta-llama/llama-3.3-70b-instruct:free`; maps response to `{ content, tokensUsed }`; throws `NoApiKeyError` with link to `openrouter.ai/keys` if key missing
- [x] 5.6 Create `src/llm/providers/ollama.js` — local offline fallback adapter; sends requests to `http://localhost:11434/api/chat` using Ollama's native format; no API key required; default model `llama3.2`; throws clear error with start instructions if Ollama is not running
- [x] 5.7 Update `src/llm/index.js` — provider factory: reads `provider` from config/flags; returns `openrouter` adapter by default; returns `ollama` adapter if `--provider ollama` is set; detects free model via `:free` suffix and sets `isFreeModel: true` flag on the adapter instance; removes all other provider references
- [x] 5.8 Create `src/llm/free-model.js` — free model policy enforcer; when `isFreeModel` is true: cap concurrency to 1 (warn if user sets higher), skip cost estimation, display rate limit notice, increase retry initial backoff to 3s; export `applyFreeModelPolicy(config)` function called by `analyze.js`
- [x] 5.9 Create `src/llm/validator.js` — post-generation quality checker with two checks: (1) **Hallucination check**: extract capitalized identifiers from LLM output text, cross-reference against `FileFacts` function names + class names + param names + import specifiers + raw source text, flag identifiers found in output but not in either source; (2) **Completeness check**: verify every symbol in `FileFacts.exports[]` appears at least once in LLM output, collect missing symbols; return `{ hallucinations: string[], missingExports: string[], passed: boolean }`
- [x] 5.10 Create `src/llm/re-prompter.js` — triggered when completeness check fails with >30% missing exports; builds a follow-up prompt listing the missing symbols explicitly: "The following exported symbols were not documented in your previous response. Please document each one based only on the FileFacts provided: [list]"; sends as a second LLM call and merges the response into the original fragment; if re-prompt also fails completeness check, emits warning and moves on
- [x] 5.11 Update `src/cli/commands/analyze.js` — after each `DocFragment` is generated: run `validator.js`; if hallucinations found, log warnings; if completeness fails >30%, call `re-prompter.js`; append `_qualityWarnings[]` to fragment; include quality warning counts in final summary printout
- [x] 5.12 Update `src/llm/providers/openrouter.js` — update `legacyver providers` command handler: fetch live model list from `https://openrouter.ai/api/v1/models`, display filtered table with FREE badge for `:free` suffix models, highlight currently selected model
- [x] 5.13 Keep only native `fetch` (Node 18+) for all HTTP calls — no SDK dependencies for any provider. All providers (Groq, Gemini, Kimi, OpenRouter, Ollama) use raw `fetch` with provider-specific payloads.
- [x] 5.14 Write `test/chunker.test.js` — tests for token counting, truncation behavior, message construction with mock `FileFacts`
- [x] 5.15 Write `test/validator.test.js` — unit tests for hallucination detection: assert known-hallucinated identifier is flagged, assert legitimate identifier from FileFacts is not flagged; unit tests for completeness check: assert missing export is detected, assert re-prompt threshold of 30% triggers correctly
- [x] 5.16 Write `test/providers.openrouter.test.js` — mock HTTP tests for OpenRouter adapter: assert correct headers are sent, assert free model detection via `:free` suffix, assert `NoApiKeyError` thrown when key missing, assert HTTP 429 triggers retry with correct backoff timing

## Group 6: Renderer

- [x] 6.1 Create `src/renderer/markdown.js` — takes `DocFragment[]` and PKG; mirrors source directory structure in output dir; writes one `.md` per file; generates `index.md` with project metadata + Mermaid dependency diagram + module index table; generates `SUMMARY.md`
- [x] 6.1b Update `src/renderer/markdown.js` — when `pkg.laravelMeta` is present, append to `index.md`: (1) **Route Map** section as a Markdown table (columns: Method, URI, Controller, Middleware, Route Name); (2) **Model Relationships** section as a Mermaid `erDiagram` block built from `pkg.laravelMeta.relationships`; (3) **Service Provider Bindings** section listing all `register()` bindings per provider
- [x] 6.2 Create `src/renderer/html.js` — converts all Markdown fragments to HTML using `marked`; injects sidebar navigation; adds lunr.js search index; outputs single `index.html` (self-contained, no server needed)
- [x] 6.3 Create `src/renderer/json.js` — outputs full PKG with `llmDescription` field added to each file entry; writes `legacyver-docs/documentation.json`
- [x] 6.4 Create `src/renderer/index.js` — dispatcher: reads `format` from config, calls correct renderer; ensures output directory exists (creates if not)

## Group 7: Incremental Cache

- [x] 7.1 Create `src/cache/hash.js` — `computeHash(filePath)` using Node.js `crypto` SHA-256; returns hex string
- [x] 7.2 Create `src/cache/index.js` — `loadCache(cacheDir)`: reads `.legacyver-cache/hashes.json`, returns map or empty object; `saveCache(cacheDir, map)`: writes updated map; `getCacheHits(manifest, cacheMap)`: returns `{ hits: FileManifest[], misses: FileManifest[] }`; `purgeDeleted(cacheMap, currentPaths)`: removes entries for files no longer on disk
- [x] 7.3 Update `src/cli/commands/analyze.js` — when `--incremental` flag is set: load cache, separate hits/misses, skip LLM for hits, only analyze misses, merge cached docs with new docs, save updated cache
- [x] 7.4 Auto-add `.legacyver-cache/` to `.gitignore` on first cache write if `.gitignore` exists in project root

## Group 8: Documentation & Polish

- [x] 8.1 Write `README.md` — sections: install, quick start, all CLI flags, `.legacyverrc` schema, supported languages, supported LLM providers, CI/CD integration, contributing
- [x] 8.2 Create `.legacyverignore.example` — documented example ignore file
- [x] 8.3 Create `LICENSE` — MIT license text
- [x] 8.4 Create `.npmignore` — excludes `test/`, `.legacyver-cache/`, `*.test.js`, `openspec/`
- [x] 8.5 Write `test/integration.test.js` — full pipeline test against `test/fixtures/js-express/` using Ollama provider (no API key needed); asserts output directory has expected files; asserts `index.md` contains correct function names from AST (not hallucinated)
- [x] 8.6 Write `test/integration.laravel.test.js` — full pipeline test against `test/fixtures/laravel-api/` using Ollama provider; asserts `index.md` contains Route Map table with correct HTTP methods and URIs; asserts Mermaid ER diagram is present and contains correct model names from relationship extraction; asserts no controller names are hallucinated

## Group 9: npm Publish

- [x] 9.1 Run `npm pack --dry-run` and verify only intended files are included
- [x] 9.2 Run `legacyver --version` and confirm correct semver output
- [x] 9.3 Run `legacyver --help` and verify all commands and flags are listed
- [x] 9.4 Run full integration test suite with `npx vitest run`
- [x] 9.5 Run `legacyver analyze test/fixtures/js-express/ --dry-run` and verify cost estimation output using OpenRouter model pricing
- [x] 9.6 Run `npm login` and `npm publish --access public`
- [x] 9.7 Verify install works: `npm install -g legacyver` in a fresh shell; run `legacyver --version`

## Group 10: Multi-Provider Hardening (post-publish)

- [x] 10.1 Add Groq provider (`src/llm/providers/groq.js`) — OpenAI-compatible endpoint at `https://api.groq.com/openai/v1`, GROQ_API_KEY env var, default model `llama-3.3-70b-versatile`, 15s minimum retry-after, concurrency capped to 1
- [x] 10.2 Add Google Gemini provider (`src/llm/providers/gemini.js`) — REST API at `https://generativelanguage.googleapis.com/v1beta`, GEMINI_API_KEY env var, default model `gemini-2.0-flash`, concurrency capped to 2, actual Google error message shown on 429
- [x] 10.3 Add Kimi (Moonshot AI) provider (`src/llm/providers/kimi.js`) — OpenAI-compatible endpoint at `https://api.moonshot.cn/v1`, MOONSHOT_API_KEY env var, default model `moonshot-v1-8k`, 10s minimum retry-after, concurrency capped to 1
- [x] 10.4 Register Groq, Gemini, Kimi in `src/llm/index.js` factory; Groq is now the default provider (replaces OpenRouter as default)
- [x] 10.5 Update `src/llm/free-model.js` — treat Groq, Gemini, Kimi, and Ollama as always-free; add provider-specific concurrency caps and info messages
- [x] 10.6 Fix API key priority — env var takes priority over `.legacyverrc` config value for ALL providers (`process.env.X || config.x`, not the other way)
- [x] 10.7 Fix `.legacyverrc` model mutation bug — shallow copy cosmiconfig result; discard file model when CLI `--provider` differs from config provider
- [x] 10.8 Update `src/cli/commands/init.js` — add Groq, Gemini, Kimi to provider wizard; Groq is now the default choice; provider-specific API key labels and hints
- [x] 10.9 Update `src/cli/commands/providers.js` — reorder to show Groq first with [DEFAULT] badge; add Gemini, Kimi, OpenRouter, Ollama sections with API key status
- [x] 10.10 Update `src/cli/commands/analyze.js` — provider-specific no-API-key error messages and fix instructions for all 5 providers; Groq is the default else branch
- [x] 10.11 Update `src/utils/config.js` — change default provider from `openrouter` to `groq`
- [x] 10.12 Slim LLM prompts by ~51% — reduce system prompt (1,264 → 558 chars), strip null/empty fields from FileFacts JSON, cap source code at 150 lines, use compact import format
- [x] 10.13 Update `queue.js` to respect `retryAfter` from `RateLimitError` — wait server-specified duration before retry
- [x] 10.14 Add `src/crawler/filters.js` ignore patterns for test/spec/openspec directories