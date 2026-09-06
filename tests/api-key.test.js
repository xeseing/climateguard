'use strict';
/**
 * BUG-05: no API secret may be embedded in the repo; the key must be
 * injectable at runtime (localStorage override or window global).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadAPI(fetchImpl) {
  const sandbox = createSandbox({ fetch: fetchImpl });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/api.js');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  return sandbox;
}

test('config.js embeds no API secret', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
  assert.doesNotMatch(src, /['"][0-9a-f]{16,}['"]/i);
});

test('API key resolves from localStorage override', async () => {
  let seenUrl = '';
  const sandbox = loadAPI(async (url) => {
    seenUrl = url;
    return { ok: true, json: async () => [] };
  });
  sandbox.localStorage.setItem('climateguard_api_key', 'OVERRIDE_KEY_123');
  await sandbox.WeatherAPI.searchLocations('Paris');
  assert.match(seenUrl, /OVERRIDE_KEY_123/);
});

test('API key resolves from window global when no override', async () => {
  let seenUrl = '';
  const sandbox = loadAPI(async (url) => {
    seenUrl = url;
    return { ok: true, json: async () => [] };
  });
  sandbox.window.CLIMATEGUARD_API_KEY = 'WINDOW_KEY_456';
  await sandbox.WeatherAPI.searchLocations('Paris');
  assert.match(seenUrl, /WINDOW_KEY_456/);
});

test('no fetch happens when no key is configured anywhere', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => [] }; });
  const res = await sandbox.WeatherAPI.searchLocations('Xyzqqp Not A City');
  assert.deepStrictEqual(Array.from(res), []);
  assert.equal(calls, 0);
});
