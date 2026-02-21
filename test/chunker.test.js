import { describe, it, expect } from 'vitest';
import { buildChunks } from '../src/llm/chunker.js';

const mockPKG = {
  meta: { name: 'test', primaryLanguage: 'javascript', targetDir: '/tmp' },
  files: {
    'src/utils/db.js': {
      relativePath: 'src/utils/db.js',
      absolutePath: '/tmp/src/utils/db.js',
      language: 'javascript',
      linesOfCode: 30,
      functions: [
        {
          name: 'getUser',
          params: [{ name: 'id', type: null }],
          returnType: null,
          isExported: true,
          isAsync: false,
          lineStart: 1,
          lineEnd: 3,
          calls: [],
          complexityScore: 1,
          complexityClass: 'simple',
          detectedPatterns: [],
          bodySnippet: null,
          bodySnippetTruncated: false,
        },
      ],
      classes: [],
      imports: [],
      exports: ['getUser'],
      callsTo: [],
      calledBy: [],
    },
  },
  entryPoints: [],
  graph: {},
};

describe('LLM Chunker', () => {
  it('produces one chunk per file', () => {
    const chunks = buildChunks(mockPKG, { model: 'meta-llama/llama-3.3-70b-instruct:free' });
    expect(chunks.length).toBe(1);
    expect(chunks[0].relativePath).toBe('src/utils/db.js');
  });

  it('chunk contains systemPrompt and userMessage', () => {
    const chunks = buildChunks(mockPKG, {});
    expect(chunks[0].systemPrompt).toBeTruthy();
    expect(chunks[0].userMessage).toBeTruthy();
  });

  it('userMessage contains structure and function names', () => {
    const chunks = buildChunks(mockPKG, {});
    expect(chunks[0].userMessage).toContain('STRUCTURE');
    expect(chunks[0].userMessage).toContain('getUser');
  });

  it('tokenCount is a positive number', () => {
    const chunks = buildChunks(mockPKG, {});
    expect(chunks[0].tokenCount).toBeGreaterThan(0);
  });
});
