#!/usr/bin/env node
// Seeds build/symbols.json with one provisional entry per engine builder, at
// default parameters, expanded over the four facings for rotatable equipment.
//
// PROVISIONAL: the real v14 package shipped 277 symbols whose names and
// parameter sets came from a build script lost with its session container.
// Re-derive that manifest from MUI-CustomSymbols-Isometric-v14.zip before
// publishing a package, or existing graphics will lose their symbol references.
const fs = require('fs');
const path = require('path');
const ISO = require('../src/iso-symbols.js');

const SRC = fs.readFileSync(path.join(__dirname, '../src/iso-symbols.js'), 'utf8');
const types = [...new Set([...SRC.matchAll(/B\.([a-z0-9_]+) *=/g)].map((m) => m[1]))].sort();

const symbols = [];
for (const type of types) {
  const base = { name: 'ISO_' + type.toUpperCase(), type, params: {} };
  symbols.push(base);
  if (!ISO.rotatable(type)) continue;
  for (const rot of [90, 180, 270]) {
    symbols.push({ name: base.name + '_R' + rot, type, params: { rot } });
  }
}

fs.writeFileSync(
  path.join(__dirname, 'symbols.json'),
  JSON.stringify({ provisional: true, symbols }, null, 2) + '\n'
);
console.log(`wrote ${symbols.length} provisional symbols over ${types.length} builders`);
