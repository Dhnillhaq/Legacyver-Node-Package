# Delta for Core Pipeline

## ADDED Requirements

### Requirement: CLI Entry Point
The system SHALL expose a globally-installable CLI command `legacyver` via npm.

**Scenarios:**

**Scenario 1: Basic analyze command**
- Given a developer has run `npm install -g legacyver`
- And they are in a directory containing source code
- When they run `legacyver analyze ./src`
- Then the tool SHALL crawl all source files in `./src`
- And produce documentation in `./legacyver-docs/` by default
- And display a progress bar during analysis
- And print a summary (files analyzed, tokens used, estimated cost) on completion

**Scenario 2: Dry run without LLM**
- Given a developer wants to preview cost before committing
- When they run `legacyver analyze ./src --dry-run`
- Then the tool SHALL run the Crawler and AST Parser stages
- And display estimated token count and cost per supported provider
- And NOT make any LLM API calls
- And NOT write any output files

**Scenario 3: Incremental re-analysis**
- Given a project was previously analyzed
- And some files have changed since the last run
- When the developer runs `legacyver analyze ./src --incremental`
- Then the tool SHALL only re-analyze files whose SHA-256 hash has changed
- And reuse cached documentation for unchanged files
- And update the cache with new hashes for re-analyzed files

**Scenario 4: Cost confirmation gate**
- Given an analysis would cost more than $0.10 in LLM API calls
- When the tool reaches the LLM Engine stage
- Then it SHALL display the estimated cost and prompt for confirmation
- And abort cleanly if the user declines
- And proceed if the user confirms or if `--no-confirm` flag is set

---

### Requirement: File Crawler
The system SHALL discover and filter all relevant source files in a target directory.

**Scenarios:**

**Scenario 1: Language detection**
- Given a directory containing mixed file types
- When the Crawler runs
- Then it SHALL detect the primary language by file count heuristic
- And include files matching detected language extensions
- And skip `node_modules`, `.git`, `dist`, `build`, `vendor`, `coverage`, `__pycache__`, `storage`, `bootstrap/cache`

**Scenario 1b: Laravel project detection**
- Given a directory containing a `artisan` file and an `app/` directory
- When the Crawler runs
- Then it SHALL detect the project as a Laravel application
- And set `framework: "laravel"` in the project metadata
- And include `.blade.php` files in addition to standard `.php` files
- And apply Laravel-specific directory structure awareness: `app/Http/Controllers/`, `app/Models/`, `app/Http/Middleware/`, `app/Providers/`, `routes/`, `resources/views/`
- And skip `storage/`, `bootstrap/cache/`, `vendor/` directories by default

**Scenario 2: Custom ignore rules**
- Given a `.legacyverignore` file exists in the project root
- When the Crawler runs
- Then it SHALL respect all patterns in `.legacyverignore` using gitignore syntax
- And skip files matching those patterns

**Scenario 3: Large file skipping**
- Given a source file is larger than 500KB
- When the Crawler encounters it
- Then it SHALL skip the file with a warning in the console
- And include it in the summary as "skipped (too large)"
- And continue analysis of remaining files

---

### Requirement: AST Parser (Anti-Hallucination Layer)
The system SHALL extract structural facts AND semantic context from source files using Tree-sitter AST parsing before any LLM interaction. Structural facts cover signatures and relationships; semantic context covers logic complexity, detected patterns, and function body snippets for non-trivial functions.

**Scenarios:**

**Scenario 1: JavaScript/TypeScript fact extraction**
- Given a JavaScript or TypeScript source file
- When the Parser processes it
- Then it SHALL extract: all function names, parameter names and types (if annotated), return type annotations, all import/require statements with module names, all export statements, class names and their method lists, and cross-file call references
- And for each function it SHALL compute a `complexityScore` (see Scenario 4)
- And for each function whose `complexityScore` exceeds the threshold it SHALL extract a `bodySnippet` (see Scenario 5)
- And produce a `FileFacts` JSON object per file
- And NOT send any raw source code to the LLM without first producing `FileFacts`

