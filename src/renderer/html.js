'use strict';

const { writeFileSync, mkdirSync } = require('fs');
const path = require('path');
const { marked } = require('marked');

/**
 * HTML renderer — single self-contained index.html with lunr.js search.
 */
async function render(fragments, pkg, outputDir, config) {
  mkdirSync(outputDir, { recursive: true });

  const nav = fragments.map(f => {
    const id = f.relativePath.replace(/[^a-zA-Z0-9]/g, '-');
    return `<li><a href="#${id}">${f.relativePath}</a></li>`;
  }).join('\n');

  const content = fragments.map(f => {
    const id = f.relativePath.replace(/[^a-zA-Z0-9]/g, '-');
    const html = marked(f.content || '');
    return `<section id="${id}"><h2>${f.relativePath}</h2>${html}</section>`;
  }).join('\n');

  const lunrDocs = fragments.map(f => ({
    id: f.relativePath,
    title: f.relativePath,
    body: (f.content || '').replace(/[#`*_\[\]()]/g, ' '),
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pkg.meta && pkg.meta.name || 'Legacyver'} Documentation</title>
<script src="https://unpkg.com/lunr/lunr.js"></script>
<style>
  body { font-family: system-ui, sans-serif; display: flex; margin: 0; }
  nav { width: 250px; min-height: 100vh; background: #1e1e2e; color: #cdd6f4; padding: 1rem; overflow-y: auto; position: sticky; top: 0; }
  nav ul { list-style: none; padding: 0; }
  nav a { color: #89b4fa; text-decoration: none; font-size: 0.85rem; }
  nav a:hover { color: #cba6f7; }
  main { flex: 1; padding: 2rem; max-width: 900px; }
  pre { background: #1e1e2e; color: #cdd6f4; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { background: #313244; padding: 2px 4px; border-radius: 3px; }
  #search { width: 100%; padding: 0.5rem; margin-bottom: 1rem; background: #313244; border: none; color: #cdd6f4; border-radius: 4px; }
  #search-results { background: #313244; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; display: none; }
</style>
</head>
<body>
<nav>
  <input id="search" type="search" placeholder="Search..." />
  <div id="search-results"></div>
  <ul>${nav}</ul>
</nav>
<main>${content}</main>
<script>
const docs = ${JSON.stringify(lunrDocs)};
const idx = lunr(function() {
  this.field('title'); this.field('body');
  docs.forEach(d => this.add(d));
});
document.getElementById('search').addEventListener('input', function() {
  const q = this.value.trim();
  const res = document.getElementById('search-results');
  if (!q) { res.style.display = 'none'; return; }
  try {
    const results = idx.search(q);
    res.innerHTML = results.map(r => '<div><a href="#' + r.ref.replace(/[^a-zA-Z0-9]/g,'-') + '">' + r.ref + '</a></div>').join('') || '<div>No results</div>';
    res.style.display = 'block';
  } catch(e) { res.style.display = 'none'; }
});
</script>
</body>
</html>`;

  writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
}

module.exports = { render };
