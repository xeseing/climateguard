'use strict';
/**
 * BUG-04: user-controlled strings must be escaped at every innerHTML sink,
 * and inline onclick handlers with interpolated ids must be eliminated
 * (HTML-escaping alone is insufficient inside event-handler attributes).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal, loadInlinePageScript } = require('./helpers');

const EVIL = '<img src=x onerror=alert(1)>';
const EVIL_ID = `x');alert(1);//`;

function baseSandbox() {
  const s = createSandbox();
  loadModule(s, 'js/config.js');
  loadModule(s, 'js/storage.js');
  loadModule(s, 'js/units.js');
  loadModule(s, 'js/ui.js');
  s.UI = getGlobal(s, 'UI');
  s.Storage = getGlobal(s, 'Storage');
  return s;
}

test('trip countdowns escape city names and use no inline handlers', () => {
  const s = baseSandbox();
  loadModule(s, 'js/app.js');
  s.App = getGlobal(s, 'App');
  s.Storage.saveTripReminder({ id: 't1', city: EVIL, date: new Date(Date.now() + 86400000).toISOString() });
  s.Storage.saveTripReminder({ id: EVIL_ID, city: 'Safe', date: new Date(Date.now() + 86400000).toISOString() });
  s.App.renderTripCountdowns();
  const html = s.document.getElementById('tripCountdowns').innerHTML;
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /onclick=/);
  assert.match(html, /data-trip-id/);
});

test('search results escape names in text and data attributes', () => {
  const s = baseSandbox();
  loadModule(s, 'js/app.js');
  s.App = getGlobal(s, 'App');
  const container = s.document.createElement('div');
  s.App.renderSearchResults([{ name: EVIL, region: '"><svg onload=alert(1)>', lat: 1, lon: 2 }], container);
  assert.doesNotMatch(container.innerHTML, /<img src=x/);
  assert.doesNotMatch(container.innerHTML, /<svg/);
  assert.match(container.innerHTML, /&lt;img/);
  assert.match(container.innerHTML, /&quot;&gt;&lt;svg/);
});

test('recent searches escape names', () => {
  const s = baseSandbox();
  loadModule(s, 'js/app.js');
  s.App = getGlobal(s, 'App');
  s.Storage.addRecentLocation({ name: EVIL, region: 'R', lat: 1, lon: 2 });
  const container = s.document.createElement('div');
  s.App.renderRecentSearches(container);
  assert.doesNotMatch(container.innerHTML, /<img src=x/);
  assert.match(container.innerHTML, /&lt;img/);
});

test('compare table escapes city names', () => {
  const s = baseSandbox();
  loadInlinePageScript(s, 'compare.html');
  const renderComparison = getGlobal(s, 'renderComparison');
  renderComparison([
    { city: EVIL, weather: { temp: 20, humidity: 50, windSpeed: 10, uvIndex: 3, airQuality: 40 }, risk: { overallScore: 10, overallLevel: { label: 'Low', color: '#22c55e' } } },
    { city: 'Safe', weather: { temp: 30, humidity: 70, windSpeed: 40, uvIndex: 9, airQuality: 120 }, risk: { overallScore: 80, overallLevel: { label: 'Extreme', color: '#ef4444' } } },
  ]);
  const html = s.document.getElementById('compareTable').innerHTML;
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});

test('emergency contacts escape fields, sanitize tel: hrefs, no inline handlers', () => {
  const s = baseSandbox();
  loadInlinePageScript(s, 'emergency.html');
  const renderContacts = getGlobal(s, 'renderContacts');
  s.Storage.saveEmergencyContact({ id: 'c1', name: EVIL, phone: '123" onclick="alert(1)', relationship: '<b>x</b>', email: '' });
  renderContacts();
  const html = s.document.getElementById('contactsList').innerHTML;
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
  assert.doesNotMatch(html, /onclick="/);
  assert.doesNotMatch(html, /tel:123"/);
  assert.match(html, /tel:123/);
});

test('trip verdict escapes city name', () => {
  const s = baseSandbox();
  loadModule(s, 'js/api.js');
  loadModule(s, 'js/risk-engine.js');
  loadModule(s, 'js/app.js');
  loadInlinePageScript(s, 'trip-planner.html');
  const renderVerdict = getGlobal(s, 'renderVerdict');
  renderVerdict({ overallScore: 20, overallLevel: { label: 'Low', color: '#22c55e' } }, EVIL);
  const html = s.document.getElementById('verdictCard').innerHTML;
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;img/);
});
