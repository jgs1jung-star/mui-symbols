#!/usr/bin/env node
// Renders every symbol in build/symbols.json to dist/svg/<name>.svg via ISO.mui(),
// then packs them into dist/MUI-CustomSymbols-Isometric.zip for upload to Metasys UI.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ISO = require('../src/iso-symbols.js');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'dist/svg');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'symbols.json'), 'utf8'));

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const problems = [];
for (const sym of manifest.symbols) {
  const r = ISO.mui(sym.type, sym.params || {}, sym.name, sym.frame);
  // fit reports whether the drawing stayed inside the viewBox on each side;
  // a false here means Metasys will clip the symbol.
  if (r.fit.some((ok) => !ok)) problems.push(`${sym.name}: drawing overflows viewBox (fit=${r.fit})`);
  fs.writeFileSync(path.join(outDir, sym.name + '.svg'), r.svg);
}

const zip = path.join(root, 'dist/MUI-CustomSymbols-Isometric.zip');
fs.rmSync(zip, { force: true });
execFileSync('zip', ['-q', '-r', zip, '.'], { cwd: outDir });

console.log(`built ${manifest.symbols.length} symbols -> dist/svg/`);
console.log(`packaged -> ${path.relative(root, zip)}`);
if (manifest.provisional) console.log('WARNING: symbols.json is provisional; names are not the v14 names.');
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
