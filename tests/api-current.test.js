'use strict';
/**
 * BUG-03: UV must come from a working endpoint (Open-Meteo, keyless),
 * never the retired /data/2.5/uvi — and never a silent fabricated value.
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
const aqJson = { list: [{ main: { aqi: 2 } }] };

function router({ uvJson = { current: { uv_index: 7.4 } }, uvFails = false } = {}) {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('open-meteo.com')) {
      if (uvFails) throw new Error('uv down');
      return { ok: true, json: async () => uvJson };
    }
    if (url.includes('air_pollution')) return { ok: true, json: async () => aqJson };
    if (url.includes('/weather?')) return { ok: true, json: async () => weatherJson };
    throw new Error('unexpected URL: ' + url);
  };
  return { fetchImpl, urls };
}

test('fetches UV from Open-Meteo and rounds the value', async () => {
  const { fetchImpl, urls } = router();
  const sandbox = loadAPI(fetchImpl);
  const data = await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  assert.equal(data.weather.uvIndex, 7);
  assert.equal(data.weather.temp, 31);
  assert.equal(data.weather.airQuality, 50); // aqi 2 * 25
  assert.ok(urls.some((u) => u.includes('open-meteo.com')), 'should call open-meteo');
  assert.ok(!urls.some((u) => u.includes('/uvi')), 'must NOT call retired /uvi endpoint');
});

test('uvIndex is null (unknown) when UV source fails — never fabricated', async () => {
  const { fetchImpl } = router({ uvFails: true });
  const sandbox = loadAPI(fetchImpl);
  const data = await sandbox.WeatherAPI.getCurrentWeather(19.07, 72.87);
  assert.equal(data.weather.uvIndex, null);
});
