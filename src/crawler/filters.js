'use strict';

const LANGUAGE_EXTENSIONS = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx'],
  python: ['.py'],
  java: ['.java'],
  go: ['.go'],
  php: ['.php', '.blade.php'],
};

const ALL_EXTENSIONS = Object.values(LANGUAGE_EXTENSIONS).flat();

const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/vendor/**',
  '**/coverage/**',
  '**/__pycache__/**',
  '**/storage/**',
  '**/bootstrap/cache/**',
  '**/.legacyver-cache/**',
  '**/legacyver-docs/**',
  '**/test/**',
  '**/tests/**',
  '**/spec/**',
  '**/openspec/**',
  '**/*.test.js',
  '**/*.test.ts',
  '**/*.spec.js',
  '**/*.spec.ts',
  '**/*.test.py',
];

function detectLanguage(ext) {
  for (const [lang, exts] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (exts.includes(ext)) return lang;
  }
  return null;
}

function detectPrimaryLanguage(files) {
  const counts = {};
  for (const f of files) {
    const lang = f.language;
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }
  let max = 0;
  let primary = null;
  for (const [lang, cnt] of Object.entries(counts)) {
    if (cnt > max) { max = cnt; primary = lang; }
  }
  return primary;
}

module.exports = { LANGUAGE_EXTENSIONS, ALL_EXTENSIONS, DEFAULT_IGNORE_PATTERNS, detectLanguage, detectPrimaryLanguage };
