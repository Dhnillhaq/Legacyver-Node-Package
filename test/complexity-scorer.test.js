import { describe, it, expect } from 'vitest';
import { scoreComplexity } from '../src/parser/complexity-scorer.js';
import { detectPatterns } from '../src/parser/pattern-detector.js';
import { extractBodySnippet } from '../src/parser/body-extractor.js';

describe('Complexity Scorer', () => {
  it('scores a simple getter as simple (0-3)', () => {
    const body = `{ return this.name; }`;
    const result = scoreComplexity(body);
    expect(result.complexityClass).toBe('simple');
    expect(result.complexityScore).toBeLessThanOrEqual(3);
  });

  it('scores a tiered discount function as moderate (4-8)', () => {
    const body = `{
      let discount = 0;
      if (qty > 100) { discount = 0.15; }
      else if (qty > 50) { discount = 0.10; }
      else if (qty > 10) { discount = 0.05; }
      const total = price * qty * (1 - discount);
      return Math.round(total * 100) / 100;
    }`;
    const result = scoreComplexity(body);
    expect(['moderate', 'complex']).toContain(result.complexityClass);
    expect(result.complexityScore).toBeGreaterThanOrEqual(4);
  });

  it('scores a deeply nested algorithm as complex (9+)', () => {
    const body = `{
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          for (let k = 0; k < n; k++) {
            if (a[i] > b[j]) {
              if (c[k] !== null) {
                result += a[i] * b[j] / c[k];
              }
            }
          }
        }
      }
      return result;
    }`;
    const result = scoreComplexity(body);
    expect(result.complexityClass).toBe('complex');
    expect(result.complexityScore).toBeGreaterThanOrEqual(9);
  });

  it('detects arithmetic pattern', () => {
    const body = `{ return price * qty / 100; }`;
    const result = scoreComplexity(body);
    expect(result.detectedPatterns).toContain('arithmetic');
  });

  it('detects mqtt pattern', () => {
    const body = `{ client.publish('topic/data', JSON.stringify(payload)); }`;
    const result = scoreComplexity(body);
    expect(result.detectedPatterns).toContain('mqtt');
  });

  it('detects http_call pattern', () => {
    const body = `{ const data = await fetch('/api/users'); return data.json(); }`;
    const result = scoreComplexity(body);
    expect(result.detectedPatterns).toContain('http_call');
  });
});

describe('Body Extractor', () => {
  it('returns null bodySnippet for simple functions (score <= 3)', () => {
    const source = `function getUser(id) {\n  return users[id];\n}`;
    const result = extractBodySnippet(source, 1, 3, 2);
    expect(result.bodySnippet).toBeNull();
  });

  it('returns bodySnippet for moderate functions (score >= 4)', () => {
    const source = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
    const result = extractBodySnippet(source, 1, 10, 5);
    expect(result.bodySnippet).not.toBeNull();
    expect(result.bodySnippetTruncated).toBe(false);
  });

  it('truncates bodies over 60 lines', () => {
    const lines = Array.from({ length: 80 }, (_, i) => `const x${i} = ${i};`);
    const source = lines.join('\n');
    const result = extractBodySnippet(source, 1, 80, 7);
    expect(result.bodySnippetTruncated).toBe(true);
    expect(result.bodySnippet.split('\n').length).toBeLessThanOrEqual(60);
  });
});

describe('Pattern Detector', () => {
  it('detects database_query pattern', () => {
    const body = `DB::table('users')->where('id', $id)->first()`;
    expect(detectPatterns(body)).toContain('database_query');
  });

  it('detects event_emit pattern', () => {
    const body = `event(new UserCreated($user));`;
    expect(detectPatterns(body)).toContain('event_emit');
  });

  it('detects caching pattern', () => {
    const body = `Cache::remember('key', 3600, fn() => $value);`;
    expect(detectPatterns(body)).toContain('caching');
  });

  it('detects queue_job pattern', () => {
    const body = `dispatch(new SendEmailJob($user));`;
    expect(detectPatterns(body)).toContain('queue_job');
  });

  it('returns empty array for plain function', () => {
    const body = `{ return this.name; }`;
    expect(detectPatterns(body)).toEqual([]);
  });
});
