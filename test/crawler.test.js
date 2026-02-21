import { describe, it, expect, beforeAll } from 'vitest';
import { crawl } from '../src/crawler/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsFixture = path.join(__dirname, 'fixtures/js-express/src');
const laravelFixture = path.join(__dirname, 'fixtures/laravel-api');

describe('File Crawler', () => {
  it('discovers JS files in express fixture', async () => {
    const result = await crawl(jsFixture, {});
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.every(f => f.language === 'javascript')).toBe(true);
  });

  it('computes SHA-256 hashes for all files', async () => {
    const result = await crawl(jsFixture, {});
    for (const f of result.files) {
      expect(f.hash).toMatch(/^sha256:/);
    }
  });

  it('skips files over size limit', async () => {
    const tmpDir = path.join(os.tmpdir(), 'legacyver-test-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
    // Create a 1MB file
    writeFileSync(path.join(tmpDir, 'big.js'), 'x'.repeat(1024 * 1024));
    writeFileSync(path.join(tmpDir, 'small.js'), 'const x = 1;');
    const result = await crawl(tmpDir, { maxFileSizeKb: 500 });
    expect(result.files.length).toBe(1);
    expect(result.skipped.length).toBe(1);
    expect(result.skipped[0].reason).toBe('too large');
    rmSync(tmpDir, { recursive: true });
  });

  it('detects Laravel project when artisan + app/ present', async () => {
    const result = await crawl(laravelFixture, {});
    expect(result.meta.framework).toBe('laravel');
  });

  it('respects .legacyverignore rules', async () => {
    const tmpDir = path.join(os.tmpdir(), 'legacyver-ignore-test-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(path.join(tmpDir, 'keep.js'), 'const a = 1;');
    writeFileSync(path.join(tmpDir, 'skip.js'), 'const b = 2;');
    writeFileSync(path.join(tmpDir, '.legacyverignore'), 'skip.js');
    const result = await crawl(tmpDir, {});
    const names = result.files.map(f => f.relativePath);
    expect(names).toContain('keep.js');
    expect(names).not.toContain('skip.js');
    rmSync(tmpDir, { recursive: true });
  });

  it('detects primary language by file count', async () => {
    const result = await crawl(jsFixture, {});
    expect(result.meta.primaryLanguage).toBe('javascript');
  });
});
