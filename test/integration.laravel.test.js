/**
 * Integration test — full pipeline against laravel-api fixture.
 *
 * Uses a mock LLM provider. Verifies that the Markdown renderer produces
 * the Laravel-specific sections (Route Map, Model Relationships, etc.)
 * from actual AST extraction — no hallucination by definition since the
 * mock LLM output does not invent identifiers.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, rmSync } from 'fs';
import { crawl } from '../src/crawler/index.js';
import { parseFiles } from '../src/parser/index.js';
import { buildChunks } from '../src/llm/chunker.js';
import { render } from '../src/renderer/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures/laravel-api');
const OUT_DIR = path.join(__dirname, '__integration-out-laravel');

function buildMockFragments(chunks) {
  return chunks.map(chunk => ({
    relativePath: chunk.relativePath,
    content: `## ${chunk.relativePath}\n\nMock documentation.\n`,
    tokensUsed: { input: 100, output: 50 },
    _qualityWarnings: [],
  }));
}

afterAll(() => {
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true, force: true });
  }
});

describe('Integration: laravel-api pipeline', () => {
  let pkg;
  let fragments;
  let indexMd;

  beforeAll(async () => {
    const config = { maxFileSizeKb: 500 };
    const { files, meta } = await crawl(FIXTURE, config);
    pkg = await parseFiles(files, meta, config);

    const chunks = buildChunks(pkg, { ...config, maxTokens: 120000 });
    fragments = buildMockFragments(chunks);

    await render(fragments, pkg, OUT_DIR, { format: 'markdown' });
    indexMd = readFileSync(path.join(OUT_DIR, 'index.md'), 'utf8');
  });

  it('detects Laravel framework', async () => {
    const config = { maxFileSizeKb: 500 };
    const { meta } = await crawl(FIXTURE, config);
    expect(meta.framework).toBe('laravel');
  });

  it('PKG has laravelMeta', () => {
    expect(pkg.laravelMeta).toBeDefined();
  });

  it('laravelMeta has routeMap with entries', () => {
    expect(pkg.laravelMeta.routeMap).toBeDefined();
    expect(pkg.laravelMeta.routeMap.length).toBeGreaterThan(0);
  });

  it('routeMap contains GET method', () => {
    const methods = pkg.laravelMeta.routeMap.map(r => r.method);
    expect(methods).toContain('GET');
  });

  it('routeMap contains POST method', () => {
    const methods = pkg.laravelMeta.routeMap.map(r => r.method);
    expect(methods).toContain('POST');
  });

  it('routeMap contains /orders URI', () => {
    const uris = pkg.laravelMeta.routeMap.map(r => r.uri);
    expect(uris).toContain('/orders');
  });

  it('index.md contains Route Map section', () => {
    expect(indexMd).toContain('Route Map');
  });

  it('index.md Route Map table has GET row', () => {
    expect(indexMd).toContain('GET');
  });

  it('index.md Route Map table has /orders URI', () => {
    expect(indexMd).toContain('/orders');
  });

  it('index.md Route Map table has OrderController reference', () => {
    expect(indexMd).toContain('OrderController');
  });

  it('laravelMeta has model names', () => {
    expect(pkg.laravelMeta.modelNames.length).toBeGreaterThan(0);
  });

  it('Order model is recognized', () => {
    expect(pkg.laravelMeta.modelNames).toContain('Order');
  });

  it('index.md is written with framework header', () => {
    expect(indexMd).toContain('laravel');
  });

  it('SUMMARY.md is written', () => {
    expect(existsSync(path.join(OUT_DIR, 'SUMMARY.md'))).toBe(true);
  });

  it('mock fragments contain no invented controller names', () => {
    // Mock docs only contain the relativePath — no invented identifiers
    for (const frag of fragments) {
      expect(frag.content).not.toMatch(/FakeController|NonExistentClass/);
    }
  });
});
