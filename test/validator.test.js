import { describe, it, expect } from 'vitest';
import { validateFragment } from '../src/llm/validator.js';

const mockFacts = {
  relativePath: 'src/utils/auth.js',
  functions: [
    { name: 'validateToken', params: [{ name: 'token', type: null }], calls: [] },
    { name: 'refreshToken', params: [], calls: [] },
  ],
  classes: [{ name: 'AuthService', methods: ['login', 'logout'] }],
  imports: [{ module: 'jsonwebtoken', specifiers: ['sign', 'verify'] }],
  exports: ['validateToken', 'AuthService'],
};

describe('Hallucination Check', () => {
  it('does not flag known identifiers from FileFacts', () => {
    const fragment = {
      relativePath: 'src/utils/auth.js',
      content: '## Overview\nThis file provides AuthService with validateToken and refreshToken.',
    };
    const result = validateFragment(fragment, mockFacts);
    expect(result.hallucinations.filter(h => h.includes('AuthService') || h.includes('validateToken'))).toHaveLength(0);
  });

  it('flags identifiers not in FileFacts', () => {
    const fragment = {
      relativePath: 'src/utils/auth.js',
      content: '## Overview\nThis file uses FakeLibrary for cryptographic operations.',
    };
    const result = validateFragment(fragment, mockFacts);
    expect(result.hallucinations.some(h => h.includes('FakeLibrary'))).toBe(true);
  });
});

describe('Completeness Check', () => {
  it('detects missing exported symbols', () => {
    const fragment = {
      relativePath: 'src/utils/auth.js',
      content: '## Overview\nThis file handles authentication.',
    };
    const result = validateFragment(fragment, mockFacts);
    expect(result.missingExports).toContain('validateToken');
    expect(result.missingExports).toContain('AuthService');
  });

  it('passes when all exports are mentioned', () => {
    const fragment = {
      relativePath: 'src/utils/auth.js',
      content: '## Overview\nThis file provides `validateToken` and `AuthService`.',
    };
    const result = validateFragment(fragment, mockFacts);
    expect(result.missingExports).toHaveLength(0);
  });

  it('re-prompt threshold: 30%+ missing triggers re-prompt flag', () => {
    const fragment = {
      relativePath: 'src/utils/auth.js',
      content: '## Overview\nEmpty docs.',
    };
    const result = validateFragment(fragment, mockFacts);
    const total = mockFacts.exports.length;
    const missingPct = result.missingExports.length / total;
    expect(missingPct).toBeGreaterThan(0.3);
  });
});
