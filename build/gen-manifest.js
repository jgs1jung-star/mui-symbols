#!/usr/bin/env node
// Generates build/symbols.json: the full symbol set, with names.
//
// Edit the config block below to change which variants ship, then rerun:
//   node build/gen-manifest.js && node build/build.js
const fs = require('fs');
const path = require('path');
const ISO = require('../src/iso-symbols.js');

// ---------------------------------------------------------------- config ----
// Pipe-family sizes and services. `svc` only sets the drawn colour; Metasys
// overrides it per system type at use time, so one service is usually enough.
const PIPE_D = [12, 20, 32];
const PIPE_SVC = ['chws'];
const DUCT_SIZES = [{ w: 70, h: 50 }, { w: 120, h: 80 }];

// Equipment variants. One entry per builder; `v` lists the parameter sets that
// ship, each with the name suffix it gets. Rotatable equipment is expanded over
// the four facings automatically.
const EQUIP = {
  // fixed-shape HVAC equipment (no parameters)
  ahu: [{}], fan: [{}], fcu: [{}], damper: [{}], ccoil: [{}], hcoil: [{}],
  filter: [{}], humid: [{}], chiller: [{}], boiler: [{}], tower: [{}],
  pump: [{}], valve2: [{}], valve3: [{}], phe: [{}], exptank: [{}],

  // utility plant
  screw: [{}],
  pumpms: [{ suffix: '5ST', p: { stages: 5 } }, { suffix: '7ST', p: { stages: 7 } }],
  pumpv: [{ suffix: '6ST', p: { stages: 6 } }],
  vacuum: [{ suffix: '2', p: { n: 2 } }, { suffix: '3', p: { n: 3 } }, { suffix: '4', p: { n: 4 } }],
  aircomp: [{ suffix: 'CDA', p: { label: 'CDA' } }, { suffix: 'IA', p: { label: 'IA' } }],
  airtank: [{}],
  aftercooler: [{}],
  dryer: [{}],
  adsorb: [{}],
  ro: [{ suffix: '3V', p: { vessels: 3 } }, { suffix: '4V', p: { vessels: 4 } }, { suffix: '6V', p: { vessels: 6 } }],
  di: [{ suffix: '2C', p: { cols: 2 } }, { suffix: '3C', p: { cols: 3 } }],
  gascab: [{ suffix: '1CYL', p: { cyl: 1 } }, { suffix: '2CYL', p: { cyl: 2 } }],
  gasrack: [{ suffix: '3CYL', p: { cyl: 3 } }, { suffix: '6CYL', p: { cyl: 6 } }],
  header: [{ suffix: '4W', p: { n: 4 } }, { suffix: '6W', p: { n: 6 } }],
  exptank2: [{}],

  // tanks: the plain body rotates; the cutaway and level views must keep their
  // cut face toward the viewer, so they ship unrotated only.
  n2tank: [{}, { suffix: 'CUT', p: { cut: 1 }, norot: true }],
  watertank: [{}, { suffix: 'CUT', p: { cut: 1 }, norot: true }],

  // air distribution: these carry their own axis rather than a facing
  jetfan: [{ suffix: 'X', p: { dir: 'x' } }, { suffix: 'Y', p: { dir: 'y' } }],
  inlinefan: [{ suffix: 'X', p: { dir: 'x' } }, { suffix: 'Y', p: { dir: 'y' } }],
};
// ------------------------------------------------------------ end config ----

const symbols = [];
const skipped = [];

// Only keep a symbol the engine can actually draw inside its viewBox; an
// invalid parameter combination throws, and an overflowing one clips in Metasys.
function add(name, type, params) {
  try {
    const r = ISO.mui(type, params, name);
    if (r.fit.some((ok) => !ok)) return skipped.push(`${name}: overflows viewBox`);
  } catch (e) {
    return skipped.push(`${name}: ${e.message}`);
  }
  symbols.push({ name, type, params });
}

function addFacings(name, type, params, rotatable) {
  add(name, type, params);
  if (!rotatable) return;
  for (const rot of [90, 180, 270]) add(`${name}_R${rot}`, type, { ...params, rot });
}

for (const [type, variants] of Object.entries(EQUIP)) {
  for (const v of variants) {
    const name = ['ISO', type.toUpperCase(), v.suffix].filter(Boolean).join('_');
    addFacings(name, type, v.p || {}, ISO.rotatable(type) && !v.norot);
  }
}

const AX = ['+x', '-x', '+y', '-y'];
// '+x' -> 'PX', '-z' -> 'MZ'
const axTag = (a) => (a[0] === '+' ? 'P' : 'M') + a[1].toUpperCase();
for (const svc of PIPE_SVC) {
  const tag = PIPE_SVC.length > 1 ? '_' + svc.toUpperCase() : '';
  for (const d of PIPE_D) {
    const base = `ISO_%s_D${d}${tag}`;
    add(base.replace('%s', 'JOINT'), 'joint', { d, svc });
    for (const dir of ['x', 'y', 'z']) {
      add(`${base.replace('%s', 'PIPE')}_${dir.toUpperCase()}`, 'pipe', { dir, d, svc });
    }
    // elbows: the four horizontal turns, plus each horizontal leg turning up or down
    const turns = [];
    for (const a of AX) for (const b of AX) if (a[1] !== b[1]) turns.push([a, b]);
    for (const a of AX) for (const b of ['+z', '-z']) turns.push([a, b]);
    for (const [a, b] of turns) {
      const n = `${base.replace('%s', 'ELBOW')}_${axTag(a)}${axTag(b)}`;
      add(n, 'elbow', { a, b, d, svc });
    }
    // tees: each run axis branching to either side, up, or down
    for (const run of ['x', 'y']) {
      for (const br of ['+x', '-x', '+y', '-y', '+z', '-z']) {
        if (br[1] === run) continue;
        const n = `${base.replace('%s', 'TEE')}_${run.toUpperCase()}_${axTag(br)}`;
        add(n, 'tee', { run, br, d, svc });
      }
    }
  }
}

for (const { w, h } of DUCT_SIZES) {
  const tag = `_${w}X${h}`;
  add(`ISO_DUCTJOINT${tag}`, 'ductjoint', { w, h });
  for (const dir of ['x', 'y', 'z']) add(`ISO_DUCT${tag}_${dir.toUpperCase()}`, 'duct', { dir, w, h });
}

const dup = symbols.map((s) => s.name).filter((n, i, a) => a.indexOf(n) !== i);
if (dup.length) throw new Error('duplicate symbol names: ' + dup.join(', '));

fs.writeFileSync(
  path.join(__dirname, 'symbols.json'),
  JSON.stringify({ symbols }, null, 2) + '\n'
);
console.log(`wrote ${symbols.length} symbols`);
if (skipped.length) {
  console.log(`skipped ${skipped.length}:`);
  for (const s of skipped) console.log('  ' + s);
}