**Scenario 1b: PHP/Laravel fact extraction**
- Given a PHP source file in a Laravel project
- When the Parser processes it
- Then it SHALL extract: all class names with their namespace, all public/protected/private method names with parameters and return type hints, all `use` import statements, class inheritance (`extends`) and interface implementation (`implements`), all attributes/annotations (e.g. `#[Route]`)
- And if the file is a Laravel **Controller**, it SHALL additionally extract: the route action methods, injected service/repository classes from constructor, and Form Request class references in method signatures
- And if the file is a Laravel **Model**, it SHALL additionally extract: the `$table` property, `$fillable` and `$guarded` arrays, all defined Eloquent relationship methods (`hasOne`, `hasMany`, `belongsTo`, `belongsToMany`, `morphTo`, etc.) with the related model name
- And if the file is a **Route file** (`routes/web.php`, `routes/api.php`, or any file under `routes/`), it SHALL additionally extract: all route definitions including HTTP method, URI pattern, controller/closure reference, middleware, and route name
- And if the file is a **Middleware**, it SHALL extract the `handle` method signature and any dependencies
- And if the file is a **Service Provider**, it SHALL extract all bindings registered in `register()` and all bootstrapping done in `boot()`
- And for each method it SHALL compute a `complexityScore` and extract `bodySnippet` when above threshold
- And produce a `FileFacts` JSON object per file with a `laravelContext` field when applicable
- And NOT send any raw source code to the LLM without first producing `FileFacts`

**Scenario 1c: Blade template fact extraction**
- Given a `.blade.php` file in a Laravel project
- When the Parser processes it
- Then it SHALL extract: all `@extends`, `@section`, `@yield`, `@include`, `@component` directives, all `@foreach`, `@forelse`, `@if` block structures (as control flow summary), and all `{{ $variable }}` / `{!! $raw !!}` output expressions
- And identify all referenced sub-views and components
- And produce a partial `FileFacts` with `fileType: "blade"` and `laravelContext.directives[]`

**Scenario 2: Unsupported language fallback**
- Given a source file in a language without a Tree-sitter grammar configured
- When the Parser encounters it
- Then it SHALL fall back to the generic regex parser
- And log a warning: "No AST parser for [lang], using generic fallback"
- And still produce a partial `FileFacts` object with what was extractable

**Scenario 3: Project Knowledge Graph assembly**
- Given all files have been parsed
- When the PKG builder runs
- Then it SHALL produce a single `pkg.json` structure
- And include a dependency graph (`calledBy` and `callsTo` per file)
- And identify entry points (files with empty `calledBy` array)
- And include project metadata (name, primary language, total files, analyzed timestamp)

**Scenario 4: Function complexity scoring**
- Given a function or method node extracted from the AST
- When the complexity scorer runs
- Then it SHALL compute a `complexityScore` integer for each function as the sum of: number of binary/ternary operators (`+`, `-`, `*`, `/`, `%`, `**`, `??`), number of conditional branches (`if`, `else if`, `switch case`, `? :`), number of loop constructs (`for`, `foreach`, `while`, `do while`), nesting depth beyond level 1 (each additional nesting level adds 1), and number of detected domain patterns (each pattern adds 2, see Scenario 5b)
- And attach `complexityScore` to each function entry in `FileFacts.functions[]`
- And a score of 0–3 SHALL be classified as `"simple"`, 4–8 as `"moderate"`, and 9+ as `"complex"`

**Scenario 5: Body snippet extraction for non-trivial functions**
- Given a function with `complexityScore >= 4` (moderate or complex)
- When the body extractor runs
- Then it SHALL extract the raw source text of that function's body from the AST node's start and end position
- And attach it as `bodySnippet: string` on the function entry in `FileFacts.functions[]`
- And if the body exceeds 60 lines, it SHALL truncate to the first 60 lines and append a `bodySnippetTruncated: true` flag
- And functions with `complexityScore <= 3` (simple) SHALL have `bodySnippet: null` to save tokens

