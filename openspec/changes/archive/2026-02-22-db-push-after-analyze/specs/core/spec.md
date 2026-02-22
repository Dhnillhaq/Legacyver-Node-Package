## MODIFIED Requirements

### Requirement: Analyze command triggers DB push (Stage 5) after rendering
The `analyze` command pipeline includes a 5th stage — Cloud Sync — that runs after the
renderer writes all output files to disk. This step is conditional on the user having a
valid session token and SHALL NOT affect the success/failure of the analyze run itself.

#### Scenario: Authenticated user — push runs after render
- **WHEN** `legacyver analyze` completes Stage 4 (Renderer)
- **AND** `loadSession().token` is truthy
- **THEN** spinner "Syncing docs to cloud..." is shown
- **AND** `pushToDatabase(allFragments, targetDir)` is called
- **AND** on success, spinner shows "Docs synced to cloud (N files)"
- **AND** `printSummary(stats)` is called after the push

#### Scenario: Unauthenticated user — push silently skipped
- **WHEN** `legacyver analyze` completes Stage 4
- **AND** `loadSession()` returns no `token`
- **THEN** `pushToDatabase()` returns `{ skipped: true }` immediately
- **AND** no spinner is shown
- **AND** `printSummary()` includes a cloud sync upgrade tip

#### Scenario: Push error does not fail analyze
- **WHEN** `pushToDatabase()` throws any error
- **THEN** the error is caught in the analyze command's try/catch
- **AND** `logger.warn('Cloud sync failed: ' + syncErr.message)` is called
- **AND** the analyze command exits with code 0
- **AND** all local output files remain intact

---

### Requirement: analyze command `--json-summary` flag outputs machine-readable stats
When `--json-summary` flag is passed, `printSummary()` is replaced with
`console.log(JSON.stringify(stats))` where `stats` includes:
`{ filesAnalyzed, filesCached, filesSkipped, tokensUsed, estimatedCost, qualityWarnings, errors, outputDir }`.

#### Scenario: JSON summary output
- **WHEN** `legacyver analyze --json-summary` is run
- **THEN** a single JSON object is printed to stdout
- **AND** human-readable spinner/progress output is still shown to stderr

---

### Requirement: analyze command pipeline flow (5 stages)
```
legacyver analyze <target>
  Stage 1: Crawler            → FileManifest[]
  Stage 2: AST Parser         → ProjectKnowledgeGraph (PKG)
  [dry-run check]             → exit 0 if --dry-run
  [free model policy]         → adjust concurrency limits
  [cost gate]                 → confirm if >$0.10 and not free model
  Stage 3: LLM Engine         → DocFragment[]
  [quality validation]        → hallucination + completeness check + re-prompt
  Stage 4: Renderer           → ./legacyver-docs/ (or --out)
  [cache save]                → .legacyver-cache/hashes.json
  Stage 5: Cloud Sync         → app.documentation_pages (if logged in)
  printSummary() / --json-summary
```
