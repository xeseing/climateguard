'use strict';
/**
 * BUG-08: search must work keyless/offline via the bundled city DB,
 * and only hit the network when a key is configured.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadAPI(fetchImpl) {
  const sandbox = createSandbox({ fetch: fetchImpl });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/api.js');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  return sandbox;
}

test('keyless search finds bundled cities without fetching', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => [] }; });
  const res = await sandbox.WeatherAPI.searchLocations('Paris');
  assert.equal(calls, 0);
  assert.ok(res.length >= 1);
  assert.equal(res[0].name, 'Paris');
  assert.equal(typeof res[0].lat, 'number');
});

test('keyless search matches region/country and is case-insensitive', async () => {
  const sandbox = loadAPI(async () => { throw new Error('must not fetch'); });
  const byRegion = await sandbox.WeatherAPI.searchLocations('maharashtra');
  assert.ok(byRegion.some((c) => c.name === 'Mumbai' || c.name === 'Pune'));
  const byCountry = await sandbox.WeatherAPI.searchLocations('SG');
  assert.ok(byCountry.some((c) => c.name === 'Singapore'));
});

test('keyless search returns [] for unknown places, still without fetching', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => [] }; });
  const res = await sandbox.WeatherAPI.searchLocations('Xyzqqp Not A City');
  assert.deepStrictEqual(Array.from(res), []);
  assert.equal(calls, 0);
});

test('short queries return [] without fetching', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => [] }; });
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  assert.deepStrictEqual(Array.from(await sandbox.WeatherAPI.searchLocations('x')), []);
  assert.equal(calls, 0);
});
