'use strict';
/**
 * BUG-15: popular-destination weather must load in parallel —
 * 6 sequential round-trips block home-page render.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

async function renderPopular() {
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchImpl = async (url) => {
    if (url.includes('/weather?')) {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 25));
      inFlight--;
      return {
        ok: true,
        json: async () => ({
          id: 1, name: 'Live', coord: { lat: 0, lon: 0 }, sys: { country: 'XX' },
          weather: [{ main: 'Clear', description: 'clear', icon: '01d' }],
          main: { temp: 22, feels_like: 22, temp_min: 20, temp_max: 24, humidity: 50, pressure: 1012 },
          visibility: 10000, wind: { speed: 3, deg: 90 }, clouds: { all: 5 },
        }),
      };
    }
    if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
    if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 4 } }) };
    throw new Error('unexpected ' + url);
  };
  const sandbox = createSandbox({ fetch: fetchImpl });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/api.js');
  loadModule(sandbox, 'js/risk-engine.js');
  loadModule(sandbox, 'js/ui.js');
  loadModule(sandbox, 'js/app.js');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  await getGlobal(sandbox, 'App').renderPopularDestinations();
  return { maxInFlight, html: sandbox.document.getElementById('popularDestinations').innerHTML };
}

test('destination fetches run in parallel (6 in flight)', async () => {
  const { maxInFlight } = await renderPopular();
  assert.equal(maxInFlight, 6);
});

test('all 6 destination cards still render', async () => {
  const { html } = await renderPopular();
  assert.equal(html.split('<div class="popular-dest-card"').length - 1, 6);
});
