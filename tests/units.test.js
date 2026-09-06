'use strict';
/**
 * Phase 3 Step 1: unit conversions, persistence, and display wiring.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { createSandbox, loadModule, getGlobal, loadInlinePageScript, loadPageScripts } = require('./helpers');

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

function compareRow() {
  return {
    city: 'X', region: 'R',
    weather: { temp: 28, humidity: 50, windSpeed: 10, uvIndex: 3, airQuality: 40 },
    risk: { overallScore: 10, overallLevel: { label: 'Low', color: '#22c55e' } },
  };
}

test('compare table + radar convert temps', () => {
  const charts = [];
  function FakeChart(ctx, cfg) { charts.push(cfg); }
  const sandbox = createSandbox({ Chart: FakeChart });
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/ui.js']) loadModule(sandbox, m);
  loadInlinePageScript(sandbox, 'compare.html');
  getGlobal(sandbox, 'Units').set('fahrenheit');
  getGlobal(sandbox, 'renderComparison')([compareRow(), { ...compareRow(), city: 'Y' }]);
  assert.match(sandbox.document.getElementById('compareTable').innerHTML, /82°F/);
  assert.equal(charts.length, 1);
  assert.equal(Array.from(charts[0].data.datasets[0].data)[0], 82);
});

test('trip summary + day cards convert temps', async () => {
  const sandbox = createSandbox({
    fetch: async (url) => {
      if (url.includes('/direct?')) {
        return { ok: true, json: async () => [{ name: 'Paris', state: 'Ile', country: 'FR', lat: 48.85, lon: 2.35 }] };
      }
      if (url.includes('/weather?')) {
        return {
          ok: true,
          json: async () => ({
            id: 1, name: 'Paris', coord: { lat: 48.85, lon: 2.35 }, sys: { country: 'FR' },
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
    setTimeout: (fn) => { fn(); return 0; },
  });
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/api.js', 'js/risk-engine.js', 'js/ui.js', 'js/app.js']) {
    loadModule(sandbox, m);
  }
  loadInlinePageScript(sandbox, 'trip-planner.html');
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  getGlobal(sandbox, 'Units').set('fahrenheit');
  sandbox.document.getElementById('tripDestination').value = 'Paris';
  sandbox.document.getElementById('tripStartDate').value = '2026-09-10';
  sandbox.document.getElementById('tripEndDate').value = '2026-09-11';
  const btn = sandbox.document.getElementById('analyzeBtn');
  btn.__listeners.find((l) => l.type === 'click').fn.call(btn);
  const deadline = Date.now() + 3000;
  while (!vm.runInContext('!!currentTripData', sandbox) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.ok(vm.runInContext('!!currentTripData', sandbox), 'analysis did not complete');
  assert.match(sandbox.document.getElementById('tripSummary').innerHTML, /82°F/);
  assert.match(sandbox.document.getElementById('tripDaysContainer').innerHTML, /°F/);
});

test('risk-report heat value converts, PDFs convert', () => {
  const texts = [];
  class FakePDF {
    setFillColor() {} rect() {} setTextColor() {} setFontSize() {} setFont() {}
    text(t) { texts.push(String(t)); } circle() {} addPage() {}
    splitTextToSize(t) { return [String(t)]; }
    save() {}
  }
  const sandbox = createSandbox();
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/ui.js', 'js/risk-engine.js']) {
    loadModule(sandbox, m);
  }
  loadInlinePageScript(sandbox, 'risk-report.html');
  sandbox.window.jspdf = { jsPDF: FakePDF };
  getGlobal(sandbox, 'Units').set('fahrenheit');
  const RiskEngine = getGlobal(sandbox, 'RiskEngine');
  const report = RiskEngine.analyzeRisks({
    location: { name: 'Hot' },
    weather: { temp: 35, feelsLike: 37, humidity: 40, uvIndex: 8, windSpeed: 10, visibility: 12, airQuality: 30, precipitation: 0, condition: 'sunny' },
  });
  getGlobal(sandbox, 'renderRiskCategories')(report.risks);
  assert.match(sandbox.document.getElementById('riskCategoriesContainer').innerHTML, /99°F/);
  getGlobal(sandbox, 'downloadReport')(report);
  assert.ok(texts.some((t) => t.includes('99°F')), 'risk PDF missing converted heat value');
});

test('trip PDF converts temperature', () => {
  const texts = [];
  class FakePDF {
    setFillColor() {} rect() {} setTextColor() {} setFontSize() {}
    text(t) { texts.push(String(t)); }
    save() {}
  }
  const sandbox = createSandbox();
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/ui.js', 'js/api.js', 'js/app.js']) {
    loadModule(sandbox, m);
  }
  loadInlinePageScript(sandbox, 'trip-planner.html');
  sandbox.window.jspdf = { jsPDF: FakePDF };
  getGlobal(sandbox, 'Units').set('fahrenheit');
  vm.runInContext(
    'currentTripData = {city:"X",start:"2026-01-01",end:"2026-01-02",type:"leisure",' +
    'risk:{overallScore:10,overallLevel:{label:"Low"}},weather:{weather:{temp:28}}}', sandbox);
  const btn = sandbox.document.getElementById('downloadTripBtn');
  btn.__listeners.find((l) => l.type === 'click').fn();
  assert.ok(texts.some((t) => t.includes('82°F')), 'trip PDF missing converted temp');
});

test('map markers convert temps', async () => {
  const layers = [];
  const markers = [];
  const mapObj = {
    setView() { return mapObj; }, invalidateSize() {}, locate() {}, on() {},
    removeLayer(l) { const i = layers.indexOf(l); if (i >= 0) layers.splice(i, 1); },
  };
  const L = {
    map: () => mapObj,
    tileLayer: (url, opts) => {
      const l = { url, opts, addTo() { layers.push(l); return l; }, setUrl(u) { l.url = u; } };
      return l;
    },
    marker: (latlng, opts) => {
      const m = { latlng, opts, addTo() { markers.push(m); return m; }, on() {}, bindPopup() { return m; } };
      return m;
    },
    divIcon: (opts) => opts,
    circle: (latlng, opts) => {
      const c = { latlng, opts, addTo() { layers.push(c); return c; }, bindPopup() { return c; } };
      return c;
    },
  };
  const sandbox = createSandbox({
    L,
    fetch: async (url) => {
      if (url.includes('/weather?')) {
        return {
          ok: true,
          json: async () => ({
            id: 1, name: 'Live', coord: { lat: 0, lon: 0 }, sys: { country: 'XX' },
            weather: [{ main: 'Clear', description: 'clear', icon: '01d' }],
            main: { temp: 22.5, feels_like: 23, temp_min: 20, temp_max: 25, humidity: 55, pressure: 1012 },
            visibility: 10000, wind: { speed: 5, deg: 90 }, clouds: { all: 5 },
          }),
        };
      }
      if (url.includes('air_pollution')) return { ok: true, json: async () => ({ list: [{ main: { aqi: 1 } }] }) };
      if (url.includes('open-meteo')) return { ok: true, json: async () => ({ current: { uv_index: 5 } }) };
      throw new Error('unexpected ' + url);
    },
    setTimeout: (fn) => { fn(); return 0; },
    setInterval: () => 0,
    location: { pathname: '/pages/map.html', href: '' },
  });
  sandbox.document.querySelectorAll = () => [];
  sandbox.localStorage.setItem('climateguard_api_key', 'TEST_KEY');
  sandbox.localStorage.setItem('climateguard_settings', JSON.stringify({ units: 'fahrenheit' }));
  loadPageScripts(sandbox, 'map.html');
  const deadline = Date.now() + 5000;
  while (markers.length < 30 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 25));
  }
  assert.equal(markers.length, 30);
  assert.ok(markers.every((m) => m.opts.icon.html.includes('73°F')));
});

test('settings units toggle persists and reloads', async () => {
  let reloads = 0;
  const sandbox = createSandbox({
    setTimeout: (fn) => { fn(); return 0; },
    location: { pathname: '/pages/index.html', href: '', reload: () => { reloads++; } },
  });
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/settings-handler.js');
  const { fireDOMContentLoaded } = require('./helpers');
  await fireDOMContentLoaded(sandbox);
  const toggle = sandbox.document.getElementById('unitsToggle');
  const l = toggle.__listeners.find((x) => x.type === 'change');
  assert.ok(l, 'units toggle has no change listener');
  l.fn({ target: { checked: false } });
  assert.equal(getGlobal(sandbox, 'Units').get(), 'fahrenheit');
  assert.equal(reloads, 1);
});
