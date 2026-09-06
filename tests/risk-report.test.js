'use strict';
/**
 * BUG-09: risk report must load fresh data for the current location
 * (no fixed-delay race with App.init) and label data provenance honestly.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal, loadInlinePageScript } = require('./helpers');

function parisWeatherJson() {
  return {
    id: 2988507, name: 'Paris',
    coord: { lat: 48.85, lon: 2.35 },
    sys: { country: 'FR' },
    weather: [{ main: 'Clouds', description: 'overcast clouds', icon: '04d' }],
    main: { temp: 18.2, feels_like: 17, temp_min: 15, temp_max: 20, humidity: 75, pressure: 1005 },
    visibility: 9000,
    wind: { speed: 4, deg: 180 },
    clouds: { all: 90 },
  };
}

function loadPage(fetchImpl) {
  const sandbox = createSandbox({
    fetch: fetchImpl,
    setTimeout: (fn) => { fn(); return 0; },
    setInterval: () => 0,
  });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/api.js');
  loadModule(sandbox, 'js/risk-engine.js');
  loadInlinePageScript(sandbox, 'risk-report.html');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  sandbox.Storage = getGlobal(sandbox, 'Storage');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  return sandbox;
}

const staleCache = {
  location: { name: 'Stale City', lat: 0, lon: 0 },
  weather: {
    temp: 10, feelsLike: 9, humidity: 80, uvIndex: 1, windSpeed: 30,
    visibility: 5, airQuality: 60, precipitation: 5, condition: 'rain',
  },
  timestamp: Date.now() - 3600000,
};

test('report uses fresh data for current location, not stale cache', async () => {
  const sandbox = loadPage(async (url) => {
    if (url.includes('/weather?')) return { ok: true, json: async () => parisWeatherJson() };
    if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
    if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 3.2 } }) };
    throw new Error('unexpected ' + url);
  });
  sandbox.Storage.set(sandbox.Storage.KEYS.CURRENT_LOCATION, { lat: 48.85, lon: 2.35 });
  sandbox.Storage.set(sandbox.Storage.KEYS.LAST_WEATHER, staleCache);
  await getGlobal(sandbox, 'initRiskReport')();
  const label = sandbox.document.getElementById('reportLocation').textContent;
  assert.match(label, /Paris/);
  assert.doesNotMatch(label, /Stale City/);
  assert.match(label, /Updated/);
  assert.ok(sandbox.document.getElementById('riskCategoriesContainer').innerHTML.length > 100);
});

test('report falls back to labelled cached data when fetch fails', async () => {
  const sandbox = loadPage(async () => { throw new Error('network down'); });
  sandbox.Storage.set(sandbox.Storage.KEYS.CURRENT_LOCATION, { lat: 48.85, lon: 2.35 });
  sandbox.Storage.set(sandbox.Storage.KEYS.LAST_WEATHER, staleCache);
  await getGlobal(sandbox, 'initRiskReport')();
  const label = sandbox.document.getElementById('reportLocation').textContent;
  assert.match(label, /Stale City/);
  assert.match(label, /Cached/);
});

test('report shows demo label with no location and no cache', async () => {
  const sandbox = loadPage(async () => { throw new Error('must not fetch'); });
  await getGlobal(sandbox, 'initRiskReport')();
  const label = sandbox.document.getElementById('reportLocation').textContent;
  assert.match(label, /Demo data/);
});
