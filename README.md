# Legacyver

Auto-generate technical documentation for legacy and undocumented codebases using AST parsing + LLMs.

```bash
npx legacyver analyze ./src
```

No documentation written beforehand. No configuration required. One command.

---

## Install

```bash
npm install -g legacyver
```

Or use without installing:

```bash
npx legacyver analyze ./src
```

---

## Quick Start

**1. Initialize (saves your API key):**

```bash
legacyver init
```

**2. Analyze a codebase:**

```bash
legacyver analyze ./src
```

**3. View the output:**

```
legacyver-docs/
  index.md        ← project overview + dependency graph + route map (Laravel)
  SUMMARY.md      ← GitBook/Docusaurus compatible table of contents
  src/
    app.md
    routes/users.md
    ...
```

---

## CLI Commands

### `legacyver analyze <dir>`

Run the full documentation pipeline.

| Flag | Default | Description |
|------|---------|-------------|
| `--out <dir>` | `./legacyver-docs` | Output directory |
| `--format <fmt>` | `markdown` | Output format: `markdown`, `html`, `json` |
| `--provider <p>` | `openrouter` | LLM provider: `openrouter`, `ollama` |
| `--model <id>` | `meta-llama/llama-3.3-70b-instruct:free` | Model ID |
| `--incremental` | `false` | Skip files unchanged since last run |
| `--dry-run` | `false` | Estimate cost without calling LLM |
| `--concurrency <n>` | `3` | Max parallel LLM requests |
| `--max-file-size <kb>` | `500` | Skip files larger than this |
| `--no-confirm` | — | Skip cost confirmation prompt |
| `--verbose` | `false` | Enable debug logging |

### `legacyver init`

Interactive wizard. Detects existing `.legacyverrc` and warns before overwriting. Saves API key to OS user config.

### `legacyver providers`

List all supported providers, API key status, and per-model pricing.

### `legacyver cache clear`

Delete the `.legacyver-cache/` directory to force full re-analysis on next run.

### `legacyver --version`

Print the installed version.

---

## `.legacyverrc` Schema

Create a `.legacyverrc` (JSON or YAML) in your project root:

```json
{
  "provider": "openrouter",
  "model": "meta-llama/llama-3.3-70b-instruct:free",
  "format": "markdown",
  "out": "./legacyver-docs",
  "concurrency": 3,
  "maxFileSizeKb": 500,
  "incremental": true
}
```

All fields are optional. CLI flags override file config.

Also supported: `legacyver.config.js`, `legacyver.config.yaml`.

---

## Supported Languages

| Language | Extensions | Framework Support |
|----------|-----------|-------------------|
| JavaScript | `.js`, `.jsx`, `.mjs` | Express (auto-detected) |
| TypeScript | `.ts`, `.tsx` | — |
| Python | `.py` | — |
| Java | `.java` | — |
| Go | `.go` | — |
| PHP | `.php`, `.blade.php` | Laravel (auto-detected) |

**Laravel extras:** When an `artisan` file is detected, Legacyver automatically extracts:
- Route Map (Method, URI, Controller, Middleware, Route Name)
- Model Relationships (as Mermaid `erDiagram`)
- Service Provider Bindings

---

## Supported LLM Providers

| Provider | Env Var | Notes |
|----------|---------|-------|
| OpenRouter | `OPENROUTER_API_KEY` | Default. Free models available (`:free` suffix). Get a key at [openrouter.ai/keys](https://openrouter.ai/keys) |
| Ollama | — | Local/offline. Requires Ollama running: `ollama serve` |

**Free usage:** The default model `meta-llama/llama-3.3-70b-instruct:free` is free via OpenRouter (rate-limited). Legacyver automatically caps concurrency to 1 for free models.

---

## Ignore Files

Create a `.legacyverignore` in your project root using gitignore syntax:

```
# .legacyverignore
dist/
build/
coverage/
*.min.js
```

See `.legacyverignore.example` for a documented example.

---

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate docs
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    npx legacyver analyze ./src --no-confirm --incremental --out ./docs
```

Legacyver detects non-TTY environments and disables spinners/progress bars automatically (plain log output only).

---

## How It Works

1. **Crawl** — `fast-glob` walks the directory, respects `.legacyverignore`
2. **Parse** — Regex/heuristic AST extracts facts: function names, params, complexity scores, imports, exports, call patterns
3. **PKG** — Assembles a Project Knowledge Graph linking all facts
4. **LLM** — Sends grounded facts + raw source to LLM; system prompt enforces anti-hallucination contract
5. **Validate** — Post-generation checks: hallucination detection, completeness check (all exports documented)
6. **Render** — Writes Markdown/HTML/JSON to output directory

**Design principle:** The LLM is a _writer_, not an analyst. AST extracts facts; LLM only explains them.

---

## Contributing

```bash
git clone https://github.com/user/legacyver
npm install
npx vitest run
```

---

## License

MIT
