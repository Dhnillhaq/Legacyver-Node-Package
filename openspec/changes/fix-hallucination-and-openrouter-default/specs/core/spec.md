# Specs: fix-hallucination-and-openrouter-default

## MODIFIED Requirements

### Hallucination Validator (`src/llm/validator.js`)

**SPEC-VALIDATOR-01: Compound PascalCase Detection**
- GIVEN a documentation fragment containing compound PascalCase words (e.g., `HashBuilder`, `FileParser`, `MyClass`)
- AND those words are not found in `fileFacts` identifiers
- WHEN `validateFragment()` is called
- THEN those words SHALL be flagged as suspected hallucinations

**SPEC-VALIDATOR-02: Acronym False Positive Prevention**
- GIVEN a documentation fragment containing technical acronyms (`SHA`, `CLI`, `LLM`, `AST`, `API`, `JSON`, `URL`, `JWT`, `HTTP`, `SQL`, `UUID`, `ENV`, `SDK`)
- WHEN `validateFragment()` is called
- THEN those acronyms SHALL NOT be flagged as hallucinations, regardless of fileFacts content

**SPEC-VALIDATOR-03: Prose Capitalization False Positive Prevention**
- GIVEN a documentation fragment containing single capitalized prose words (`Output`, `Skip`, `Log`, `Path`, `Done`, `Hash`, `Analyzing`, `Concurrent`, `Manage`)
- WHEN `validateFragment()` is called
- THEN those words SHALL NOT be flagged as hallucinations

**SPEC-VALIDATOR-04: Legitimate Identifier Pass-through**
- GIVEN a documentation fragment mentioning a function name present in `fileFacts.functions[].name`
- WHEN `validateFragment()` is called
- THEN that function name SHALL NOT be flagged as a hallucination

---

### OpenRouter Default Provider

**SPEC-PROVIDER-01: Zero-Setup Usage**
- GIVEN a fresh install of legacyver with no `.legacyverrc` and no `OPENROUTER_API_KEY` env var set
- WHEN the user runs `legacyver analyze`
- THEN the tool SHALL use the built-in OpenRouter API key and SHALL NOT throw a `NoApiKeyError`

**SPEC-PROVIDER-02: Env Var Override**
- GIVEN the user has set `OPENROUTER_API_KEY` in their shell environment
- WHEN the OpenRouterProvider constructor is called
- THEN `this.apiKey` SHALL equal `process.env.OPENROUTER_API_KEY`, not the built-in key

**SPEC-PROVIDER-03: Config File Override**
- GIVEN the user has `apiKey: "sk-or-v1-custom"` in `.legacyverrc` and no env var set
- WHEN the OpenRouterProvider constructor is called
- THEN `this.apiKey` SHALL equal the config file value, not the built-in key

**SPEC-PROVIDER-04: Default Provider Resolution**
- GIVEN no `.legacyverrc` exists and no `--provider` flag is passed
- WHEN `loadConfig({})` is called
- THEN `config.provider` SHALL equal `'openrouter'`

**SPEC-PROVIDER-05: Init Wizard Default**
- GIVEN the user runs `legacyver init` and presses Enter without typing a provider
- WHEN the wizard reads the provider choice
- THEN `providerChoice` SHALL equal `'openrouter'`

---

### CLI Flag Priority Fix (`bin/legacyver.js` + `src/utils/config.js`)

**SPEC-CONFIG-01: File Config Respected When No Flag Passed**
- GIVEN `provider: "gemini"` is set in `.legacyverrc`
- AND the user runs `legacyver analyze` without `--provider` flag
- WHEN `loadConfig()` is called with `flags.provider = undefined`
- THEN `config.provider` SHALL equal `'gemini'` (file config wins)

**SPEC-CONFIG-02: CLI Flag Overrides File Config**
- GIVEN `provider: "gemini"` is set in `.legacyverrc`
- AND the user runs `legacyver analyze --provider groq`
- WHEN `loadConfig()` is called with `flags.provider = 'groq'`
- THEN `config.provider` SHALL equal `'groq'` (CLI flag wins)

**SPEC-CONFIG-03: System Default When No Config And No Flag**
- GIVEN no `.legacyverrc` exists
- AND the user runs `legacyver analyze` without any flags
- WHEN `loadConfig()` is called with all flags undefined
- THEN `config.provider` SHALL equal `'openrouter'` (system default wins)

**SPEC-CONFIG-04: Format Config Respected**
- GIVEN `format: "html"` is set in `.legacyverrc`
- AND the user runs `legacyver analyze` without `--format` flag
- THEN `config.format` SHALL equal `'html'`

**SPEC-CONFIG-05: Out Dir Config Respected**
- GIVEN `out: "./my-docs"` is set in `.legacyverrc`
- AND the user runs `legacyver analyze` without `--out` flag
- THEN `config.out` SHALL equal `'./my-docs'`

---

### dotenv Removal

**SPEC-DOTENV-01: No Console Noise**
- GIVEN legacyver is installed and `.env` file may or may not exist
- WHEN the user runs any legacyver command (e.g., `legacyver --version`, `legacyver analyze`)
- THEN no `[dotenv@...]` message SHALL appear in stdout or stderr

**SPEC-DOTENV-02: Env Vars Still Work**
- GIVEN the user sets `OPENROUTER_API_KEY` via shell (`$env:OPENROUTER_API_KEY = "..."` on Windows, `export OPENROUTER_API_KEY=...` on Unix)
- WHEN legacyver reads `process.env.OPENROUTER_API_KEY`
- THEN the key SHALL be available (shell env vars work without dotenv)
