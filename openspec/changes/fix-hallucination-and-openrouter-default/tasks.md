# Tasks: fix-hallucination-and-openrouter-default

## Group 1: Hallucination Validator Fix

- [x] 1.1 Redesign regex in `src/llm/validator.js` — replace `/\b([A-Z][a-zA-Z]{2,})\b/g` with `/\b([A-Z][a-z]+(?:[A-Z][a-zA-Z0-9]*)+)\b/g` to match only compound PascalCase identifiers; this eliminates false positives from plain acronyms (SHA, CLI, LLM) and single capitalized prose words (Output, Skip, Log)
- [x] 1.2 Expand `stopWords` set in `src/llm/validator.js` — add category: **technical acronyms** (`SHA`, `MD`, `AES`, `RSA`, `CLI`, `API`, `LLM`, `AST`, `PKG`, `JSON`, `XML`, `CSV`, `HTML`, `CSS`, `URL`, `URI`, `UUID`, `JWT`, `ISO`, `UTC`, `ENV`, `SDK`, `SPA`, `SSR`, `CDN`, `AWS`, `GCP`, `SQL`, `ORM`, `MVC`, `HTTP`, `HTTPS`, `REST`, `RPC`, `TCP`, `UDP`, `DNS`, `SSL`, `TLS`, `CPU`, `RAM`, `GPU`, `EOF`)
- [x] 1.3 Expand `stopWords` set — add category: **common prose words that appear in doc descriptions** (`Analyzing`, `Confirmed`, `Interactive`, `Manually`, `Asynchronously`, `Concurrently`, `Automatically`, `Internally`, `Only`, `Skip`, `Output`, `Input`, `Done`, `Log`, `Path`, `Hash`, `Concurrent`, `Manage`, `Analyze`, `Compute`)
- [x] 1.4 Expand `stopWords` set — add category: **doc section terms** (`Docs`, `Markdown`, `Readme`, `Changelog`, `License`, `Contributing`)
- [x] 1.5 Reformat `stopWords` into multi-line grouped sections with comments for readability and future extensibility

## Group 2: OpenRouter as Default Provider

- [x] 2.1 Add `BUILT_IN_KEY` constant to `src/llm/providers/openrouter.js` — value is the shared OpenRouter API key; follows same pattern as `groq.js` (`BUILT_IN_KEY`); update constructor key resolution to: `process.env.OPENROUTER_API_KEY || config.apiKey || BUILT_IN_KEY`
- [x] 2.2 Update `DEFAULT_MODEL` in `src/llm/providers/openrouter.js` from `meta-llama/llama-3.3-70b-instruct:free` to `meta-llama/llama-3.1-8b-instruct`
- [x] 2.3 Update `src/utils/config.js` — change `defaults.provider` from `'groq'` to `'openrouter'`
- [x] 2.4 Update `src/llm/index.js` — move `openrouter` case to `default:` in factory switch; move `groq` to explicit named case only
- [x] 2.5 Update `src/llm/free-model.js` — change `|| 'groq'` fallback to `|| 'openrouter'`; change model fallback from `meta-llama/llama-3.3-70b-instruct:free` to `meta-llama/llama-3.1-8b-instruct`
- [x] 2.6 Update `src/cli/commands/init.js` — reorder provider list in prompt to `[openrouter/groq/gemini/kimi/ollama]`; change empty-input default from `'groq'` to `'openrouter'`; keep all other wizard logic unchanged
- [x] 2.7 Update `src/cli/commands/providers.js` — remove `[DEFAULT]` badge from Groq section; add `[DEFAULT]` badge to OpenRouter section
- [x] 2.8 Update `src/cli/commands/analyze.js` — change `|| 'groq'` fallback in provider detection to `|| 'openrouter'`; update `else` (no-API-key error) branch from Groq instructions to OpenRouter instructions (`OPENROUTER_API_KEY`, link to `openrouter.ai/keys`); fix `label` ternary to correctly show 'Groq' for groq and 'OpenRouter' as default
- [x] 2.9 Update `RECOMMENDED_MODELS` list in `src/cli/commands/providers.js` — replace `meta-llama/llama-3.3-70b-instruct:free` entry with `meta-llama/llama-3.1-8b-instruct` (context: 16k, inputCost: 0.02, outputCost: 0.05)
- [x] 2.10 Update `FALLBACK_PRICING` in `src/llm/cost-estimator.js` — replace `meta-llama/llama-3.3-70b-instruct:free` with `meta-llama/llama-3.1-8b-instruct` entry
- [x] 2.11 Update `estimateCost()` in `src/llm/cost-estimator.js` — change model default fallback from `meta-llama/llama-3.3-70b-instruct:free` to `meta-llama/llama-3.1-8b-instruct`

## Group 3: CLI Flag Default Override Fix

- [x] 3.1 Update `bin/legacyver.js` — remove hardcoded third-argument defaults from Commander options: `--provider`, `--format`, `--out`, `--concurrency`, `--max-file-size`; move default values into description strings only (e.g., `'Output directory (default: ./legacyver-docs)'`)
- [x] 3.2 Verify `src/cli/commands/analyze.js` correctly passes `undefined` for numeric options when not provided — confirm existing ternary guards (`flags.concurrency ? parseInt(...) : undefined`) are sufficient

## Group 4: dotenv Removal

- [x] 4.1 Remove `require('dotenv').config()` from `bin/legacyver.js`
- [x] 4.2 Remove `"dotenv": "^17.3.1"` from `dependencies` in `package.json`
- [x] 4.3 Run `npm uninstall dotenv` to remove from `node_modules` and update `package-lock.json`

## Group 5: Test Updates

- [x] 5.1 Update `test/chunker.test.js` — change mock model from `meta-llama/llama-3.3-70b-instruct:free` to `meta-llama/llama-3.1-8b-instruct`
- [x] 5.2 Update `test/providers.openrouter.test.js` — update model references from `:free` variant to `meta-llama/llama-3.1-8b-instruct` in `isFreeModel` detection test and cost estimation test
