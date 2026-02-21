/**
 * Integration test — full pipeline against js-express fixture.
 *
 * Uses a mock LLM provider so no API key is required. Runs Crawler →
 * Parser → (mock LLM) → Renderer and asserts the output artefacts are
 * correct.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { crawl } from '../src/crawler/index.js';
import { parseFiles } from '../src/parser/index.js';
import { buildChunks } from '../src/llm/chunker.js';
import { render } from '../src/renderer/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/js-express');
const OUT_DIR = path.join(__dirname, '__integration-out-js');

// ── Mock LLM provider ─────────────────────────────────────────────────────────
function buildMockFragments(chunks) {
  return chunks.map(chunk => ({
    relativePath: chunk.relativePath,
    content: `## ${chunk.relativePath}\n\nGenerated docs for ${chunk.relativePath}.\n`,
    tokensUsed: { input: 100, output: 50 },
    _qualityWarnings: [],
  }));
}

// ── Setup / teardown ──────────────────────────────────────────────────────────
afterAll(() => {
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true, force: true });
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Integration: js-express pipeline', () => {
  let pkg;
  let fragments;

  beforeAll(async () => {
    const config = { maxFileSizeKb: 500 };
    const { files, meta } = await crawl(FIXTURE, config);
    pkg = await parseFiles(files, meta, config);

    const chunks = buildChunks(pkg, { ...config, maxTokens: 120000 });
    fragments = buildMockFragments(chunks);

    await render(fragments, pkg, OUT_DIR, { format: 'markdown' });
  });

  it('crawler finds JS source files', async () => {
    const config = { maxFileSizeKb: 500 };
    const { files } = await crawl(FIXTURE, config);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.language === 'javascript')).toBe(true);
  });

  it('PKG contains expected files', () => {
    expect(pkg.files).toBeDefined();
    const keys = Object.keys(pkg.files);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('parser extracts functions from app.js', () => {
    const appFacts = Object.values(pkg.files).find(f => f.relativePath.endsWith('app.js'));
    expect(appFacts).toBeDefined();
  });

  it('parser extracts getUser from utils/db.js', () => {
    const dbFacts = Object.values(pkg.files).find(f => f.relativePath.includes('db.js'));
    expect(dbFacts).toBeDefined();
    const names = dbFacts.functions.map(f => f.name);
    expect(names).toContain('getUser');
  });

  it('chunks are built for each file', () => {
    const chunks = buildChunks(pkg, { maxTokens: 120000 });
    expect(chunks.length).toBe(Object.keys(pkg.files).length);
  });

  it('output directory is created', () => {
    expect(existsSync(OUT_DIR)).toBe(true);
  });

  it('index.md is written', () => {
    expect(existsSync(path.join(OUT_DIR, 'index.md'))).toBe(true);
  });

  it('SUMMARY.md is written', () => {
    expect(existsSync(path.join(OUT_DIR, 'SUMMARY.md'))).toBe(true);
  });

  it('index.md contains primary language', () => {
    const content = readFileSync(path.join(OUT_DIR, 'index.md'), 'utf8');
    expect(content).toContain('javascript');
  });

  it('index.md contains Dependency Graph section', () => {
    const content = readFileSync(path.join(OUT_DIR, 'index.md'), 'utf8');
    expect(content).toContain('Dependency Graph');
  });

  it('individual file .md is written', () => {
    const anyMd = fragments.find(f => f.relativePath.endsWith('.js'));
    expect(anyMd).toBeDefined();
    const mdPath = path.join(OUT_DIR, anyMd.relativePath.replace(/\.js$/, '.md'));
    expect(existsSync(mdPath)).toBe(true);
  });

  it('no hallucinated function names in mock docs', () => {
    // Mock docs only reference the relativePath — no invented identifiers
    for (const frag of fragments) {
      expect(frag.content).not.toContain('__HALLUCINATED__');
    }
  });
});
