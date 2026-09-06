'use strict';
/**
 * BUG-18: getSettings must return a fresh merged copy — never the live
 * DEFAULT_SETTINGS object — and must heal partial/corrupt stored settings.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

function loadStorage() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/storage.js');
  sandbox.Storage = getGlobal(sandbox, 'Storage');
  return sandbox;
}

test('mutating returned settings does not corrupt defaults', () => {
  const sandbox = loadStorage();
  sandbox.Storage.getSettings().theme = 'CORRUPTED';
  sandbox.Storage.getSettings().units = 'CORRUPTED';
  const fresh = sandbox.Storage.getSettings();
  assert.equal(fresh.theme, 'dark');
  assert.equal(fresh.units, 'celsius');
});

test('partial stored settings merge over defaults', () => {
  const sandbox = loadStorage();
  sandbox.Storage.set(sandbox.Storage.KEYS.SETTINGS, { theme: 'light' });
  const s = sandbox.Storage.getSettings();
  assert.equal(s.theme, 'light');
  assert.equal(s.units, 'celsius');
  assert.equal(s.notif_tripReminders, true);
});

test('updateSettings persists and returns merged settings', () => {
  const sandbox = loadStorage();
  const updated = sandbox.Storage.updateSettings({ theme: 'light' });
  assert.equal(updated.theme, 'light');
  assert.equal(updated.units, 'celsius');
  assert.equal(sandbox.Storage.getSettings().theme, 'light');
});