**Scenario 5b: Domain pattern detection**
- Given a function body is being scored
- When the pattern detector runs
- Then it SHALL scan the body AST nodes for the following domain-specific patterns and attach matching pattern names to `detectedPatterns[]` on the function entry:
  - `"arithmetic"` — presence of `*`, `/`, `%`, `**`, or `Math.*` calls
  - `"mqtt"` — calls to `.publish()`, `.subscribe()`, `.connect()` on any object, or string literals matching `mqtts?://`
  - `"http_call"` — calls to `fetch`, `axios`, `http.get`, `curl`, `Guzzle`, or similar HTTP client patterns
  - `"database_query"` — calls to `query()`, `->where()`, `->select()`, `DB::`, `PDO`, `mongoose`, `prisma`
  - `"event_emit"` — calls to `.emit()`, `.dispatch()`, `event()`, `Event::dispatch()`
  - `"caching"` — calls to `cache()`, `Cache::`, `Redis::`, `.set()` / `.get()` on cache-like objects
  - `"queue_job"` — calls to `dispatch()`, `Queue::push()`, `->delay()`, `.queue()`

**Scenario 5c: FileFacts schema with semantic context**
- Given all parsing stages have completed for a file
- When the final `FileFacts` object is assembled
- Then each entry in `functions[]` SHALL conform to the following schema:
```json
{
  "name": "calculatePrice",
  "params": [{"name": "qty", "type": "int"}, {"name": "basePrice", "type": "float"}],
  "returnType": "float",
  "isExported": true,
  "isAsync": false,
  "lineStart": 14,
  "lineEnd": 38,
  "calls": ["round"],
  "complexityScore": 7,
  "complexityClass": "moderate",
  "detectedPatterns": ["arithmetic"],
  "bodySnippet": "{\n    $discount = $qty > 100 ? 0.15 : ($qty > 50 ? 0.10 : 0);\n    ...\n}",
  "bodySnippetTruncated": false
}
```

---

### Requirement: LLM Engine
The system SHALL generate human-readable documentation from AST facts using an LLM via OpenRouter, with strict anti-hallucination controls and quality assurance mechanisms regardless of model tier.

**Scenarios:**

**Scenario 1: Grounded prompt construction**
- Given a `FileFacts` object and the raw source of that file
- When the LLM Engine prepares a request
- Then the system prompt SHALL instruct the LLM to describe ONLY what is present in the code
- And the user message SHALL include the structured `FileFacts` JSON before the raw source
- And for each function with `complexityClass: "moderate"` or `"complex"`, the prompt SHALL include the `bodySnippet` and instruct the LLM to explain the logic in plain language (e.g. "This function applies a tiered discount of 15% above qty 100, 10% above qty 50, then adds tax and rounds to 2 decimal places")
- And for each function with `detectedPatterns[]` non-empty, the prompt SHALL instruct the LLM to explicitly describe what that pattern does in context (e.g. "publishes to MQTT topic X", "queries the orders table filtered by status")
- And the temperature SHALL be set to 0.1 for factual output
- And the LLM SHALL NOT be asked to infer behavior not shown in the code or `bodySnippet`
- And the system prompt SHALL include an explicit negative constraint: "Do not mention any function, class, parameter, or behavior that does not appear in the FileFacts JSON or bodySnippet above"

**Scenario 2: Groq provider (default)**
- Given a user has `GROQ_API_KEY` set or `groqApiKey` in `.legacyverrc`
- When the LLM Engine initializes with no explicit `--provider` flag
- Then it SHALL send requests to `https://api.groq.com/openai/v1/chat/completions` using the OpenAI-compatible format
- And resolve the API key from environment variable `GROQ_API_KEY` or user config (`groqApiKey` field)
- And env var SHALL take priority over config file value
- And default to model `llama-3.3-70b-versatile` if none is specified
- And throw a clear error if no API key found, with instructions to obtain one from `console.groq.com/keys`
- And cap concurrency to 1 (free tier rate limit: 30 req/min)
- And use minimum 15s retry-after wait on HTTP 429

