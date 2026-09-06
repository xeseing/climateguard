'use strict';
/**
 * Phase 3 Step 2b: responsive polish + micro-interactions (CSS + markup assertions).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const css = (f) => fs.readFileSync(path.join(__dirname, '..', 'css', f), 'utf8');
const page = (f) => fs.readFileSync(path.join(__dirname, '..', 'pages', f), 'utf8');

test('hero temperature scales fluidly (no fixed 8rem inline size)', () => {
  assert.match(css('components.css'), /\.hero-temp/);
  assert.match(css('components.css'), /clamp\(/);
  assert.match(page('index.html'), /hero-temp/);
  assert.doesNotMatch(page('index.html'), /font-size:8rem/);
});

test('tab items have a press micro-interaction', () => {
  assert.match(css('components.css'), /\.tab-item:active/);
});

test('small-screen breakpoint exists for very narrow devices', () => {
  assert.match(css('layout.css'), /max-width:\s*360px/);
});

test('empty-state hint + icon styles exist (used by UI.renderEmpty)', () => {
  assert.match(css('extended.css'), /\.empty-state__hint/);
  assert.match(css('extended.css'), /\.empty-state i/);
});

test('keyboard focus ring covers interactive elements globally', () => {
  assert.match(css('base.css'), /:focus-visible/);
});
