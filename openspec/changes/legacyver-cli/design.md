# Design: legacyver-cli

## Technical Approach

Legacyver is implemented as a Node.js CLI application with four decoupled pipeline stages. Each stage produces a well-defined output that feeds the next. The core principle is: **AST extracts facts → LLM explains facts**. The LLM never operates without grounded context.

---

## System Architecture

```
User runs: legacyver analyze ./src

┌─────────────────────────────────────────────────────────────────┐
│                        CLI LAYER                                │
│  commander.js — parses flags, loads .legacyverrc, shows UI     │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │       STAGE 1: CRAWLER      │
          │  fast-glob + ignore rules   │
          │  → FileManifest[]           │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │    STAGE 2: AST PARSER      │
          │  Tree-sitter per language   │
          │  → ProjectKnowledgeGraph    │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │     STAGE 3: LLM ENGINE     │
          │  chunker → queue → adapter  │
          │  → DocFragment[]            │
          └──────────────┬──────────────┘
                         │
          ┌──────────────▼──────────────┐
          │     STAGE 4: RENDERER       │
          │  assembles final output     │
          │  → ./legacyver-docs/        │
          └─────────────────────────────┘
```

---

## Data Schemas

### FileManifest (output of Stage 1)
```json
{
  "relativePath": "src/utils/auth.js",
  "absolutePath": "/home/user/project/src/utils/auth.js",
  "language": "javascript",
  "sizeBytes": 4821,
  "hash": "sha256:abc123..."
}
```

### FileFacts (output of Stage 2 AST Parser, per file)
```json
{
  "relativePath": "src/utils/auth.js",
  "language": "javascript",
  "linesOfCode": 142,
  "functions": [
    {
      "name": "validateToken",
      "params": [{ "name": "token", "type": "string" }, { "name": "secret", "type": "string" }],
      "returnType": "boolean",
      "isExported": true,
      "isAsync": false,
      "lineStart": 14,
      "lineEnd": 38,
      "calls": ["decodeJWT", "isExpired"]
    }
  ],
  "classes": [
    {
      "name": "AuthService",
      "methods": ["login", "logout", "refreshToken"],
      "extends": null
    }
  ],
  "imports": [
    { "module": "jsonwebtoken", "specifiers": ["sign", "verify"] },
    { "module": "./db", "specifiers": ["getUserById"] }
  ],
  "exports": ["validateToken", "AuthService"],
  "callsTo": ["src/db/index.js"],
  "calledBy": ["src/middleware/auth.js", "src/routes/user.js"],
  "hash": "sha256:abc123..."
}
```

### ProjectKnowledgeGraph / PKG (output of Stage 2 full run)
```json
{
  "meta": {
    "name": "my-project",
    "primaryLanguage": "javascript",
    "totalFiles": 24,
    "analyzedAt": "2025-01-23T10:00:00Z"
  },
  "files": {
    "src/utils/auth.js": { /* FileFacts */ },
    "src/routes/user.js": { /* FileFacts */ }
  },
  "entryPoints": ["src/index.js"],
  "graph": {
    "src/utils/auth.js": ["src/db/index.js"],
    "src/routes/user.js": ["src/utils/auth.js"]
  }
}
```

---

## LLM Prompt Contract

The prompt contract is defined in `src/llm/prompts.js` and is the SINGLE SOURCE OF TRUTH. It must never be modified at call sites.

### System Prompt (sent with every request)
```
You are a technical documentation writer. You will be given:
  1. Extracted structural facts about a source file (JSON)
  2. The raw source code of that file

Your job is to write clear, accurate Markdown documentation based ONLY
on what is present in the code. Rules:
- Do NOT infer behavior not explicitly shown in the code
- Do NOT mention external systems unless they appear in imports
- Do NOT fabricate function descriptions
- If a function's purpose is unclear from its body, say so honestly

Output format (strict Markdown):
## Overview
[1-2 sentences about what this file does]

## Functions
[One ### subsection per exported function with: description, params table, return value]

## Dependencies
[Bullet list of imports with one-line description of each]

## Usage Example
[Only include if a clear usage pattern is visible in the code itself]
```