**Scenario 2b: OpenRouter provider (optional)**
- Given a user sets `--provider openrouter` flag or `provider: openrouter` in `.legacyverrc`
- When the LLM Engine initializes
- Then it SHALL send all requests to `https://openrouter.ai/api/v1/chat/completions` using the OpenAI-compatible format
- And resolve the API key from environment variable `OPENROUTER_API_KEY` or user config
- And include the `HTTP-Referer` and `X-Title` headers required by OpenRouter
- And throw a clear error if no API key is found, with instructions to obtain one from `openrouter.ai/keys`
- And the default model SHALL be `meta-llama/llama-3.3-70b-instruct:free` if none is specified

**Scenario 3: Free model detection and cost gate bypass**
- Given the configured provider is Groq, Gemini, Kimi, or Ollama (all inherently free-tier)
- Or given the configured OpenRouter model ID ends with the suffix `:free`
- When the cost estimator runs before LLM processing
- Then the system SHALL skip the cost calculation entirely
- And SHALL skip the $0.10 confirmation gate
- And SHALL display a provider-specific notice (e.g. "Using Groq — free tier. Rate limit: 30 req/min, 14,400 req/day")
- And Groq and Kimi SHALL cap concurrency to 1, Gemini to 2
- And the `--dry-run` flag SHALL still run AST parsing and display token counts, but note that cost is $0.00

**Scenario 4: Output quality validation (hallucination check)**
- Given the LLM returns a documentation fragment for a file
- When the validator runs post-generation
- Then it SHALL extract all proper nouns (capitalized identifiers) from the LLM output
- And cross-check each identifier against the `FileFacts` for that file (function names, class names, param names, import specifiers)
- And if an identifier appears in the LLM output but NOT in `FileFacts` AND NOT in the raw source, flag it as a suspected hallucination
- And log a warning: "Possible hallucination in [file]: identifier '[name]' not found in source facts"
- And append a `_qualityWarnings[]` array to the `DocFragment` for that file
- And include a summary count of quality warnings in the final CLI output

**Scenario 5: Output quality validation (completeness check)**
- Given the LLM returns a documentation fragment for a file
- When the validator runs post-generation
- Then it SHALL verify that every exported function and class in `FileFacts.exports[]` is mentioned at least once in the LLM output
- And if an exported symbol is missing from the output, log a warning: "Incomplete doc in [file]: exported symbol '[name]' not documented"
- And if more than 30% of exported symbols are missing, re-prompt the LLM once with the missing symbols explicitly listed
- And if the re-prompt also fails the completeness check, emit a final warning and proceed without blocking

**Scenario 6: Model listing**
- Given a user runs `legacyver providers`
- When the command executes
- Then it SHALL display all supported providers with API key detection status
- And for OpenRouter, display a filtered table of recommended models with cost per 1M tokens and FREE badges
- And Groq SHALL be listed first with a [DEFAULT] badge
- And indicate which provider/model is currently selected

**Scenario 7: Rate limit recovery**
- Given any LLM provider API returns HTTP 429 (Too Many Requests)
- When the queue processes a request
- Then it SHALL wait with exponential backoff (1s, 2s, 4s)
- And retry up to 3 times
- And respect the `retry-after` response header if present (using server-specified wait instead of backoff)
- And for Groq, apply a minimum 15s wait on retry regardless of header value
- And for Kimi, apply a minimum 10s wait on retry
- And continue to the next file if all retries fail
- And log the failure in the final summary

**Scenario 8: Concurrent processing**
- Given a project with 50 source files
- When the LLM Engine processes them
- Then it SHALL process up to 3 files concurrently by default for paid models (OpenRouter with non-free model)
- And default to 1 concurrent file for Groq and Kimi (rate limit protection)
- And default to 2 concurrent files for Gemini
- And default to 1 concurrent file for OpenRouter free models
- And the concurrency limit SHALL be configurable via `--concurrency` flag (1-10) for paid models
- And for rate-limited providers, `--concurrency` SHALL be capped with a warning if user sets higher

