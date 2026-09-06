'use strict';
/**
 * Minimal browser-environment stubs for loading ClimateGuard's IIFE modules in Node.
 * Only RiskEngine/ParticleSystem/AnimationEngine/WeatherEngine export via module.exports;
 * other modules (Storage, UI, ...) attach to the sandbox global — loadModule() returns them.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] || null,
    get length() { return store.size; },
  };
}

function createDocumentStub() {
  const elements = new Map();
  const docListeners = [];
  const makeEl = (id) => ({
    id,
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    dataset: {},
    __listeners: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    addEventListener(type, fn) { makeEl.listenersOf(this).push({ type, fn }); },
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild() {},
    insertBefore() {},
    prepend() {},
    remove() {},
  });
  makeEl.listenersOf = (el) => el.__listeners;
  const doc = {
    __elements: elements,
    __docListeners: docListeners,
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeEl(''),
    addEventListener(type, fn) { docListeners.push({ type, fn }); },
    dispatchEvent() {},
    body: makeEl('body'),
    documentElement: makeEl('html'),
  };
  return doc;
}

/** Build a fresh sandbox with browser globals. */
function createSandbox(extra = {}) {
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    document: createDocumentStub(),
    navigator: { onLine: true, geolocation: undefined },
    location: { pathname: '/pages/index.html', href: '' },
    module: { exports: {} },
    ...extra,
  };
  sandbox.window = sandbox; // window === globalThis approximation
  sandbox.globalThis = sandbox;
  sandbox.__winListeners = [];
  sandbox.addEventListener = (type, fn) => sandbox.__winListeners.push({ type, fn });
  sandbox.removeEventListener = () => {};
  vm.createContext(sandbox);
  return sandbox;
}

/** Load a js/ file into the sandbox, return sandbox (globals) + module.exports. */
function loadModule(sandbox, relPath) {
  const abs = path.join(__dirname, '..', relPath);
  const code = fs.readFileSync(abs, 'utf8');
  vm.runInContext(code, sandbox, { filename: relPath });
  return { sandbox, exports: sandbox.module.exports };
}

/** Load the inline (src-less) <script> block of a page into the sandbox. */
function loadInlinePageScript(sandbox, pageFile) {
  const abs = path.join(__dirname, '..', 'pages', pageFile);
  const html = fs.readFileSync(abs, 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no inline script in ' + pageFile);
  vm.runInContext(m[1], sandbox, { filename: pageFile });
  return sandbox;
}

/** Read a top-level const/let binding from the context (not attached to sandbox object). */
function getGlobal(sandbox, name) {
  return vm.runInContext(name, sandbox);
}

/** Our modules use `window.matchMedia` at load time (animation-engine). Provide stub. */
function withMatchMedia(sandbox, matches = false) {
  sandbox.window.matchMedia = () => ({
    matches,
    addEventListener() {},
    removeEventListener() {},
  });
  return sandbox;
}

/**
 * Load every <script src="../js/..."> of a page in order, then its inline script.
 * Returns the sandbox. Timers/DOMContentLoaded are left to the caller.
 */
function loadPageScripts(sandbox, pageFile) {
  const abs = path.join(__dirname, '..', 'pages', pageFile);
  const html = fs.readFileSync(abs, 'utf8');
  for (const m of html.matchAll(/<script src="\.\.\/(js\/[^"]+)"><\/script>/g)) {
    loadModule(sandbox, m[1]);
  }
  loadInlinePageScript(sandbox, pageFile);
  return sandbox;
}

/** Invoke recorded DOMContentLoaded listeners; awaiting settles async inits. */
async function fireDOMContentLoaded(sandbox) {
  const fns = sandbox.document.__docListeners
    .filter((l) => l.type === 'DOMContentLoaded')
    .map((l) => l.fn);
  const results = await Promise.allSettled(fns.map((fn) => fn()));
  const rejected = results.filter((r) => r.status === 'rejected');
  if (rejected.length) throw rejected[0].reason;
}

/** Count listeners of a type registered on a stub element. */
function countListeners(el, type) {
  return (el.__listeners || []).filter((l) => l.type === type).length;
}

module.exports = {
  createSandbox, loadModule, getGlobal, loadInlinePageScript, loadPageScripts,
  fireDOMContentLoaded, countListeners, withMatchMedia, createStorage, createDocumentStub,
};