### User Message Template
```
FILE FACTS (extracted by static analysis):
[JSON.stringify(fileFacts, null, 2)]

SOURCE CODE:
[rawFileContent]

Generate documentation for this file following the system instructions.
```

---

## Module Breakdown

### `src/cli/commands/analyze.js`
Orchestrates the full pipeline. Reads flags, loads config, calls each stage in order, handles progress bar updates and error aggregation.

### `src/crawler/walk.js`
Uses `fast-glob` with `ignore` package to build `FileManifest[]`. Respects `.gitignore` and `.legacyverignore`. Skips files > `maxFileSizeKb` (default 500KB).

### `src/parser/index.js`
Language-aware dispatcher: reads file extension, selects Tree-sitter grammar or falls back to `generic.js`. Calls the appropriate parser and returns `FileFacts`.

### `src/parser/pkg-builder.js`
Aggregates all `FileFacts` into a single `PKG`. Runs `call-graph.js` to resolve cross-file `calledBy` / `callsTo` arrays by matching import paths to file paths.

### `src/llm/queue.js`
`p-limit` wrapper with configurable concurrency. Wraps each LLM call in `p-retry` with exponential backoff (base 1000ms, max 3 retries). Emits events for progress bar.

### `src/llm/chunker.js`
For each file in PKG, constructs the LLM user message: serializes `FileFacts` as JSON + raw file content. Checks that combined prompt is within provider's token limit. If not, truncates source code (never truncates `FileFacts`).

### `src/llm/providers/*.js`
Each file exports a class implementing `{ name, complete(LLMRequest), estimateCost(inputTokens, outputTokens) }`. The `complete` method normalizes provider-specific response format to `{ content: string, tokensUsed: { input, output } }`.

### `src/renderer/markdown.js`
Mirrors source directory structure in output dir. Writes one `.md` per file. Generates `index.md` using PKG metadata and Mermaid graph syntax. Generates `SUMMARY.md` in GitBook format.

### `src/cache/index.js`
On write: serializes `{ [relativePath]: { hash, docFile, generatedAt } }` to `.legacyver-cache/hashes.json`. On read: loads and returns the map. Compares hash per file to determine cache hits.

---

## Key Dependency Decisions

| Dependency | Why chosen | Alternative considered |
|---|---|---|
| `web-tree-sitter` | WASM-based, no native compilation, 40+ languages | `@typescript-eslint/parser` (TS only) |
| `fast-glob` | Fastest glob library, battle-tested | `glob` (slower) |
| `p-limit` + `p-retry` | Minimal, composable concurrency + retry | `bottleneck` (heavier) |
| `tiktoken` | Exact token counting matching OpenAI/Anthropic | Estimation (inaccurate) |
| `commander` | Most popular Node.js CLI framework, well-documented | `yargs`, `meow` |
| `cosmiconfig` | Standard config file discovery (.rc, .yaml, .js) | Manual parsing |

---

## Error Handling Strategy

All errors fall into one of three categories:

1. **Fatal** (exit code 1-3): No API key, write permission denied, invalid target path. Show clear message + how to fix. Exit immediately.
2. **Recoverable** (continue with warning): Rate limit hit, single file parse failure, LLM empty response. Log to summary, continue pipeline.
3. **Degraded** (partial output): Unsupported language (use generic parser), file too large (skip). Note in output index.

---

## CI/CD Integration

Legacyver is designed to run in CI without TTY. Detects non-interactive mode (no TTY) and:
- Disables progress bar spinners (use plain log lines instead)
- Disables cost confirmation prompt (requires `--no-confirm` flag or will abort with exit code 4)
- Outputs machine-readable JSON summary to stdout if `--json-summary` flag is set