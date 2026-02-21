/**
 * Unit tests for the OpenRouter provider adapter.
 *
 * All HTTP calls are mocked using globalThis.fetch so no real API key
 * or network access is required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterProvider } from '../src/llm/providers/openrouter.js';
import { NoApiKeyError, RateLimitError } from '../src/utils/errors.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeChunk(overrides = {}) {
  return {
    relativePath: 'src/index.js',
    systemPrompt: 'You are a documentation assistant.',
    userMessage: 'Document this file.',
    tokenCount: 100,
    ...overrides,
  };
}

function mockFetchOk(content = 'Documentation text.', promptTokens = 50, completionTokens = 30) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
    }),
    text: async () => '',
  });
}

function mockFetchStatus(status, body = '') {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (h) => (h === 'retry-after' ? '2' : null) },
    json: async () => ({}),
    text: async () => body,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('OpenRouterProvider', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ── Constructor ─────────────────────────────────────────────────────────────
  describe('constructor', () => {
    it('throws NoApiKeyError when no key provided', () => {
      const savedEnv = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      expect(() => new OpenRouterProvider({ model: 'test-model' })).toThrow('No API key');

      if (savedEnv !== undefined) process.env.OPENROUTER_API_KEY = savedEnv;
    });

    it('accepts API key from config', () => {
      expect(() => new OpenRouterProvider({ apiKey: 'test-key-123' })).not.toThrow();
    });

    it('accepts API key from environment variable', () => {
      process.env.OPENROUTER_API_KEY = 'env-key-abc';
      expect(() => new OpenRouterProvider({})).not.toThrow();
      delete process.env.OPENROUTER_API_KEY;
    });

    it('detects free model via :free suffix', () => {
      const p = new OpenRouterProvider({
        apiKey: 'key',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
      });
      expect(p.isFreeModel).toBe(true);
    });

    it('does not flag paid model as free', () => {
      const p = new OpenRouterProvider({ apiKey: 'key', model: 'openai/gpt-4o' });
      expect(p.isFreeModel).toBe(false);
    });

    it('uses default model when none specified', () => {
      const p = new OpenRouterProvider({ apiKey: 'key' });
      expect(p.model).toMatch(/llama|:free/);
    });
  });

  // ── complete() ──────────────────────────────────────────────────────────────
  describe('complete()', () => {
    it('sends POST to correct endpoint', async () => {
      const mockFetch = mockFetchOk();
      globalThis.fetch = mockFetch;

      const p = new OpenRouterProvider({ apiKey: 'key' });
      await p.complete(makeChunk());

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    });

    it('sends Authorization header with Bearer token', async () => {
      const mockFetch = mockFetchOk();
      globalThis.fetch = mockFetch;

      const p = new OpenRouterProvider({ apiKey: 'sk-test-key' });
      await p.complete(makeChunk());

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer sk-test-key');
    });

    it('sends required HTTP-Referer header', async () => {
      const mockFetch = mockFetchOk();
      globalThis.fetch = mockFetch;

      const p = new OpenRouterProvider({ apiKey: 'key' });
      await p.complete(makeChunk());

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['HTTP-Referer']).toBeDefined();
      expect(options.headers['HTTP-Referer']).toContain('github.com');
    });

    it('sends X-Title header', async () => {
      const mockFetch = mockFetchOk();
      globalThis.fetch = mockFetch;

      const p = new OpenRouterProvider({ apiKey: 'key' });
      await p.complete(makeChunk());

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['X-Title']).toBeDefined();
    });

    it('returns content from response', async () => {
      globalThis.fetch = mockFetchOk('This is the doc content.');

      const p = new OpenRouterProvider({ apiKey: 'key' });
      const result = await p.complete(makeChunk());

      expect(result.content).toBe('This is the doc content.');
    });

    it('returns tokensUsed from usage field', async () => {
      globalThis.fetch = mockFetchOk('content', 80, 40);

      const p = new OpenRouterProvider({ apiKey: 'key' });
      const result = await p.complete(makeChunk());

      expect(result.tokensUsed.input).toBe(80);
      expect(result.tokensUsed.output).toBe(40);
    });

    it('includes system prompt and user message in body', async () => {
      const mockFetch = mockFetchOk();
      globalThis.fetch = mockFetch;

      const chunk = makeChunk({
        systemPrompt: 'SYS_PROMPT',
        userMessage: 'USER_MSG',
      });

      const p = new OpenRouterProvider({ apiKey: 'key' });
      await p.complete(chunk);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      const messages = body.messages;

      expect(messages.some(m => m.role === 'system' && m.content === 'SYS_PROMPT')).toBe(true);
      expect(messages.some(m => m.role === 'user' && m.content === 'USER_MSG')).toBe(true);
    });

    it('throws RateLimitError on HTTP 429', async () => {
      globalThis.fetch = mockFetchStatus(429);

      const p = new OpenRouterProvider({ apiKey: 'key' });
      await expect(p.complete(makeChunk())).rejects.toThrow('Rate limit');
    });

    it('RateLimitError retryAfter reflects retry-after header (×1000)', async () => {
      globalThis.fetch = mockFetchStatus(429);

      const p = new OpenRouterProvider({ apiKey: 'key' });
      try {
        await p.complete(makeChunk());
      } catch (e) {
        expect(e.retryAfter).toBe(2000); // header says 2, multiplied by 1000
      }
    });

    it('throws generic Error on non-ok non-429 responses', async () => {
      globalThis.fetch = mockFetchStatus(500, 'Internal server error');

      const p = new OpenRouterProvider({ apiKey: 'key' });
      await expect(p.complete(makeChunk())).rejects.toThrow(/500/);
    });
  });

  // ── estimateCost() ──────────────────────────────────────────────────────────
  describe('estimateCost()', () => {
    it('returns 0 for free models', () => {
      const p = new OpenRouterProvider({
        apiKey: 'key',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
      });
      expect(p.estimateCost(10000, 5000)).toBe(0);
    });
  });
});
