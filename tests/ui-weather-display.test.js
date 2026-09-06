'use strict';
/**
 * BUG-12: live precip/compass/gauge/dew-point updates on the home cards,
 * and the precip chart must render real hourly data (never hardcoded).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function sampleData() {
  return {
    location: { name: 'Test City' },
    weather: {
      temp: 28, feelsLike: 30, tempMin: 21, tempMax: 32,
      humidity: 65, pressure: 1013, visibility: 10, uvIndex: 6,
      airQuality: 42, windSpeed: 18, windDirection: 'E', windDegree: 90,
      precipitation: 12, cloudCover: 40, isDay: true,
      condition: 'rain', conditionText: 'Light rain',
    },
  };
}

function loadUI() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/ui.js');
  sandbox.UI = getGlobal(sandbox, 'UI');
  return sandbox;
}

test('precipitation card shows live value', () => {
  const sandbox = loadUI();
  sandbox.UI.updateWeatherDisplay(sampleData());
  assert.equal(sandbox.document.getElementById('precipValue').textContent, '12 mm');
});

test('compass needle rotates to live wind degree', () => {
  const sandbox = loadUI();
  sandbox.UI.updateWeatherDisplay(sampleData());
  assert.equal(sandbox.document.getElementById('compassNeedle').style.transform, 'rotate(90deg)');
});

test('humidity and pressure gauge arcs track live values', () => {
  const sandbox = loadUI();
  sandbox.UI.updateWeatherDisplay(sampleData());
  assert.equal(sandbox.document.getElementById('humidityGaugeArc').style.strokeDashoffset, '44.1');
  assert.equal(sandbox.document.getElementById('pressureGaugeArc').style.strokeDashoffset, '56.7');
});

test('dew point is computed from temp + humidity (Magnus)', () => {
  const sandbox = loadUI();
  sandbox.UI.updateWeatherDisplay(sampleData());
  assert.equal(sandbox.document.getElementById('dewPointValue').textContent, '21°C');
});

test('precip chart renders real hourly labels + values', () => {
  const captured = [];
  function FakeChart(ctx, cfg) { captured.push(cfg); }
  const sandbox = createSandbox({ Chart: FakeChart });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/api.js');
  loadModule(sandbox, 'js/ui.js');
  loadModule(sandbox, 'js/app.js');
  const hours = [
    { timeFormatted: '3 PM', precipitation: 11 },
    { timeFormatted: '4 PM', precipitation: 22 },
    { timeFormatted: '5 PM', precipitation: 33 },
  ];
  getGlobal(sandbox, 'App').initCharts(hours);
  assert.equal(captured.length, 1);
  assert.deepStrictEqual(Array.from(captured[0].data.labels), ['3 PM', '4 PM', '5 PM']);
  assert.deepStrictEqual(Array.from(captured[0].data.datasets[0].data), [11, 22, 33]);
});

test('precip chart renders nothing without data or Chart.js', () => {
  const captured = [];
  function FakeChart(ctx, cfg) { captured.push(cfg); }
  const sandbox = createSandbox({ Chart: FakeChart });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/api.js');
  loadModule(sandbox, 'js/ui.js');
  loadModule(sandbox, 'js/app.js');
  getGlobal(sandbox, 'App').initCharts([]);
  getGlobal(sandbox, 'App').initCharts(null);
  assert.equal(captured.length, 0);
});
