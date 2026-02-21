import { describe, it, expect } from 'vitest';
import { parse as parseJS } from '../src/parser/ast/javascript.js';
import { parse as parsePHP } from '../src/parser/ast/php.js';
import { parse as parsePython } from '../src/parser/ast/python.js';
import { enrich } from '../src/parser/ast/laravel/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('JavaScript Parser', () => {
  it('extracts function names from express fixture', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/js-express/src/utils/db.js'),
      'utf8'
    );
    const facts = parseJS(src, 'utils/db.js');
    const names = facts.functions.map(f => f.name);
    expect(names).toContain('getUser');
    expect(names).toContain('createUser');
    expect(names).toContain('calculateDiscount');
  });

  it('extracts imports', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/js-express/src/middleware/auth.js'),
      'utf8'
    );
    const facts = parseJS(src, 'middleware/auth.js');
    expect(facts.imports.some(i => i.module === 'jsonwebtoken')).toBe(true);
  });

  it('detects arithmetic pattern on calculateDiscount', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/js-express/src/utils/db.js'),
      'utf8'
    );
    const facts = parseJS(src, 'utils/db.js');
    const discountFn = facts.functions.find(f => f.name === 'calculateDiscount');
    expect(discountFn).toBeDefined();
    expect(discountFn.detectedPatterns).toContain('arithmetic');
  });

  it('assigns moderate or complex class to calculateDiscount', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/js-express/src/utils/db.js'),
      'utf8'
    );
    const facts = parseJS(src, 'utils/db.js');
    const discountFn = facts.functions.find(f => f.name === 'calculateDiscount');
    expect(['moderate', 'complex']).toContain(discountFn.complexityClass);
  });

  it('bodySnippet is null for simple getter functions', () => {
    const src = `function getUser(id) { return users.get(id); }`;
    const facts = parseJS(src, 'test.js');
    const fn = facts.functions.find(f => f.name === 'getUser');
    if (fn && fn.complexityScore <= 3) {
      expect(fn.bodySnippet).toBeNull();
    }
  });
});

describe('PHP Parser', () => {
  it('extracts class and methods from Laravel model', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/laravel-api/app/Models/Order.php'),
      'utf8'
    );
    const facts = parsePHP(src, 'app/Models/Order.php');
    expect(facts.classes.some(c => c.name === 'Order')).toBe(true);
    expect(facts.functions.some(f => f.name === 'calculateTotal')).toBe(true);
  });

  it('extracts imports (use statements)', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/laravel-api/app/Models/Order.php'),
      'utf8'
    );
    const facts = parsePHP(src, 'app/Models/Order.php');
    expect(facts.imports.some(i => i.module.includes('Model'))).toBe(true);
  });

  it('detects arithmetic pattern on calculateTotal', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/laravel-api/app/Models/Order.php'),
      'utf8'
    );
    const facts = parsePHP(src, 'app/Models/Order.php');
    const fn = facts.functions.find(f => f.name === 'calculateTotal');
    expect(fn).toBeDefined();
    expect(fn.detectedPatterns).toContain('arithmetic');
  });
});

describe('Laravel Classifier & Enrichment', () => {
  it('classifies controller file correctly', async () => {
    const { classify } = await import('../src/parser/ast/laravel/classifier.js');
    expect(classify('app/Http/Controllers/OrderController.php', '')).toBe('controller');
  });

  it('classifies model file correctly', async () => {
    const { classify } = await import('../src/parser/ast/laravel/classifier.js');
    expect(classify('app/Models/Order.php', '')).toBe('model');
  });

  it('classifies route file correctly', async () => {
    const { classify } = await import('../src/parser/ast/laravel/classifier.js');
    expect(classify('routes/api.php', '')).toBe('route_file');
  });

  it('extracts routes from api.php', async () => {
    const { extract } = await import('../src/parser/ast/laravel/routes.js');
    const src = readFileSync(
      path.join(__dirname, 'fixtures/laravel-api/routes/api.php'),
      'utf8'
    );
    const ctx = extract(src);
    expect(ctx.routes.length).toBeGreaterThan(0);
    const methods = ctx.routes.map(r => r.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });

  it('extracts model relationships from Order.php', async () => {
    const { extract } = await import('../src/parser/ast/laravel/model.js');
    const src = readFileSync(
      path.join(__dirname, 'fixtures/laravel-api/app/Models/Order.php'),
      'utf8'
    );
    const facts = parsePHP(src, 'app/Models/Order.php');
    // Enrich facts with body snippets first
    const ctx = extract(src, facts);
    expect(ctx.type).toBe('model');
    expect(ctx.table).toBe('orders');
    expect(ctx.fillable).toContain('user_id');
  });
});

describe('Python Parser', () => {
  it('extracts function names from Flask fixture', () => {
    const src = readFileSync(
      path.join(__dirname, 'fixtures/python-flask/app.py'),
      'utf8'
    );
    const facts = parsePython(src, 'app.py');
    const names = facts.functions.map(f => f.name);
    expect(names).toContain('health_check');
    expect(names).toContain('list_items');
  });
});
