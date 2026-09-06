'use strict';
/**
 * BUG-14: PDF downloads must degrade gracefully when the jsPDF CDN fails
 * (no TypeError), and keep working when it loads.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('vm');
const { createSandbox, loadModule, getGlobal, loadInlinePageScript } = require('./helpers');

class FakePDF {
  static saved = [];
  setFillColor() {} rect() {} setTextColor() {} setFontSize() {} setFont() {}
  text() {} circle() {} addPage() {}
  splitTextToSize(t) { return [String(t)]; }
  save(name) { FakePDF.saved.push(name); }
}

function baseSandbox() {
  const sandbox = createSandbox({ setTimeout: (fn) => { fn(); return 0; } });
  loadModule(sandbox, 'js/config.js');
  loadModule(sandbox, 'js/storage.js');
  loadModule(sandbox, 'js/units.js');
  loadModule(sandbox, 'js/ui.js');
  loadModule(sandbox, 'js/risk-engine.js');
  sandbox.UI = getGlobal(sandbox, 'UI');
  sandbox.RiskEngine = getGlobal(sandbox, 'RiskEngine');
  return sandbox;
}

function clickListener(sandbox, id) {
  const el = sandbox.document.getElementById(id);
  const l = el.__listeners.find((x) => x.type === 'click');
  assert.ok(l, `no click listener on #${id}`);
  return l.fn;
}

test('risk-report download degrades gracefully without jsPDF', () => {
  const s = baseSandbox();
  loadInlinePageScript(s, 'risk-report.html');
  const report = s.RiskEngine.analyzeRisks(null);
  assert.doesNotThrow(() => getGlobal(s, 'downloadReport')(report));
});

test('risk-report download saves a PDF with jsPDF present', () => {
  FakePDF.saved = [];
  const s = baseSandbox();
  s.window.jspdf = { jsPDF: FakePDF };
  loadInlinePageScript(s, 'risk-report.html');
  const report = s.RiskEngine.analyzeRisks(null);
  getGlobal(s, 'downloadReport')(report);
  assert.equal(FakePDF.saved.length, 1);
  assert.match(FakePDF.saved[0], /\.pdf$/);
});

test('compare export degrades gracefully without jsPDF', () => {
  const s = baseSandbox();
  loadInlinePageScript(s, 'compare.html');
  assert.doesNotThrow(() => clickListener(s, 'exportCompareBtn')());
});

test('trip download degrades gracefully without jsPDF', () => {
  const s = baseSandbox();
  loadModule(s, 'js/api.js');
  loadModule(s, 'js/app.js');
  loadInlinePageScript(s, 'trip-planner.html');
  vm.runInContext(
    'currentTripData = {city:"X",start:"2026-01-01",end:"2026-01-02",type:"leisure",' +
    'risk:{overallScore:10,overallLevel:{label:"Low"}},weather:{weather:{temp:20}}}', s);
  assert.doesNotThrow(() => clickListener(s, 'downloadTripBtn')());
});
