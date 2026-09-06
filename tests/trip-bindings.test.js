'use strict';
/**
 * BUG-06: exactly one owner may bind the trip page actions.
 * Loads the page's real script set (parsed from the HTML) and counts listeners.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  createSandbox, loadPageScripts, fireDOMContentLoaded, countListeners, withMatchMedia,
} = require('./helpers');

class FakeObserver {
  observe() {}
  unobserve() {}
}

async function bootTripPage() {
  const sandbox = createSandbox({
    setTimeout: (fn) => { fn(); return 0; }, // run deferred inits synchronously
    setInterval: () => 0, // never leave hanging timers in tests
    location: { pathname: '/pages/trip-planner.html', href: '' },
    IntersectionObserver: FakeObserver,
  });
  withMatchMedia(sandbox);
  loadPageScripts(sandbox, 'trip-planner.html');
  await fireDOMContentLoaded(sandbox);
  return sandbox;
}

test('trip-planner.html no longer includes the conflicting module', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'trip-planner.html'), 'utf8');
  assert.doesNotMatch(html, /trip-planner\.js/);
});

test('#analyzeBtn has exactly one click listener after boot', async () => {
  const sandbox = await bootTripPage();
  assert.equal(countListeners(sandbox.document.getElementById('analyzeBtn'), 'click'), 1);
});

test('#downloadTripBtn has exactly one click listener after boot', async () => {
  const sandbox = await bootTripPage();
  assert.equal(countListeners(sandbox.document.getElementById('downloadTripBtn'), 'click'), 1);
});

test('default travel dates are prefilled (today → +7d)', async () => {
  const sandbox = await bootTripPage();
  const start = sandbox.document.getElementById('tripStartDate').value;
  const end = sandbox.document.getElementById('tripEndDate').value;
  assert.match(start, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(end, /^\d{4}-\d{2}-\d{2}$/);
  const diffDays = (new Date(end) - new Date(start)) / 86400000;
  assert.equal(diffDays, 7);
});
