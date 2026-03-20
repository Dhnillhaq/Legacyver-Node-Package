# Design: fix-hallucination-and-openrouter-default

## Technical Approach

This change addresses four distinct issues with minimal coupling. Each fix is isolated to specific modules with no new dependencies introduced.

---

## Fix 1: Hallucination Validator Redesign

### Root Cause Analysis

```
LLM output text (prose):
  "Computes the SHA hash of the given Path using Node.js crypto..."
                    ^^^              ^^^^
                    flagged          flagged  ← FALSE POSITIVES

fileFacts.functions = [{ name: "computeHash" }]
fileFacts.exports   = ["computeHash"]
// 'SHA' and 'Path' not in knownIdentifiers → flagged as hallucination
```

### Old Logic (broken)
```js
// Regex: catches ALL words starting with capital letter (3+ chars)
const capitalizedIdentifiers = outputText.match(/\b([A-Z][a-zA-Z]{2,})\b/g) || [];
// 'SHA', 'CLI', 'LLM', 'AST', 'Analyzing', 'Output', 'Skip', 'Log'... all flagged
```

### New Logic (fixed)
```js
// Regex: only compound PascalCase (e.g. "HashBuilder", "MyClass")
// Skips: 'SHA', 'CLI', 'LLM' (pure acronyms)
// Skips: 'Compute', 'Output', 'Skip' (single capitalized word)
const capitalizedIdentifiers = outputText.match(/\b([A-Z][a-z]+(?:[A-Z][a-zA-Z0-9]*)+)\b/g) || [];
```

### StopWords Expansion

Added 3 new categories:
1. **Technical acronyms** — `SHA`, `MD`, `AES`, `CLI`, `API`, `LLM`, `AST`, `JSON`, `URL`, `JWT`, `HTTP`, `SQL`, `UUID`, etc.
2. **Common prose verbs/adjectives** — `Analyzing`, `Confirmed`, `Interactive`, `Manually`, `Asynchronously`, `Concurrent`, etc.
3. **Doc section terms** — `Docs`, `Markdown`, `Readme`, `Changelog`

The compound PascalCase regex change is the primary fix. StopWords serves as a defense-in-depth layer for edge cases like `MyClass` where the compound name itself might be a common English word.

---

## Fix 2: OpenRouter as Default Provider

### Provider Resolution Priority (unchanged, applied correctly now)

```
Priority (highest → lowest):
  1. CLI flag         --provider groq
  2. File config      .legacyverrc → provider: "groq"
  3. System default   config.js defaults → provider: "openrouter"
```

### Built-in Key Pattern (same as Groq)

```js
// openrouter.js — mirrors groq.js pattern exactly
const BUILT_IN_KEY = 'sk-or-v1-...';

constructor(config) {
  this.apiKey = process.env.OPENROUTER_API_KEY  // 1. env var
             || config.apiKey                    // 2. .legacyverrc
             || BUILT_IN_KEY;                    // 3. shared built-in
}
```

### Files Updated for Default Switch

| File | Change |
|---|---|
| `src/utils/config.js` | `defaults.provider = 'openrouter'` |
| `src/llm/index.js` | `default:` case in switch → `OpenRouterProvider` |
| `src/llm/free-model.js` | Fallback string `'groq'` → `'openrouter'` |
| `src/cli/commands/init.js` | Prompt reordered; empty input → `'openrouter'` |
| `src/cli/commands/providers.js` | `[DEFAULT]` badge moved to OpenRouter section |
| `src/cli/commands/analyze.js` | `else` branch (no-API-key error) now points to OpenRouter |

---

## Fix 3: CLI Flag Default Override Bug

### Root Cause

Commander.js injects default values into `flags.*` even when user provides no flag:

```js
// bin/legacyver.js (before fix)
.option('--provider <provider>', '...', 'openrouter')  // ← default injected

// analyze.js
loadConfig({ provider: flags.provider })  // flags.provider ALWAYS 'openrouter'
                                          // even if user typed nothing
```

`loadConfig()` has correct strip logic:
```js
const cleanCli = Object.fromEntries(
  Object.entries(cliFlags).filter(([, v]) => v !== undefined)
);
```

But Commander's defaults are never `undefined` — they are always strings — so the strip never fires for those options.

### Fix: Remove Commander Defaults

```js
// bin/legacyver.js (after fix)
.option('--provider <provider>', 'LLM provider (default: openrouter)') // no 3rd arg
.option('--format <fmt>',        'Output format (default: markdown)')
.option('--out <dir>',           'Output directory (default: ./legacyver-docs)')
.option('--concurrency <n>',     'Concurrent requests (default: 3)')
.option('--max-file-size <kb>',  'Skip files larger than N KB (default: 500)')
```

Now when user types nothing → `flags.provider = undefined` → stripped by cleanCli → `.legacyverrc` value used → system default in `config.js` as last resort.

### Config Priority After Fix (correct)

```
legacyver analyze --provider groq   →  flags.provider = 'groq'      ✅ CLI wins
legacyver analyze (after init)      →  flags.provider = undefined   ✅ .legacyverrc wins
legacyver analyze (no init, no rc)  →  flags.provider = undefined   ✅ config.js default wins
```

---

## Fix 4: dotenv Removal

### What was happening

```js
// bin/legacyver.js
require('dotenv').config();
// → prints on every command: "[dotenv@17.3.1] injecting env (1) from .env"
```

The `.env` file approach did not achieve the intended UX (users still needed shell-level env vars `$env:VAR = "..."` on Windows). dotenv provided zero benefit and added console noise on every command invocation.

### Changes
- Remove `require('dotenv').config()` from `bin/legacyver.js`
- Remove `"dotenv"` from `package.json` dependencies
- Run `npm uninstall dotenv`
- `.env.example` file kept for documentation purposes (env vars still work via shell)

---

## Module Impact Summary

```
src/llm/validator.js          ← Fix 1: regex + stopWords
src/llm/providers/openrouter.js ← Fix 2: BUILT_IN_KEY + DEFAULT_MODEL
src/utils/config.js           ← Fix 2: default provider
src/llm/index.js              ← Fix 2: factory default case
src/llm/free-model.js         ← Fix 2: fallback string
src/cli/commands/init.js      ← Fix 2: wizard prompt order + default
src/cli/commands/providers.js ← Fix 2: [DEFAULT] badge
src/cli/commands/analyze.js   ← Fix 2: error messages + Fix 3: flag fallback string
bin/legacyver.js              ← Fix 3: remove Commander defaults + Fix 4: remove dotenv
package.json                  ← Fix 4: remove dotenv dependency
```

No new files created. No new dependencies added.
