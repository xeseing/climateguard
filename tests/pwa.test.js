'use strict';
/**
 * Phase 3 Step 4: PWA manifest, icons, service worker strategies, registration.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

const root = path.join(__dirname, '..');
const page = (f) => fs.readFileSync(path.join(root, 'pages', f), 'utf8');
const PAGES = fs.readdirSync(path.join(root, 'pages')).filter((f) => f.endsWith('.html'));

/* ─── manifest + icons ─────────────────────────────────────── */

function pngDims(file) {
  const buf = fs.readFileSync(file);
  assert.deepEqual(Array.from(buf.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

test('manifest.json is valid with required installability fields', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.ok(m.name && m.short_name);
  assert.equal(m.start_url, 'pages/index.html');
  assert.equal(m.display, 'standalone');
  assert.equal(m.theme_color, '#0a0a12');
  assert.ok(m.background_color);
  assert.ok(Array.isArray(m.icons) && m.icons.length >= 2);
  const sizes = m.icons.map((i) => i.sizes).join(' ');
  assert.match(sizes, /192x192/);
  assert.match(sizes, /512x512/);
});

test('manifest icons exist on disk with matching PNG dimensions', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  for (const icon of m.icons) {
    if (!icon.src.endsWith('.png')) continue;
    const file = path.join(root, icon.src);
    assert.ok(fs.existsSync(file), `missing ${icon.src}`);
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngDims(file), { w, h });
  }
});

test('all pages (and root landing) link the manifest', () => {
  for (const f of PAGES) assert.match(page(f), /rel="manifest"/, f);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /rel="manifest"/);
});

/* ─── service worker harness ───────────────────────────────── */

function makeRes(body) {
  const r = { ok: true, status: 200, body };
  r.clone = () => makeRes(body);
  return r;
}

// Cache keys: same-origin requests match by pathname (mirrors Cache normalization
// against the relative precache list); cross-origin by full URL.
function keyOf(req) {
  const raw = typeof req === 'string' ? req : req.url;
  if (typeof req === 'string') return raw.replace(/^\.\//, '').replace(/^\//, '');
  const u = new URL(raw);
  const sameOrigin = u.hostname === 'app.test' || u.hostname.endsWith('.app.test');
  return sameOrigin ? u.pathname.replace(/^\//, '') : raw;
}

function loadSW(fetchImpl) {
  const listeners = {};
  const store = new Map();
  const mkCache = (name) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name);
    return {
      async match(req) { return m.get(keyOf(req)) || null; },
      async put(req, res) { m.set(keyOf(req), res); },
      async addAll(reqs) { for (const r of reqs) m.set(keyOf(r), makeRes('precached:' + keyOf(r))); },
    };
  };
  const fakeCaches = {
    async open(name) { return mkCache(name); },
    async match(req) {
      for (const m of store.values()) { if (m.has(keyOf(req))) return m.get(keyOf(req)); }
      return null;
    },
    async keys() { return [...store.keys()]; },
    async delete(name) { return store.delete(name); },
  };
  const sandbox = { console, URL, caches: fakeCaches, fetch: fetchImpl };
  sandbox.self = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8'), sandbox);
  return { listeners, store, caches: fakeCaches };
}

function installFired(listeners) {
  let p;
  listeners.install[0]({ waitUntil(x) { p = Promise.resolve(x); } });
  return p;
}

function fetchFired(listeners, url, opts = {}) {
  let p;
  listeners.fetch[0]({
    request: { url, method: opts.method || 'GET', mode: opts.mode || 'cors', destination: opts.destination || '' },
    respondWith(x) { p = Promise.resolve(x); },
  });
  return p;
}

function precacheList() {
  const src = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  const body = src.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/)[1];
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('precached asset list matches files on disk', () => {
  const assets = precacheList();
  assert.ok(assets.length > 20, `expected a full shell list, got ${assets.length}`);
  for (const a of assets) assert.ok(fs.existsSync(path.join(root, a)), `missing ${a}`);
});

