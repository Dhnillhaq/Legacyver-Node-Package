'use strict';

/**
 * Custom error classes for Legacyver.
 */

class LegacyverError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LegacyverError';
    this.code = code || 'LEGACYVER_ERROR';
  }
}

class NoApiKeyError extends LegacyverError {
  constructor(provider) {
    super(
      `No API key found for provider "${provider}". ` +
        `Set the OPENROUTER_API_KEY environment variable or run \`legacyver init\`. ` +
        `Get a key at https://openrouter.ai/keys`,
      'NO_API_KEY'
    );
    this.name = 'NoApiKeyError';
    this.provider = provider;
  }
}

class RateLimitError extends LegacyverError {
  constructor(provider, retryAfter) {
    super(`Rate limit exceeded for provider "${provider}". Retrying...`, 'RATE_LIMIT');
    this.name = 'RateLimitError';
    this.provider = provider;
    this.retryAfter = retryAfter || 1000;
  }
}

class ParseError extends LegacyverError {
  constructor(filePath, originalError) {
    super(`Failed to parse file "${filePath}": ${originalError && originalError.message || originalError}`, 'PARSE_ERROR');
    this.name = 'ParseError';
    this.filePath = filePath;
    this.originalError = originalError;
  }
}

class RenderError extends LegacyverError {
  constructor(format, originalError) {
    super(`Renderer failed for format "${format}": ${originalError && originalError.message || originalError}`, 'RENDER_ERROR');
    this.name = 'RenderError';
    this.format = format;
    this.originalError = originalError;
  }
}

module.exports = { LegacyverError, NoApiKeyError, RateLimitError, ParseError, RenderError };
