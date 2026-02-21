'use strict';

/**
 * Domain pattern detector — scans function body text for known patterns.
 */

const PATTERNS = [
  {
    name: 'arithmetic',
    test: (body) =>
      /[\*\/\%\*\*]/.test(body) || /Math\./.test(body),
  },
  {
    name: 'mqtt',
    test: (body) =>
      /\.publish\s*\(/.test(body) ||
      /\.subscribe\s*\(/.test(body) ||
      /\.connect\s*\(/.test(body) ||
      /mqtts?:\/\//.test(body),
  },
  {
    name: 'http_call',
    test: (body) =>
      /\bfetch\s*\(/.test(body) ||
      /\baxios\b/.test(body) ||
      /\bhttp\.get\s*\(/.test(body) ||
      /\bcurl\b/.test(body) ||
      /\bGuzzle\b/.test(body),
  },
  {
    name: 'database_query',
    test: (body) =>
      /\.query\s*\(/.test(body) ||
      /->where\s*\(/.test(body) ||
      /->select\s*\(/.test(body) ||
      /\bDB::/.test(body) ||
      /\bPDO\b/.test(body) ||
      /\bmongoose\b/.test(body) ||
      /\bprisma\b/.test(body),
  },
  {
    name: 'event_emit',
    test: (body) =>
      /\.emit\s*\(/.test(body) ||
      /\.dispatch\s*\(/.test(body) ||
      /\bevent\s*\(/.test(body) ||
      /Event::dispatch\s*\(/.test(body),
  },
  {
    name: 'caching',
    test: (body) =>
      /\bcache\s*\(/.test(body) ||
      /\bCache::/.test(body) ||
      /\bRedis::/.test(body),
  },
  {
    name: 'queue_job',
    test: (body) =>
      /\bdispatch\s*\(/.test(body) ||
      /Queue::push\s*\(/.test(body) ||
      /->delay\s*\(/.test(body) ||
      /\.queue\s*\(/.test(body),
  },
];

function detectPatterns(bodyText) {
  if (!bodyText) return [];
  return PATTERNS.filter((p) => p.test(bodyText)).map((p) => p.name);
}

module.exports = { detectPatterns, PATTERNS };
