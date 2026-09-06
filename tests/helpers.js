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
  const makeEl = (id) => ({
    id,
    innerHTML: '',
    textContent: '',
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  return {
    __elements: elements,
    getElementById: (id) => {
      if (!elements.has(id)) elements.set(id, makeEl(id));
      return elements.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => makeEl(''),
    addEventListener() {},
    dispatchEvent() {},
    body: makeEl('body'),
    documentElement: makeEl('html'),
  };
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

module.exports = { createSandbox, loadModule, getGlobal, withMatchMedia, createStorage, createDocumentStub };
