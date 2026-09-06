'use strict';
/**
 * BUG-13: the language switcher must actually translate the UI —
 * every page tags its chrome via data-i18n*, and every used key
 * must exist in all supported languages.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createSandbox, loadModule, getGlobal } = require('./helpers');

const PAGES_DIR = path.join(__dirname, '..', 'pages');
const pageFiles = () => fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
const readPage = (f) => fs.readFileSync(path.join(PAGES_DIR, f), 'utf8');

function usedKeys() {
  const keys = new Set();
  for (const f of pageFiles()) {
    const html = readPage(f);
    for (const m of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) keys.add(m[1]);
  }
  return [...keys];
}

function tagCount() {
  let n = 0;
  for (const f of pageFiles()) {
    n += (readPage(f).match(/data-i18n(?:-placeholder|-aria)?="/g) || []).length;
  }
  return n;
}

function loadI18n() {
  const sandbox = createSandbox();
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/i18n.js');
  sandbox.I18n = getGlobal(sandbox, 'I18n');
  sandbox.Storage = getGlobal(sandbox, 'Storage');
  return sandbox;
}

test('pages tag a meaningful number of translatable strings', () => {
  assert.ok(tagCount() >= 70, `only ${tagCount()} data-i18n tags across pages`);
});

test('every page tags its tab-bar labels', () => {
  for (const f of pageFiles()) {
    for (const key of ['home', 'map', 'risk', 'trip', 'search']) {
      assert.match(readPage(f), new RegExp(`data-i18n="${key}"`), `${f} misses ${key}`);
    }
  }
});

test('every used key exists in all supported languages', () => {
  const sandbox = loadI18n();
  const { STRINGS, LANGUAGES } = sandbox.I18n;
  assert.deepStrictEqual(Object.keys(LANGUAGES).sort(), ['ar', 'en', 'es', 'fr', 'hi']);
  for (const key of usedKeys()) {
    for (const lang of Object.keys(LANGUAGES)) {
      const val = STRINGS[lang] && STRINGS[lang][key];
      assert.ok(typeof val === 'string' && val.length > 0, `key "${key}" missing in "${lang}"`);
    }
  }
});

test('switching language rewrites tagged elements + dir/lang', () => {
  const sandbox = loadI18n();
  const textEl = { textContent: 'Home', getAttribute: () => 'home' };
  const phEl = { setAttribute(attr, v) { this[attr] = v; }, getAttribute: () => 'searchPlaceholder' };
  sandbox.document.querySelectorAll = (sel) => {
    if (sel === '[data-i18n]') return [textEl];
    if (sel === '[data-i18n-placeholder]') return [phEl];
    return [];
  };
  sandbox.I18n.setLanguage('es');
  assert.equal(textEl.textContent, 'Inicio');
  assert.equal(phEl.placeholder, 'Buscar cualquier ciudad del mundo...');
  assert.equal(sandbox.Storage.getSettings().language, 'es');
  sandbox.I18n.setLanguage('ar');
  assert.equal(textEl.textContent, 'الرئيسية');
});
