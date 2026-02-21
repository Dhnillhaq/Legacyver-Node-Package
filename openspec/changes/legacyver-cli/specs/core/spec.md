# Core Pipeline Spec

> Source of truth for Legacyver's core behavior.
> Last updated by: change/legacyver-cli

## Overview

Legacyver is a CLI tool that generates technical documentation from undocumented or legacy codebases. It operates as a 4-stage pipeline: Crawler → AST Parser → LLM Engine → Renderer. The fundamental design constraint is that the LLM is a writer, not an analyst — it only describes facts that have already been extracted by the AST parser.

## Requirements

### CLI Entry Point
The system SHALL expose `legacyver` as a globally-installable npm package command. The tool SHALL support `analyze`, `init`, `providers`, and `cache` subcommands. The tool SHALL detect CI environments (no TTY) and disable interactive prompts accordingly.

### File Crawler
The system SHALL discover all relevant source files using fast-glob. The system SHALL respect `.gitignore` syntax in `.legacyverignore` files. The system SHALL skip files exceeding the configured size limit with a logged warning.

### AST Parser
The system SHALL extract structural facts (functions, classes, imports, exports, call relationships) from source code using Tree-sitter grammars before any LLM interaction. The system SHALL fall back to a generic regex parser for unsupported languages. The system SHALL produce a Project Knowledge Graph (PKG) JSON structure representing the entire codebase.

### LLM Engine
The system SHALL use provider-agnostic adapters supporting Anthropic, OpenAI, Google, Groq, and Ollama. The system SHALL enforce an anti-hallucination prompt contract where the LLM receives `FileFacts` JSON before raw source code and is instructed to describe only what is present. The system SHALL implement rate limiting with exponential backoff retry. The system SHALL display cost estimates before processing and require user confirmation when cost exceeds $0.10.

### Renderer
The system SHALL support Markdown (default), HTML, and JSON output formats. Markdown output SHALL mirror the source directory structure. HTML output SHALL be a self-contained single file. JSON output SHALL include the full PKG with LLM-generated descriptions.

### Incremental Cache
The system SHALL maintain SHA-256 file hash cache in `.legacyver-cache/`. When `--incremental` is set, the system SHALL skip analysis for files whose hash matches the cache. The system SHALL automatically add `.legacyver-cache/` to `.gitignore`.