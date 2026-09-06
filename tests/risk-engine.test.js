'use strict';
/**
 * Baseline contract tests for RiskEngine (pure logic).
 * Locks in pre-existing behavior before Phase 2 fixes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule } = require('./helpers');

function loadRiskEngine() {
  const sandbox = createSandbox();
  const { exports } = loadModule(sandbox, 'js/risk-engine.js');
  return exports && Object.keys(exports).length ? exports : sandbox.RiskEngine;
}

const RiskEngine = loadRiskEngine();

const sampleWeather = () => ({
  location: { name: 'Test City' },
  weather: {
    temp: 28, feelsLike: 30, humidity: 65, uvIndex: 6,
    windSpeed: 18, visibility: 10, airQuality: 42,
    precipitation: 0, condition: 'partly_cloudy',
  },
});

test('analyzeRisks returns full report shape', () => {
  const r = RiskEngine.analyzeRisks(sampleWeather());
  assert.ok(r.risks.uv && r.risks.wind && r.risks.heat && r.risks.storm);
  assert.ok(r.risks.precipitation && r.risks.visibility && r.risks.airQuality);
  assert.equal(typeof r.overallScore, 'number');
  assert.ok(r.overallScore >= 0 && r.overallScore <= 100);
  assert.ok(r.overallLevel && r.overallLevel.label);
  assert.ok(Array.isArray(r.recommendations) && r.recommendations.length > 0);
  assert.ok(r.travelAdvisory && Array.isArray(r.travelAdvisory.packingList));
  assert.equal(r.location.name, 'Test City');
});

test('analyzeRisks(null) falls back to default demo data without throwing', () => {
  const r = RiskEngine.analyzeRisks(null);
  assert.ok(r && typeof r.overallScore === 'number');
});

test('extreme heat produces Extreme heat risk and high overall score', () => {
  const w = sampleWeather();
  w.weather.temp = 45; w.weather.feelsLike = 47;
  const r = RiskEngine.analyzeRisks(w);
  assert.equal(r.risks.heat.level.label, 'Extreme');
  assert.ok(r.overallScore > 40, `score=${r.overallScore}`);
});

test('calm weather produces Low overall level', () => {
  const r = RiskEngine.analyzeRisks({
    location: { name: 'Calm' },
    weather: {
      temp: 22, feelsLike: 22, humidity: 50, uvIndex: 2,
      windSpeed: 10, visibility: 15, airQuality: 20,
      precipitation: 0, condition: 'sunny',
    },
  });
  assert.equal(r.overallLevel.label, 'Low');
});

test('storm condition produces Extreme storm risk', () => {
  const w = sampleWeather();
  w.weather.condition = 'thunderstorm';
  const r = RiskEngine.analyzeRisks(w);
  assert.equal(r.risks.storm.level.label, 'Extreme');
});

test('recommendations are sorted by severity descending', () => {
  const w = sampleWeather();
  w.weather.temp = 42; w.weather.uvIndex = 10; w.weather.windSpeed = 70;
  const r = RiskEngine.analyzeRisks(w);
  const vals = Array.from(r.recommendations, (x) => x.level.value);
  const sorted = [...vals].sort((a, b) => b - a);
  assert.deepStrictEqual(vals, sorted);
});

test('generateReportData maps all categories', () => {
  const r = RiskEngine.analyzeRisks(sampleWeather());
  const d = RiskEngine.generateReportData(r);
  assert.equal(d.risks.length, 7);
  assert.ok(d.title && d.generatedAt && d.location);
});

test('renderRiskSummary renders top-4 into container', () => {
  const r = RiskEngine.analyzeRisks(sampleWeather());
  const container = { innerHTML: '' };
  RiskEngine.renderRiskSummary(container, r);
  assert.match(container.innerHTML, /fa-solid/);
  assert.doesNotThrow(() => RiskEngine.renderRiskSummary(null, r));
});
