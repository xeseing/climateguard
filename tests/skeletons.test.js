'use strict';
/**
 * Phase 3 Step 2: skeleton loaders, empty states, reduced-motion CSS.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

const css = (f) => fs.readFileSync(path.join(__dirname, '..', 'css', f), 'utf8');

function loadUI() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/ui.js');
  sandbox.UI = getGlobal(sandbox, 'UI');
  return sandbox;
}

function loadApp() {
  const sandbox = createSandbox();
  for (const m of ['js/config.js', 'js/storage.js', 'js/units.js', 'js/api.js', 'js/risk-engine.js', 'js/ui.js', 'js/app.js']) {
    loadModule(sandbox, m);
  }
  sandbox.App = getGlobal(sandbox, 'App');
  sandbox.UI = getGlobal(sandbox, 'UI');
  return sandbox;
}

const hours = () => ([
  { timeFormatted: '1:00 PM', temp: 30, conditionIcon: 'fa-sun', precipitation: 0, isDay: true },
]);
const days = () => ([
  { dayName: 'Today', conditionText: 'Sunny', conditionIcon: 'fa-sun', tempHigh: 32, tempLow: 21, precipitation: 5, humidity: 60, uvIndex: 6 },
]);

test('showSkeleton injects row placeholders and marks container busy', () => {
  const sb = loadUI();
  sb.UI.showSkeleton('hourlyList', 4);
  const el = sb.document.getElementById('hourlyList');
  assert.equal((el.innerHTML.match(/skeleton--row/g) || []).length, 4);
  assert.equal(el.getAttribute('aria-busy'), 'true');
});

test('showSkeleton defaults to 3 rows and supports card variant + element arg', () => {
  const sb = loadUI();
  sb.UI.showSkeleton('a');
  assert.equal((sb.document.getElementById('a').innerHTML.match(/skeleton--row/g) || []).length, 3);
  sb.UI.showSkeleton(sb.document.getElementById('b'), 2, 'card');
  assert.match(sb.document.getElementById('b').innerHTML, /skeleton--card/);
});

test('renderHourlyList replaces skeleton and clears busy flag', () => {
  const sb = loadUI();
  sb.UI.showSkeleton('hourlyList', 4);
  sb.UI.renderHourlyList(hours());
  const el = sb.document.getElementById('hourlyList');
  assert.doesNotMatch(el.innerHTML, /skeleton/);
  assert.match(el.innerHTML, /list-item/);
  assert.equal(el.getAttribute('aria-busy'), 'false');
});

test('renderWeeklyList replaces skeleton and clears busy flag', () => {
  const sb = loadUI();
  sb.UI.showSkeleton('weeklyContainer', 5);
  sb.UI.renderWeeklyList(days());
  const el = sb.document.getElementById('weeklyContainer');
  assert.doesNotMatch(el.innerHTML, /skeleton/);
  assert.match(el.innerHTML, /list-item/);
  assert.equal(el.getAttribute('aria-busy'), 'false');
});

test('renderEmpty writes escaped empty-state markup', () => {
  const sb = loadUI();
  sb.UI.renderEmpty('searchResults', { icon: 'fa-magnifying-glass', title: 'No <b>results</b>', hint: 'Try & again' });
  const html = sb.document.getElementById('searchResults').innerHTML;
  assert.match(html, /empty-state/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;results&lt;\/b&gt;/);
  assert.match(html, /Try &amp; again/);
});

test('renderSearchResults uses empty-state for zero results', () => {
  const sb = loadApp();
  const c = sb.document.getElementById('searchResults');
  sb.App.renderSearchResults([], c);
  assert.match(c.innerHTML, /empty-state/);
});

test('skeleton CSS: keyframes, row variant, reduced-motion guard', () => {
  const c = css('components.css');
  assert.match(c, /@keyframes skeleton-loading/);
  assert.match(c, /\.skeleton--row/);
  assert.match(c, /prefers-reduced-motion/);
});
