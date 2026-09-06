'use strict';
/**
 * BUG-02: getWeeklyForecast must aggregate the real 5-day/3-hour forecast
 * by coordinates (with cache + mock fallback), not return random data.
 * Also covers the lat/lon guard shared with getHourlyForecast.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadAPI(fetchImpl) {
  const sandbox = createSandbox({ fetch: fetchImpl });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/api.js');
  sandbox.WeatherAPI = getGlobal(sandbox, 'WeatherAPI');
  sandbox.CONFIG = getGlobal(sandbox, 'CONFIG');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  return sandbox;
}

// Build a /forecast-style item at a UTC offset (hours) from base Monday 2026-09-07
const BASE = Date.UTC(2026, 8, 7, 6, 0, 0) / 1000; // Monday 06:00 UTC
function item(hoursOffset, temp, main = 'Clear', pop = 0, humidity = 60) {
  return {
    dt: BASE + hoursOffset * 3600,
    main: { temp, humidity },
    weather: [{ main, description: main.toLowerCase() }],
    pop,
    sys: { pod: 'd' },
  };
}
// Day 1 (Mon 06:00-21:00 UTC): 4x Clear + 2x Clouds, temps 20..27 — dominant: clear_day
// Day 2 (Tue 06:00-21:00 UTC): 4x Rain + 2x Clear, temps 18..24 — dominant: rain
function twoDayList() {
  const list = [];
  [20, 22, 24, 25, 26, 27].forEach((t, i) =>
    list.push(item(i * 3, t, i < 4 ? 'Clear' : 'Clouds', 0.1, 55)));
  [18, 19, 21, 22, 23, 24].forEach((t, i) =>
    list.push(item(24 + i * 3, t, i < 4 ? 'Rain' : 'Clear', 0.8, 85)));
  return list;
}
const okFetch = (list) => async () => ({ ok: true, json: async () => ({ list }) });

test('aggregates 3-hourly forecast into daily summaries', async () => {
  const sandbox = loadAPI(okFetch(twoDayList()));
  const days = await sandbox.WeatherAPI.getWeeklyForecast(19.07, 72.87);
  assert.equal(days.length, 2);
  assert.equal(days[0].dayName, 'Today');
  assert.equal(days[0].tempHigh, 27);
  assert.equal(days[0].tempLow, 20);
  assert.equal(days[0].condition, 'clear_day');
  assert.equal(days[0].conditionIcon, 'fa-sun');
  assert.equal(days[1].condition, 'rain');
  assert.equal(days[1].tempHigh, 24);
  assert.equal(days[1].tempLow, 18);
  assert.ok(days[0].precipitation >= 0 && days[0].precipitation <= 100);
  assert.equal(typeof days[0].humidity, 'number');
});

test('caches weekly result per coordinates', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => ({ list: twoDayList() }) }; });
  await sandbox.WeatherAPI.getWeeklyForecast(19.07, 72.87);
  await sandbox.WeatherAPI.getWeeklyForecast(19.07, 72.87);
  assert.equal(calls, 1);
  await sandbox.WeatherAPI.getWeeklyForecast(51.5, -0.12);
  assert.equal(calls, 2);
});

test('falls back to mock data when API fails', async () => {
  const sandbox = loadAPI(async () => { throw new Error('network down'); });
  const days = await sandbox.WeatherAPI.getWeeklyForecast(19.07, 72.87);
  assert.equal(days.length, 7); // generateWeekly() shape
  assert.equal(days[0].dayName, 'Today');
});

test('falls back to mock without fetching when coords/key missing', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => ({ list: [] }) }; });
  assert.equal((await sandbox.WeatherAPI.getWeeklyForecast(undefined, undefined)).length, 7);
  assert.equal((await sandbox.WeatherAPI.getWeeklyForecast(NaN, 72.87)).length, 7);
  sandbox.localStorage.removeItem('climateguard_api_key');
  assert.equal((await sandbox.WeatherAPI.getWeeklyForecast(19.07, 72.87)).length, 7);
  assert.equal(calls, 0);
});

test('getHourlyForecast does not fetch with missing coords', async () => {
  let calls = 0;
  const sandbox = loadAPI(async () => { calls++; return { ok: true, json: async () => ({ list: [] }) }; });
  const hours = await sandbox.WeatherAPI.getHourlyForecast(undefined, undefined);
  assert.equal(hours.length, 24); // generateHourly() shape
  assert.equal(calls, 0);
});
