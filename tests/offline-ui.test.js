'use strict';
/**
 * BUG-19: JS-injected offline banner / API-error card must be styled,
 * and trip-reminder Notifications must not carry an invalid emoji icon.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  createSandbox, loadPageScripts, fireDOMContentLoaded, withMatchMedia,
} = require('./helpers');

class FakeObserver {
  observe() {}
  unobserve() {}
}

test('components.css styles the offline banner', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'components.css'), 'utf8');
  assert.match(css, /\.offline-banner\s*\{/);
});

test('components.css styles the API error card', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'components.css'), 'utf8');
  assert.match(css, /\.api-error-card\s*\{/);
});

test('trip reminder Notification carries no invalid icon', async () => {
  const fired = [];
  function FakeNotification(title, opts) { fired.push({ title, opts }); }
  FakeNotification.permission = 'granted';
  const sandbox = createSandbox({
    setTimeout: (fn) => { fn(); return 0; },
    setInterval: () => 0,
    location: { pathname: '/pages/index.html', href: '' },
    IntersectionObserver: FakeObserver,
    Notification: FakeNotification,
    CustomEvent: class FakeEvent { constructor(type, opts) { this.type = type; this.detail = opts && opts.detail; } },
  });
  withMatchMedia(sandbox);
  // Canvas 2d stub so WeatherEngine.init completes
  sandbox.document.getElementById('particleCanvas').getContext = () => ({
    scale() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {},
    moveTo() {}, lineTo() {}, stroke() {},
  });
  try {
    loadPageScripts(sandbox, 'index.html');
  } catch (err) {
    if (!/no inline script/.test(err.message)) throw err;
  }
  const Storage = (() => {
    const vm = require('vm');
    return vm.runInContext('Storage', sandbox);
  })();
  Storage.updateSettings({ notificationsEnabled: true, notif_tripReminders: true });
  Storage.saveTripReminder({
    city: 'Testville',
    date: new Date(Date.now() + 12 * 3600000).toISOString(),
  });
  await fireDOMContentLoaded(sandbox);
  assert.equal(fired.length, 1);
  assert.equal(fired[0].title, 'Trip Reminder');
  assert.match(fired[0].opts.body, /Testville/);
  assert.ok(!('icon' in fired[0].opts), 'Notification must not set an icon URL');
});
