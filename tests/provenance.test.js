'use strict';
/**
 * Phase 3 Step 3: data provenance — API source tagging, source badges, wiring.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadModule, getGlobal, loadInlinePageScript } = require('./helpers');

const css = (f) => fs.readFileSync(path.join(__dirname, '..', 'css', f), 'utf8');
const page = (f) => fs.readFileSync(path.join(__dirname, '..', 'pages', f), 'utf8');

const weatherJson = {
  id: 123, name: 'Test City',
  coord: { lat: 19.07, lon: 72.87 },
  sys: { country: 'IN' },
  weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
  main: { temp: 31.4, feels_like: 33.1, temp_min: 28, temp_max: 34, humidity: 60, pressure: 1010 },
  visibility: 8000,
  wind: { speed: 5, deg: 225 },
  clouds: { all: 10 },
};

function forecastList(n) {
  const out = [];
  const base = Date.UTC(2026, 0, 5, 6, 0, 0) / 1000;
  for (let i = 0; i < n; i++) {
    out.push({
      dt: base + i * 3 * 3600,
      main: { temp: 28 + i, humidity: 60 },
      weather: [{ main: 'Clear' }],
      clouds: { all: 5 },
      sys: { pod: 'd' },
      pop: 0.1,
    });
  }
  return out;
}

function loadAPI(fetchImpl, { keyless = false } = {}) {
  const sandbox = createSandbox({ fetch: fetchImpl });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/api.js');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  if (!keyless) sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  return sandbox;
}

function liveFetch() {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('open-meteo.com')) return { ok: true, json: async () => ({ current: { uv_index: 5 } }) };
    if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
    if (url.includes('/forecast?')) return { ok: true, json: async () => ({ list: forecastList(8) }) };
    if (url.includes('/weather?')) return { ok: true, json: async () => weatherJson };
    throw new Error('unexpected URL: ' + url);
  };
  return { fetchImpl, urls };
}

test('keyless current weather is tagged demo (shared mock untouched)', async () => {
  const sandbox = loadAPI(async () => { throw new Error('must not fetch'); }, { keyless: true });
  const data = await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  assert.equal(data.source, 'demo');
  assert.equal(sandbox.WeatherAPI.getLastSource('current'), 'demo');
  assert.equal(sandbox.WeatherAPI.MOCK_DATA.current.source, undefined);
});

test('live current weather is tagged live', async () => {
  const { fetchImpl } = liveFetch();
  const sandbox = loadAPI(fetchImpl);
  const data = await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  assert.equal(data.source, 'live');
  assert.equal(data.weather.temp, 31);
  assert.equal(sandbox.WeatherAPI.getLastSource('current'), 'live');
});

test('repeat current call is served from cache and tagged cached', async () => {
  const { fetchImpl, urls } = liveFetch();
  const sandbox = loadAPI(fetchImpl);
  await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  const callsAfterFirst = urls.length;
  const data = await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  assert.equal(data.source, 'cached');
  assert.equal(sandbox.WeatherAPI.getLastSource('current'), 'cached');
  assert.equal(urls.length, callsAfterFirst);
});

test('failed fetch falls back to demo-tagged data', async () => {
  const sandbox = loadAPI(async () => { throw new Error('network down'); });
  const data = await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  assert.equal(data.source, 'demo');
  assert.equal(sandbox.WeatherAPI.getLastSource('current'), 'demo');
});

test('hourly forecast tracks live/cached via getLastSource (arrays untagged)', async () => {
  const { fetchImpl, urls } = liveFetch();
  const sandbox = loadAPI(fetchImpl);
  const hours = await sandbox.WeatherAPI.getHourlyForecast(19.07, 72.87);
  assert.ok(Array.isArray(hours) && hours.length > 0);
  assert.equal(hours.source, undefined);
  assert.equal(sandbox.WeatherAPI.getLastSource('hourly'), 'live');
  const n = urls.length;
  await sandbox.WeatherAPI.getHourlyForecast(19.07, 72.87);
  assert.equal(sandbox.WeatherAPI.getLastSource('hourly'), 'cached');
  assert.equal(urls.length, n);
});

test('keyless weekly forecast reports demo source', async () => {
  const sandbox = loadAPI(async () => { throw new Error('must not fetch'); }, { keyless: true });
  const days = await sandbox.WeatherAPI.getWeeklyForecast(19.07, 72.87);
  assert.ok(Array.isArray(days) && days.length > 0);
  assert.equal(sandbox.WeatherAPI.getLastSource('weekly'), 'demo');
});

function loadUI() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/ui.js');
  sandbox.UI = getGlobal(sandbox, 'UI');
  return sandbox;
}

test('sourceBadge renders variant classes; unknown input defaults to demo, escaped', () => {
  const { UI } = loadUI();
  assert.match(UI.sourceBadge('live'), /source-badge--live/);
  assert.match(UI.sourceBadge('live'), />Live</);
  assert.match(UI.sourceBadge('cached'), /source-badge--cached/);
  assert.match(UI.sourceBadge('demo'), /source-badge--demo/);
  assert.match(UI.sourceBadge(null), /source-badge--demo/);
  assert.match(UI.sourceBadge('bogus'), /source-badge--demo/);
  const evil = UI.sourceBadge('<script>alert(1)</script>');
  assert.doesNotMatch(evil, /<script>/);
});

test('setSourceBadge writes the badge into the slot', () => {
  const sb = loadUI();
  sb.UI.setSourceBadge('cached');
  assert.match(sb.document.getElementById('sourceBadge').innerHTML, /source-badge--cached/);
  sb.UI.setSourceBadge('live', 'otherSlot');
  assert.match(sb.document.getElementById('otherSlot').innerHTML, />Live</);
});

test('source-badge CSS: base, variants, light-theme overrides', () => {
  const c = css('components.css');
  assert.match(c, /\.source-badge\{/);
  assert.match(c, /\.source-badge--live/);
  assert.match(c, /\.source-badge--cached/);
  assert.match(c, /\.source-badge--demo/);
  assert.match(c, /body\.light \.source-badge/);
});

test('badge slots and inline badge calls are wired into pages', () => {
  assert.match(page('index.html'), /id="sourceBadge"/);
  assert.match(page('hourly.html'), /id="sourceBadge"/);
  assert.match(page('weekly.html'), /id="sourceBadge"/);
  assert.match(page('risk-report.html'), /setSourceBadge\(source\)/);
  assert.match(page('compare.html'), /sourceBadge\(d\.source\)/);
  assert.match(page('map.html'), /id="infoSource"/);
});

const row = (city, source) => ({
  city, source,
  weather: { temp: 28, humidity: 50, windSpeed: 10, uvIndex: 5, airQuality: 40 },
  risk: { overallScore: 20, overallLevel: { label: 'Low' } },
});

test('compare rows carry per-city source badges', () => {
  const sandbox = createSandbox({ Chart: function () {} });
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/ui.js']) loadModule(sandbox, m);
  loadInlinePageScript(sandbox, 'compare.html');
  getGlobal(sandbox, 'renderComparison')([row('A', 'live'), row('B', 'demo')]);
  const html = sandbox.document.getElementById('compareTable').innerHTML;
  assert.match(html, /source-badge--live/);
  assert.match(html, /source-badge--demo/);
});

test('popular destination cards carry source badges', async () => {
  const { fetchImpl } = liveFetch();
  const sandbox = createSandbox({ fetch: fetchImpl });
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/api.js', 'js/risk-engine.js', 'js/ui.js', 'js/app.js']) {
    loadModule(sandbox, m);
  }
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  await getGlobal(sandbox, 'App').renderPopularDestinations();
  const html = sandbox.document.getElementById('popularDestinations').innerHTML;
  assert.match(html, /source-badge--live/);
});

test('risk report shows a Live badge for fresh data', async () => {
  const sandbox = createSandbox({
    fetch: async (url) => {
      if (url.includes('/weather?')) return { ok: true, json: async () => weatherJson };
      if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
      if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 3 } }) };
      throw new Error('unexpected ' + url);
    },
    setTimeout: (fn) => { fn(); return 0; },
    setInterval: () => 0,
  });
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/ui.js', 'js/api.js', 'js/risk-engine.js']) {
    loadModule(sandbox, m);
  }
  loadInlinePageScript(sandbox, 'risk-report.html');
  const Storage = getGlobal(sandbox, 'Storage');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  Storage.set(Storage.KEYS.CURRENT_LOCATION, { lat: 19.07, lon: 72.87 });
  await getGlobal(sandbox, 'initRiskReport')();
  assert.match(sandbox.document.getElementById('sourceBadge').innerHTML, /source-badge--live/);
});