**Scenario 9: Additional provider support**
- Given a user sets `--provider gemini`, `--provider kimi`, or `--provider ollama`
- When the LLM Engine initializes
- Then for **Gemini**: it SHALL send requests to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, require `GEMINI_API_KEY`, default to `gemini-2.0-flash`, and display actual Google API error messages on 429
- Then for **Kimi**: it SHALL send requests to `https://api.moonshot.cn/v1/chat/completions` (OpenAI-compatible), require `MOONSHOT_API_KEY`, default to `moonshot-v1-8k`, and show 401 message with link to `platform.moonshot.cn/console/api-keys`
- Then for **Ollama**: it SHALL send requests to `http://localhost:11434/api/chat`, require no API key, default to `llama3.2`, and display a clear error if Ollama is not running with instructions to start it
- And all providers SHALL apply the same quality validation (hallucination + completeness checks) regardless of provider

---

### Requirement: Renderer
The system SHALL produce documentation output in at least three formats from LLM-generated markdown fragments.

**Scenarios:**

**Scenario 1: Markdown output (default)**
- Given LLM-generated fragments for all analyzed files
- When the Markdown renderer runs
- Then it SHALL produce one `.md` file per source file, mirroring the source directory structure
- And produce an `index.md` with project overview, file tree, and Mermaid dependency graph
- And produce a `SUMMARY.md` compatible with GitBook and Docusaurus
- And if the project is a Laravel application, the `index.md` SHALL additionally include: a **Route Map** table (HTTP method, URI, controller, middleware), a **Model Relationships** section with Mermaid ER diagram, and a **Service Provider Bindings** section

**Scenario 2: HTML output**
- Given `--format html` flag is set
- When the HTML renderer runs
- Then it SHALL produce a self-contained single HTML file
- And include sidebar navigation, full-text search (lunr.js), and syntax-highlighted code blocks
- And the file SHALL be openable directly in a browser without a server

**Scenario 3: JSON output**
- Given `--format json` flag is set
- When the JSON renderer runs
- Then it SHALL output the full PKG enriched with LLM-generated descriptions per file
- And the schema SHALL be documented in the README

---

### Requirement: Incremental Cache
The system SHALL maintain a cache to avoid re-analyzing unchanged files.

**Scenarios:**

**Scenario 1: Cache initialization**
- Given a project is analyzed for the first time
- When analysis completes
- Then the system SHALL create `.legacyver-cache/hashes.json`
- And write SHA-256 hashes and output file paths for every analyzed file
- And add `.legacyver-cache/` to `.gitignore` automatically if `.gitignore` exists

**Scenario 2: Cache hit**
- Given `.legacyver-cache/hashes.json` exists
- And the hash of a source file matches the cached value
- When `--incremental` is set and the Crawler encounters this file
- Then the system SHALL skip AST parsing and LLM call for this file
- And copy the cached documentation to the output directory

**Scenario 3: Deleted files**
- Given a file existed in the previous cache
- And the file no longer exists on disk
- When incremental analysis runs
- Then the system SHALL remove the corresponding entry from `hashes.json`
- And remove the corresponding output documentation file

---

### Requirement: npm Package Distribution
The system SHALL be distributable as a globally-installable npm package.

**Scenarios:**

**Scenario 1: Global install**
- Given a developer has Node.js >= 18 installed
- When they run `npm install -g legacyver`
- Then `legacyver` SHALL be available as a shell command
- And `legacyver --version` SHALL print the current semver version
- And `legacyver --help` SHALL print all commands and flags

**Scenario 2: Zero-config first run**
- Given a developer has installed legacyver and has `GROQ_API_KEY` set
- When they run `legacyver analyze ./src` with no other configuration
- Then the tool SHALL use Groq as the default provider
- And use `llama-3.3-70b-versatile` as the default model
- And output Markdown to `./legacyver-docs/`