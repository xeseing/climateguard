'use strict';
/**
 * Phase 3 Step 1: unit conversions, persistence, and display wiring.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadUnits(extra = {}) {
  const sandbox = createSandbox(extra);
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  sandbox.Units = getGlobal(sandbox, 'Units');
  sandbox.Storage = getGlobal(sandbox, 'Storage');
  return sandbox;
}

test('celsius is default: passthrough + °C symbol', () => {
  const { Units } = loadUnits();
  assert.equal(Units.get(), 'celsius');
  assert.equal(Units.display(28), 28);
  assert.equal(Units.symbol(), '°C');
  assert.equal(Units.format(28), '28°C');
});

test('fahrenheit converts with rounding + °F symbol', () => {
  const sandbox = loadUnits();
  sandbox.Units.set('fahrenheit');
  assert.equal(sandbox.Units.display(28), 82);
  assert.equal(sandbox.Units.display(22.5), 73);
  assert.equal(sandbox.Units.display(-10), 14);
  assert.equal(sandbox.Units.symbol(), '°F');
  assert.equal(sandbox.Units.format(28), '82°F');
});

test('nullish and non-numeric inputs yield unknown markers', () => {
  const { Units } = loadUnits();
  assert.equal(Units.display(null), null);
  assert.equal(Units.display(undefined), null);
  assert.equal(Units.display(NaN), null);
  assert.equal(Units.display('abc'), null);
  assert.equal(Units.format(null), '—');
  assert.equal(Units.format(undefined), '—');
});

test('set() persists via Storage and get() reads back', () => {
  const sandbox = loadUnits();
  sandbox.Units.set('fahrenheit');
  assert.equal(sandbox.Storage.getSettings().units, 'fahrenheit');
  assert.equal(sandbox.Units.get(), 'fahrenheit');
  sandbox.Units.set('celsius');
  assert.equal(sandbox.Storage.getSettings().units, 'celsius');
});

test('invalid unit values fall back to celsius', () => {
  const sandbox = loadUnits();
  sandbox.Units.set('kelvin');
  assert.equal(sandbox.Units.get(), 'celsius');
  sandbox.Storage.updateSettings({ units: 'rankine' });
  assert.equal(sandbox.Units.get(), 'celsius');
});

function loadDisplay() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/ui.js');
  sandbox.Units = getGlobal(sandbox, 'Units');
  sandbox.UI = getGlobal(sandbox, 'UI');
  return sandbox;
}

const sampleWeather = () => ({
  location: { name: 'Test City' },
  weather: {
    temp: 28, feelsLike: 30, tempMin: 21, tempMax: 32, humidity: 65,
    pressure: 1013, visibility: 10, uvIndex: 6, airQuality: 42,
    windSpeed: 18, windDirection: 'E', windDegree: 90, precipitation: 12,
    condition: 'rain', conditionText: 'Light rain',
  },
});

test('hero block converts to fahrenheit', () => {
  const sandbox = loadDisplay();
  sandbox.Units.set('fahrenheit');
  sandbox.UI.updateWeatherDisplay(sampleWeather());
  const doc = sandbox.document;
  assert.equal(doc.getElementById('temperature').textContent, '82°F');
  assert.equal(doc.getElementById('tempHigh').textContent, 'H: 90°F');
  assert.equal(doc.getElementById('tempLow').textContent, 'L: 70°F');
  assert.equal(doc.getElementById('feelsLikeValue').textContent, '86°F');
  assert.equal(doc.getElementById('dewPointValue').textContent, '70°F');
});

test('hero block shows explicit °C symbol by default', () => {
  const sandbox = loadDisplay();
  sandbox.UI.updateWeatherDisplay(sampleWeather());
  assert.equal(sandbox.document.getElementById('temperature').textContent, '28°C');
});

test('hourly strip + list builders convert temps', () => {
  const sandbox = loadDisplay();
  sandbox.Units.set('fahrenheit');
  sandbox.UI.renderHourlyForecast([{ timeFormatted: '3 PM', temp: 28, conditionIcon: 'fa-sun' }]);
  assert.match(sandbox.document.getElementById('hourlyContainer').innerHTML, /82°F/);
  const listHtml = sandbox.UI.buildHourlyListHTML([{ timeFormatted: '3 PM', temp: 30 }]);
  assert.match(listHtml, /86°F/);
  const weekHtml = sandbox.UI.buildWeeklyListHTML([{ dayName: 'Today', tempHigh: 32, tempLow: 21 }]);
  assert.match(weekHtml, /90°F \/ 70°F/);
});

test('popular destinations convert temps', async () => {
  const sandbox = createSandbox({
    fetch: async (url) => {
      if (url.includes('/weather?')) {
        return {
          ok: true,
          json: async () => ({
            id: 1, name: 'Live', coord: { lat: 0, lon: 0 }, sys: { country: 'XX' },
            weather: [{ main: 'Clear', description: 'clear', icon: '01d' }],
            main: { temp: 28, feels_like: 28, temp_min: 26, temp_max: 30, humidity: 50, pressure: 1012 },
            visibility: 10000, wind: { speed: 3, deg: 90 }, clouds: { all: 5 },
          }),
        };
      }
      if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
      if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 4 } }) };
      throw new Error('unexpected ' + url);
    },
  });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/api.js');
  loadModule(sandbox, 'js/risk-engine.js');
  loadModule(sandbox, 'js/ui.js');
  loadModule(sandbox, 'js/app.js');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  getGlobal(sandbox, 'Units').set('fahrenheit');
  await getGlobal(sandbox, 'App').renderPopularDestinations();
  assert.match(sandbox.document.getElementById('popularDestinations').innerHTML, /82°F/);
});

test('set() dispatches a unitschange event', () => {
  const seen = [];
  const sandbox = loadUnits({
    CustomEvent: class FakeEvent {
      constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; }
    },
  });
  sandbox.document.dispatchEvent = (e) => seen.push(e);
  sandbox.Units.set('fahrenheit');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, 'unitschange');
  assert.equal(seen[0].detail.units, 'fahrenheit');
});
