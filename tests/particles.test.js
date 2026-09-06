'use strict';
/**
 * BUG-11: snow particles must set valid 4-component rgba() fill styles
 * (the old string hack produced invalid 5-component colors).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSandbox, loadModule } = require('./helpers');

const VALID_RGBA = /^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, [\d.]+\)$/;

function bootParticles(effect) {
  const fills = [];
  let fillStyle = '';
  const ctxStub = {
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    scale() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  };
  Object.defineProperty(ctxStub, 'fillStyle', {
    get: () => fillStyle,
    set: (v) => { fillStyle = v; fills.push(v); },
  });
  const canvasStub = { getContext: () => ctxStub, width: 0, height: 0, style: {} };
  const sandbox = createSandbox({
    requestAnimationFrame: () => 0, // render a single frame synchronously
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
  });
  const PS = loadModule(sandbox, 'js/particles.js').exports;
  const api = PS.init(canvasStub);
  api.start(effect);
  api.stop();
  return fills;
}

test('snow effect sets only valid rgba() fill styles', () => {
  const fills = bootParticles('snow').filter((f) => typeof f === 'string');
  assert.ok(fills.length > 0, 'expected snow to paint string fills');
  for (const f of fills) assert.match(f, VALID_RGBA, `invalid fillStyle: ${f}`);
});

test('snow opacity varies per flake (alpha channel is used)', () => {
  const fills = bootParticles('snow').filter((f) => typeof f === 'string');
  const alphas = new Set(fills.map((f) => f.match(/, ([\d.]+)\)$/)[1]));
  assert.ok(alphas.size > 1, 'expected varying alpha values');
});
