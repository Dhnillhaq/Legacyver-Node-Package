import { describe, it, expect, vi } from 'vitest';
import { pushToDatabase } from '../src/db/index.js';

/**
 * Build a mock pool whose .query() calls resolve with the given sequence.
 */
function mockPool(...results) {
  const query = vi.fn();
  for (const r of results) {
    query.mockResolvedValueOnce(r);
  }
  return { query, end: vi.fn().mockResolvedValue(undefined) };
}

describe('pushToDatabase', () => {
  it('skips push when session has no token', async () => {
    const result = await pushToDatabase([], '/some/path', { session: {} });
    expect(result).toEqual({ skipped: true });
  });

  it('skips push when session has no token (email only)', async () => {
    const result = await pushToDatabase([], '/some/path', { session: { email: 'test@test.com' } });
    expect(result).toEqual({ skipped: true });
  });

  it('pushes docs when user is authenticated', async () => {
    const pool = mockPool(
      { rows: [{ id: 'repo-1' }] },   // getOrCreateRepo — existing repo found
      { rows: [{ id: 'doc-1' }] },     // getOrCreateDocumentation — existing doc found
      { rows: [{ id: 'page-1' }] },    // upsertPages — page exists (SELECT)
      { rows: [] }                      // upsertPages — UPDATE
    );

    const session = { token: 'test-token' };
    const user = { userId: '42', username: 'testuser', email: 'test@test.com' };
    const fragments = [{ relativePath: 'src/index.js', content: '# Index docs' }];
    const result = await pushToDatabase(fragments, '/home/user/my-project', { pool, session, user });

    expect(result.skipped).toBe(false);
    expect(result.pushed).toBe(1);
  });

  it('throws on DB error — caller is responsible for catching', async () => {
    const pool = {
      query: vi.fn().mockRejectedValueOnce(new Error('connection refused')),
      end: vi.fn().mockResolvedValue(undefined),
    };

    const session = { token: 'test-token' };
    const user = { userId: '42', username: 'testuser', email: 'test@test.com' };
    const fragments = [{ relativePath: 'src/index.js', content: '# Index docs' }];

    await expect(pushToDatabase(fragments, '/home/user/my-project', { pool, session, user })).rejects.toThrow('connection refused');
  });
});
