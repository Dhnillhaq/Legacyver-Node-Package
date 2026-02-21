'use strict';

const { writeFileSync, mkdirSync } = require('fs');
const path = require('path');

/**
 * JSON renderer — outputs PKG enriched with LLM descriptions.
 */
async function render(fragments, pkg, outputDir, config) {
  mkdirSync(outputDir, { recursive: true });

  // Enrich PKG with LLM descriptions
  const enrichedPkg = JSON.parse(JSON.stringify(pkg));
  for (const frag of fragments) {
    if (enrichedPkg.files[frag.relativePath]) {
      enrichedPkg.files[frag.relativePath].llmDescription = frag.content;
      enrichedPkg.files[frag.relativePath]._qualityWarnings = frag._qualityWarnings || [];
    }
  }

  writeFileSync(
    path.join(outputDir, 'documentation.json'),
    JSON.stringify(enrichedPkg, null, 2),
    'utf8'
  );
}

module.exports = { render };
