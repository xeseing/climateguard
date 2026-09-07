'use strict';
/**
 * Zero-dependency lint: node --check over js/ + inline <script> blocks in pages/.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failures = 0;

function checkFile(file) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    console.log(`OK   ${path.relative(root, file)}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${path.relative(root, file)}\n${(err.stderr || err.stdout || '').toString()}`);
  }
}

// 1. All standalone JS files
for (const f of fs.readdirSync(path.join(root, 'js'))) {
  if (f.endsWith('.js')) checkFile(path.join(root, 'js', f));
}
checkFile(path.join(root, 'service-worker.js'));

// 2. Inline scripts in pages (skip src-only tags)
const pagesDir = path.join(root, 'pages');
for (const f of fs.readdirSync(pagesDir)) {
  if (!f.endsWith('.html')) continue;
  const html = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  blocks.forEach((m, i) => {
    const tmp = path.join(root, `scripts/.inline-${f}-${i}.js`);
    fs.writeFileSync(tmp, m[1]);
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
      console.log(`OK   pages/${f} [inline #${i + 1}]`);
    } catch (err) {
      failures++;
      console.error(`FAIL pages/${f} [inline #${i + 1}]\n${(err.stderr || err.stdout || '').toString()}`);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
}

if (failures) {
  console.error(`\n${failures} lint failure(s)`);
  process.exit(1);
}
console.log('\nLint clean.');
