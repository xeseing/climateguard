'use strict';
/**
 * BUG-17: the Theme module must be the single source of truth —
 * the settings toggle must drive Theme.applyTheme, not duplicate it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal, fireDOMContentLoaded } = require('./helpers');

async function bootTheme() {
  const sandbox = createSandbox({ setTimeout: (fn) => { fn(); return 0; } });
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/theme.js');
  loadModule(sandbox, 'js/settings-handler.js');
  sandbox.Theme = getGlobal(sandbox, 'Theme');
  sandbox.Storage = getGlobal(sandbox, 'Storage');
  sandbox.Theme.init();
  await fireDOMContentLoaded(sandbox);
  return sandbox;
}

function flipToggle(sandbox, checked) {
  const toggle = sandbox.document.getElementById('themeToggle');
  const l = toggle.__listeners.find((x) => x.type === 'change');
  assert.ok(l, 'theme toggle has no change listener');
  l.fn({ target: { checked } });
}

test('settings toggle drives Theme state (off → light)', async () => {
  const sandbox = await bootTheme();
  assert.equal(sandbox.Theme.getTheme(), 'dark');
  flipToggle(sandbox, false);
  assert.equal(sandbox.Theme.getTheme(), 'light');
  assert.equal(sandbox.Storage.getSettings().theme, 'light');
});

test('settings toggle drives Theme state (on → dark)', async () => {
  const sandbox = await bootTheme();
  flipToggle(sandbox, false);
  flipToggle(sandbox, true);
  assert.equal(sandbox.Theme.getTheme(), 'dark');
  assert.equal(sandbox.Storage.getSettings().theme, 'dark');
});