test('SW install precaches the static shell', async () => {
  const { listeners, store } = loadSW(async () => makeRes('net'));
  await installFired(listeners);
  assert.equal(store.size, 1);
  const shell = [...store.values()][0];
  assert.ok(shell.has('pages/index.html'));
  assert.ok(shell.has('css/base.css'));
  assert.ok(shell.has('js/app.js'));
  assert.ok(shell.has('manifest.json'));
});

test('SW activate purges old caches, keeps current ones', async () => {
  const { listeners, store, caches } = loadSW(async () => makeRes('net'));
  await installFired(listeners);
  store.set('climateguard-static-v0', new Map());
  const before = await caches.keys();
  assert.ok(before.includes('climateguard-static-v0'));
  let p;
  listeners.activate[0]({ waitUntil(x) { p = Promise.resolve(x); } });
  await p;
  const after = await caches.keys();
  assert.ok(!after.includes('climateguard-static-v0'));
  assert.equal(after.length, before.length - 1);
});

test('SW fetch: weather API is network-first and populates runtime cache', async () => {
  const { listeners, caches } = loadSW(async () => makeRes('fresh-api'));
  const res = await fetchFired(listeners, 'https://api.openweathermap.org/data/2.5/weather?lat=1&lon=2');
  assert.equal(res.body, 'fresh-api');
  const cached = await caches.match('https://api.openweathermap.org/data/2.5/weather?lat=1&lon=2');
  assert.equal(cached.body, 'fresh-api');
});

test('SW fetch: weather API falls back to cache when offline', async () => {
  let online = true;
  const { listeners } = loadSW(async () => {
    if (!online) throw new Error('offline');
    return makeRes('fresh-api');
  });
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=1&longitude=2&current=uv_index';
  assert.equal((await fetchFired(listeners, url)).body, 'fresh-api');
  online = false;
  assert.equal((await fetchFired(listeners, url)).body, 'fresh-api');
});

test('SW fetch: static assets are stale-while-revalidate', async () => {
  let hits = 0;
  const { listeners } = loadSW(async () => { hits++; return makeRes('net-css'); });
  await installFired(listeners);
  const res = await fetchFired(listeners, 'https://app.test/css/base.css');
  assert.equal(res.body, 'precached:css/base.css');
  await new Promise((r) => setTimeout(r, 20)); // allow background revalidation
  assert.equal(hits, 1);
});

test('SW fetch: offline navigation falls back to cached start page', async () => {
  const { listeners } = loadSW(async () => { throw new Error('offline'); });
  await installFired(listeners);
  const res = await fetchFired(listeners, 'https://app.test/pages/not-precached.html', { mode: 'navigate' });
  assert.equal(res.body, 'precached:pages/index.html');
});

test('SW fetch: non-GET requests are ignored', async () => {
  const { listeners } = loadSW(async () => makeRes('net'));
  const p = fetchFired(listeners, 'https://app.test/api', { method: 'POST' });
  assert.equal(p, undefined);
});

/* ─── registration ─────────────────────────────────────────── */

function loadPWA(navigatorStub, scriptSrc) {
  const sandbox = createSandbox({ navigator: navigatorStub });
  if (scriptSrc) sandbox.document.currentScript = { src: scriptSrc };
  loadModule(sandbox, 'js/pwa.js');
  sandbox.PWA = getGlobal(sandbox, 'PWA');
  return sandbox;
}

test('PWA.register registers the worker next to the script', async () => {
  let captured;
  const sandbox = loadPWA(
    { serviceWorker: { register: async (u) => { captured = u; return { scope: '/' }; } } },
    'https://x.test/climateguard/js/pwa.js'
  );
  assert.equal(await sandbox.PWA.register(), 'registered');
  assert.equal(captured, 'https://x.test/climateguard/service-worker.js');
});

test('PWA.register degrades cleanly without support or on failure', async () => {
  assert.equal(await loadPWA({}).PWA.register(), 'unsupported');
  const sandbox = loadPWA({ serviceWorker: { register: async () => { throw new Error('denied'); } } });
  assert.equal(await sandbox.PWA.register(), 'failed');
});

test('all pages load the PWA registration module', () => {
  for (const f of PAGES) assert.match(page(f), /js\/pwa\.js/, f);
});
