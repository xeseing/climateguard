'use strict';
/**
 * BUG-16: repo root must serve a landing page (redirect to the app),
 * so static hosts don't render an empty directory listing.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_INDEX = path.join(__dirname, '..', 'index.html');

test('root index.html exists and redirects to the app', () => {
  assert.ok(fs.existsSync(ROOT_INDEX), 'index.html missing at repo root');
  const html = fs.readFileSync(ROOT_INDEX, 'utf8');
  assert.match(html, /pages\/index\.html/);
  assert.ok(
    html.includes('http-equiv="refresh"') || html.includes('window.location'),
    'expected a meta-refresh or JS redirect',
  );
});

test('root index has a fallback link and valid skeleton', () => {
  const html = fs.readFileSync(ROOT_INDEX, 'utf8');
  assert.match(html, /<a[^>]*href="pages\/index\.html"/);
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<\/html>/i);
});
