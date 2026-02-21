import { describe, it, expect } from 'vitest';
import { parse as parsePHP } from '../src/parser/ast/php.js';
import { enrich } from '../src/parser/ast/laravel/index.js';
import { classify } from '../src/parser/ast/laravel/classifier.js';
import { extract as extractRoutes } from '../src/parser/ast/laravel/routes.js';
import { extract as extractModel } from '../src/parser/ast/laravel/model.js';
import { extract as extractController } from '../src/parser/ast/laravel/controller.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, 'fixtures/laravel-api');

// ── Classifier ───────────────────────────────────────────────────────────────
describe('Laravel Classifier', () => {
  it('classifies controller by path', () => {
    expect(classify('app/Http/Controllers/OrderController.php', '')).toBe('controller');
  });

  it('classifies model by path', () => {
    expect(classify('app/Models/Order.php', '')).toBe('model');
  });

  it('classifies route file by path', () => {
    expect(classify('routes/api.php', '')).toBe('route_file');
  });

  it('classifies middleware by path', () => {
    expect(classify('app/Http/Middleware/AuthenticateApi.php', '')).toBe('middleware');
  });

  it('classifies provider by path', () => {
    expect(classify('app/Providers/AppServiceProvider.php', '')).toBe('provider');
  });

  it('falls back to source inspection for controller', () => {
    expect(classify('some/path/Foo.php', 'class Foo extends Controller {')).toBe('controller');
  });

  it('falls back to source inspection for model', () => {
    expect(classify('some/path/Bar.php', 'class Bar extends Model {')).toBe('model');
  });
});

// ── Routes Extractor ─────────────────────────────────────────────────────────
describe('Laravel Routes Extractor', () => {
  const src = readFileSync(path.join(fixtureDir, 'routes/api.php'), 'utf8');
  const ctx = extractRoutes(src);

  it('returns type route_file', () => {
    expect(ctx.type).toBe('route_file');
  });

  it('extracts at least 6 routes', () => {
    expect(ctx.routes.length).toBeGreaterThanOrEqual(6);
  });

  it('contains GET and POST methods', () => {
    const methods = ctx.routes.map(r => r.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
  });

  it('contains DELETE and PUT methods', () => {
    const methods = ctx.routes.map(r => r.method);
    expect(methods).toContain('DELETE');
    expect(methods).toContain('PUT');
  });

  it('extracts /orders URI', () => {
    expect(ctx.routes.some(r => r.uri === '/orders')).toBe(true);
  });

  it('extracts OrderController reference', () => {
    expect(ctx.routes.some(r => r.controller === 'OrderController')).toBe(true);
  });

  it('extracts route names', () => {
    expect(ctx.routes.some(r => r.name === 'orders.index')).toBe(true);
  });
});

// ── Model Extractor ───────────────────────────────────────────────────────────
describe('Laravel Model Extractor', () => {
  const src = readFileSync(path.join(fixtureDir, 'app/Models/Order.php'), 'utf8');
  const facts = parsePHP(src, 'app/Models/Order.php');
  const ctx = extractModel(src, facts);

  it('returns type model', () => {
    expect(ctx.type).toBe('model');
  });

  it('extracts $table name as orders', () => {
    expect(ctx.table).toBe('orders');
  });

  it('extracts fillable fields including user_id', () => {
    expect(ctx.fillable).toContain('user_id');
  });

  it('extracts fillable fields including status', () => {
    expect(ctx.fillable).toContain('status');
  });
});

// ── Controller Extractor ──────────────────────────────────────────────────────
describe('Laravel Controller Extractor', () => {
  const src = readFileSync(
    path.join(fixtureDir, 'app/Http/Controllers/OrderController.php'),
    'utf8'
  );
  const facts = parsePHP(src, 'app/Http/Controllers/OrderController.php');
  const ctx = extractController(src, facts);

  it('returns type controller', () => {
    expect(ctx.type).toBe('controller');
  });

  it('extracts action methods', () => {
    // controller extractor returns routeActions: string[]
    expect(ctx.routeActions).toBeDefined();
    expect(ctx.routeActions).toContain('index');
    expect(ctx.routeActions).toContain('store');
  });
});

// ── Full Enrichment Pipeline ──────────────────────────────────────────────────
describe('Laravel Enrichment Pipeline', () => {
  it('enriches Order model with laravelContext', () => {
    const src = readFileSync(path.join(fixtureDir, 'app/Models/Order.php'), 'utf8');
    const facts = parsePHP(src, 'app/Models/Order.php');
    const enriched = enrich(src, facts);
    expect(enriched.laravelContext).toBeDefined();
    expect(enriched.laravelContext.type).toBe('model');
  });

  it('enriches OrderController with laravelContext', () => {
    const src = readFileSync(
      path.join(fixtureDir, 'app/Http/Controllers/OrderController.php'),
      'utf8'
    );
    const facts = parsePHP(src, 'app/Http/Controllers/OrderController.php');
    const enriched = enrich(src, facts);
    expect(enriched.laravelContext).toBeDefined();
    expect(enriched.laravelContext.type).toBe('controller');
  });

  it('enriches routes/api.php with laravelContext', () => {
    const src = readFileSync(path.join(fixtureDir, 'routes/api.php'), 'utf8');
    const facts = parsePHP(src, 'routes/api.php');
    const enriched = enrich(src, facts);
    expect(enriched.laravelContext).toBeDefined();
    expect(enriched.laravelContext.type).toBe('route_file');
    expect(enriched.laravelContext.routes.length).toBeGreaterThan(0);
  });
});
