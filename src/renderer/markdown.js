'use strict';

const { writeFileSync, mkdirSync, existsSync } = require('fs');
const path = require('path');

/**
 * Markdown renderer — produces one .md per source file + index.md + SUMMARY.md.
 */
async function render(fragments, pkg, outputDir, config) {
  mkdirSync(outputDir, { recursive: true });

  const summaryLines = ['# Summary\n'];

  for (const frag of fragments) {
    const relOut = frag.relativePath.replace(/\.[^.]+$/, '.md');
    const outPath = path.join(outputDir, relOut);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, frag.content, 'utf8');
    summaryLines.push(`* [${frag.relativePath}](${relOut})`);
  }

  // SUMMARY.md (GitBook / Docusaurus compatible)
  writeFileSync(path.join(outputDir, 'SUMMARY.md'), summaryLines.join('\n'), 'utf8');

  // index.md
  writeFileSync(path.join(outputDir, 'index.md'), buildIndexMd(pkg, fragments), 'utf8');
}

function buildIndexMd(pkg, fragments) {
  const meta = pkg.meta || {};
  const lines = [];
  lines.push(`# ${meta.name || 'Project'} — Documentation`);
  lines.push('');
  lines.push(`**Primary language:** ${meta.primaryLanguage || 'unknown'}  `);
  lines.push(`**Total files:** ${meta.totalFiles || fragments.length}  `);
  lines.push(`**Analyzed at:** ${meta.analyzedAt || new Date().toISOString()}  `);
  if (meta.framework) lines.push(`**Framework:** ${meta.framework}  `);
  lines.push('');

  // File tree
  lines.push('## Files');
  lines.push('');
  for (const frag of fragments) {
    const relOut = frag.relativePath.replace(/\.[^.]+$/, '.md');
    lines.push(`- [${frag.relativePath}](${relOut})`);
  }
  lines.push('');

  // Mermaid dependency graph
  lines.push('## Dependency Graph');
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TD');
  const graph = pkg.graph || {};
  for (const [from, targets] of Object.entries(graph)) {
    for (const to of targets) {
      const fromId = sanitizeMermaid(from);
      const toId = sanitizeMermaid(to);
      lines.push(`  ${fromId}["${from}"] --> ${toId}["${to}"]`);
    }
  }
  lines.push('```');
  lines.push('');

  // Laravel-specific sections
  if (pkg.laravelMeta) {
    const lm = pkg.laravelMeta;

    if (lm.routeMap && lm.routeMap.length > 0) {
      lines.push('## Route Map');
      lines.push('');
      lines.push('| Method | URI | Controller | Middleware | Route Name |');
      lines.push('|--------|-----|------------|------------|------------|');
      for (const r of lm.routeMap) {
        lines.push(`| ${r.method || ''} | ${r.uri || ''} | ${r.controller || ''}${r.action ? '@' + r.action : ''} | ${r.middleware || ''} | ${r.name || ''} |`);
      }
      lines.push('');
    }

    if (lm.relationships && lm.relationships.length > 0) {
      lines.push('## Model Relationships');
      lines.push('');
      lines.push('```mermaid');
      lines.push('erDiagram');
      for (const rel of lm.relationships) {
        const from = rel.fromModel || 'Model';
        const to = rel.relatedModel || 'Related';
        const label = rel.type || 'relates';
        lines.push(`  ${from} ||--o{ ${to} : "${label}"`);
      }
      lines.push('```');
      lines.push('');
    }

    if (lm.providerBindings && lm.providerBindings.length > 0) {
      lines.push('## Service Provider Bindings');
      lines.push('');
      for (const pb of lm.providerBindings) {
        lines.push(`### ${pb.provider}`);
        for (const b of pb.bindings) {
          lines.push(`- \`${b}\``);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function sanitizeMermaid(str) {
  return str.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+/, '').slice(0, 40) || 'node';
}

module.exports = { render };
