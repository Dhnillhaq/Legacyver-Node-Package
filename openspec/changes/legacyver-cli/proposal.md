# Proposal: legacyver-cli

## Why

Legacy codebases are a universal pain point. When a developer inherits an undocumented codebase — or when a new team member onboards — they face hours or days of reading raw source code just to understand what exists and how it connects. This slows down audits, makes refactoring risky, and burns onboarding time.

Existing documentation generators (JSDoc, TypeDoc, Sphinx) require developers to *write* documentation first. They don't help with code that has *no* documentation. LLM-powered tools like GitHub Copilot's chat can explain individual files, but they have no persistent output, no project-wide overview, and no way to run as part of a CI/CD pipeline.

Legacyver solves this with a single command:

```bash
npx legacyver analyze ./src
```

It crawls the repo, extracts structural facts via AST parsing (not regex guessing), sends grounded context to an LLM, and outputs a complete documentation suite — all without the developer writing a single line of documentation manually.

## What Changes

This is a greenfield implementation. The following is being built from scratch and published as a public npm package (`legacyver`):

- **CLI entrypoint** (`bin/legacyver.js`) with `analyze`, `init`, `providers`, and `cache` commands
- **File Crawler** — fast-glob based directory walker with .legacyverignore support
- **AST Parser** — Tree-sitter based fact extractor producing a Project Knowledge Graph (PKG) JSON structure
- **LLM Engine** — provider-agnostic adapter layer with rate limiting, chunking, and anti-hallucination prompt contract
- **Renderer** — Markdown, HTML, and JSON output generators
- **Incremental Cache** — SHA-256 file hash cache to skip unchanged files on re-runs
- **Cost Estimator** — tiktoken-based pre-analysis token/cost preview with user confirmation

## Impact

- **Affected code**: New repository, no existing code impacted
- **npm registry**: New public package `legacyver` to be published
- **APIs consumed**: Anthropic, OpenAI, Google AI, Groq, Ollama — all via user-supplied API keys
- **User filesystem**: Writes to `./legacyver-docs/` (or `--out` flag), reads `.legacyverignore`, `.legacyverrc`
- **No data sent to Legacyver servers**: All analysis happens locally or via user's own LLM API keys
- **Rollback plan**: npm `unpublish` within 72 hours if critical issues found post-publish; semver patch for fixes
- **Affected teams**: Solo developer / small team initially; no downstream consumers on first publish