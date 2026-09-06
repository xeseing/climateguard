'use strict';
/**
 * BUG-01: hourly/weekly list rendering + HTML escaping (XSS-safe builders).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadUI() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/ui.js');
  sandbox.UI = getGlobal(sandbox, 'UI');
  return sandbox;
}

const sampleHours = () => ([
  { timeFormatted: '12:00 PM', temp: 28, conditionIcon: 'fa-sun', precipitation: 5, isDay: true },
  { timeFormatted: '1:00 PM', temp: 30, conditionIcon: 'fa-sun', precipitation: 0, isDay: true },
  { timeFormatted: '<img src=x onerror=alert(1)>', temp: 29, conditionIcon: 'fa-cloud', precipitation: 10, isDay: true },
]);

const sampleDays = () => ([
  { dayName: 'Today', conditionText: 'Sunny', conditionIcon: 'fa-sun', tempHigh: 32, tempLow: 21, precipitation: 5, humidity: 60, uvIndex: 6 },
  { dayName: 'Tuesday<script>alert(1)</script>', conditionText: 'Rainy', conditionIcon: 'fa-cloud-rain', tempHigh: 25, tempLow: 18, precipitation: 80, humidity: 90, uvIndex: 2 },
]);

test('escapeHtml neutralizes markup and handles non-strings', () => {
  const { UI } = loadUI();
  assert.equal(UI.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(UI.escapeHtml('a&b"c\'d'), 'a&amp;b&quot;c&#39;d');
  assert.equal(UI.escapeHtml(28), '28');
  assert.equal(UI.escapeHtml(null), '');
  assert.equal(UI.escapeHtml(undefined), '');
});

test('buildHourlyListHTML renders rows and escapes content', () => {
  const { UI } = loadUI();
  const html = UI.buildHourlyListHTML(sampleHours());
  assert.match(html, /Now/);
  assert.match(html, /1:00 PM/);
  assert.match(html, /30°/);
  assert.match(html, /fa-sun/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});

test('buildHourlyListHTML handles empty input', () => {
  const { UI } = loadUI();
  assert.match(UI.buildHourlyListHTML([]), /empty-state/);
  assert.match(UI.buildHourlyListHTML(null), /empty-state/);
});

test('buildWeeklyListHTML renders rows and escapes content', () => {
  const { UI } = loadUI();
  const html = UI.buildWeeklyListHTML(sampleDays());
  assert.match(html, /Today/);
  assert.match(html, /32°/);
  assert.match(html, /18°/);
  assert.match(html, /fa-cloud-rain/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

test('buildWeeklyListHTML handles empty input', () => {
  const { UI } = loadUI();
  assert.match(UI.buildWeeklyListHTML([]), /empty-state/);
});

test('renderHourlyList targets #hourlyList container', () => {
  const sandbox = loadUI();
  sandbox.UI.renderHourlyList(sampleHours());
  const html = sandbox.document.getElementById('hourlyList').innerHTML;
  assert.match(html, /1:00 PM/);
});

test('renderWeeklyList targets #weeklyContainer container', () => {
  const sandbox = loadUI();
  sandbox.UI.renderWeeklyList(sampleDays());
  const html = sandbox.document.getElementById('weeklyContainer').innerHTML;
  assert.match(html, /Today/);
});
