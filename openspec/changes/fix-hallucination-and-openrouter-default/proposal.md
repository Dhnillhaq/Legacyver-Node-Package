# Proposal: fix-hallucination-and-openrouter-default

## Why

Two quality and UX issues were discovered post-publish:

**Issue 1 — Hallucination false positives (validator.js)**
The post-generation validator was flagging nearly every documentation output as "possible hallucination" — e.g., `SHA`, `CLI`, `LLM`, `AST`, `Analyzing`, `Output`. The root cause: the regex `/\b([A-Z][a-zA-Z]{2,})\b/g` matched ALL capitalized words in the LLM's prose output, not just actual code identifiers. Technical acronyms like `SHA`, `API`, `JWT`, and common English prose words that happen to start with a capital letter were cross-referenced against the narrow set of AST-extracted names (function names, class names, import specifiers, exports) — and flagged when not found, producing dozens of false warnings per file.

This polluted the CLI summary output, undermined user trust in the tool, and created noise that buried real quality issues.

**Issue 2 — OpenRouter is a better default than Groq**
OpenRouter is the more appropriate default provider because:
- It supports 200+ models through a single unified API key, giving users immediate flexibility
- A built-in shared key can be embedded in the provider adapter (like Groq already had) so users can run `legacyver analyze` with zero setup
- The current model roster on Groq's free tier has more restrictive rate limits compared to OpenRouter's free models
- Switching to OpenRouter as default aligns the tool's positioning as a multi-model platform, not a Groq-specific tool

**Issue 3 — CLI flag defaults override .legacyverrc (config priority bug)**
Commander.js `--provider` flag had a hardcoded default of `'openrouter'` (and similar for `--format`, `--out`, `--concurrency`, `--max-file-size`). This meant that even when a user ran `legacyver init` and saved their preferred provider/model/format to `.legacyverrc`, running `legacyver analyze` without flags would still use the Commander defaults, not the saved config. The `loadConfig()` function correctly strip-merges CLI falgs (CLI wins over file config) but Commander was injecting defaults silently, so file config was never reachable.

**Issue 4 — dotenv dependency caused visible console noise**
`require('dotenv').config()` in `bin/legacyver.js` was printing `[dotenv@17.3.1] injecting env (1) from .env` on every command run. The `.env` file approach for API key injection did not work as intended (users had to use `$env:VAR = "..."` shell syntax anyway), so dotenv provided no real value and should be removed.

## What Changes

- **`src/llm/validator.js`** — Fix hallucination detection: replace broad regex with compound PascalCase-only pattern; add 60+ technical acronyms and common prose words to stopWords list
- **`src/llm/providers/openrouter.js`** — Add `BUILT_IN_KEY` fallback (same pattern as Groq); change `DEFAULT_MODEL` to `meta-llama/llama-3.1-8b-instruct`
- **`src/utils/config.js`** — Change `defaults.provider` from `'groq'` to `'openrouter'`
- **`src/llm/index.js`** — Move `openrouter` to `default:` case in provider factory switch
- **`src/llm/free-model.js`** — Update fallback from `'groq'` to `'openrouter'`; update model fallback
- **`src/cli/commands/init.js`** — Reorder provider prompt to show openrouter first; change default choice to openrouter
- **`src/cli/commands/providers.js`** — Move `[DEFAULT]` badge from Groq to OpenRouter
- **`src/cli/commands/analyze.js`** — Update default provider fallback and no-API-key error messages for OpenRouter
- **`bin/legacyver.js`** — Remove `require('dotenv').config()`; remove hardcoded Commander defaults to let `.legacyverrc` values flow through correctly
- **`package.json`** — Remove `dotenv` from dependencies

## Impact

- **Affected files**: `validator.js`, `openrouter.js`, `config.js`, `llm/index.js`, `free-model.js`, `init.js`, `providers.js`, `analyze.js`, `bin/legacyver.js`, `package.json`
- **Behavioral change**: `legacyver analyze` without flags now uses OpenRouter + built-in key (zero-setup UX)
- **Behavioral change**: `legacyver analyze` after `legacyver init` now correctly uses the provider/model saved in `.legacyverrc`
- **Breaking change**: None — Groq remains fully supported via `--provider groq` or via `.legacyverrc`
- **Users already using Groq**: Unaffected if they have `provider: "groq"` in their `.legacyverrc` or use `--provider groq`
- **dotenv removal**: No user-facing feature lost — env vars still work via shell (`$env:VAR = "..."`)
- **Rollback plan**: Semver patch release reverting provider default if OpenRouter BUILT_IN_KEY is exhausted
