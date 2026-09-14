# mui-symbols

Isometric equipment symbols for **Johnson Controls Metasys UI (MUI) 14.1**
custom graphics — a drawing engine, a layout studio, and a build step that
emits MUI-format SVG.

## Layout

| Path | What it is |
|---|---|
| `src/iso-symbols.js` | the symbol engine — 41 parametric equipment builders, isometric projection, lighting, face culling, four-way facing, connection ports, and `ISO.mui()` which emits MUI-format SVG |
| `studio/index.html` | the layout studio — palette, canvas, property panel, pipe routing (`P`), SVG export |
| `build/symbols.json` | the symbol manifest: name, builder type, parameters |
| `build/build.js` | renders the manifest to `dist/svg/` and packs `dist/*.zip` |
| `build/gen-manifest.js` | reseeds the manifest from the engine's own defaults |
| `docs/MUI-FORMAT.md` | the MUI SVG format as the engine produces it |

## Use

The studio is plain HTML with no build step — serve the repo root and open
`studio/index.html`:

```
python3 -m http.server 8000
# http://localhost:8000/studio/
```

Build the symbol package (needs Node and `zip`):

```
node build/build.js
```

`build.js` fails if any symbol's artwork overflows its viewBox, which is the
failure mode that shows up in Metasys as a clipped symbol.

## Status

The engine, the studio and the build are working. `node build/build.js`
currently produces **222 symbols** (2.4 MB zip), all of which render inside
their viewBox and parse as well-formed XML.

The symbol set is defined from scratch in `build/gen-manifest.js` rather than
recovered from the released v14 package, so **the names differ from v14's**.
Graphics that referenced the old `_R90`-style v14 names will need to be
repointed. This was a deliberate call - the v14 build script was lost, and
rebuilding the set cleanly was preferred over reproducing names by guesswork.

What ships:

| Group | Count | Notes |
|---|---|---|
| Fixed HVAC equipment | 16 | `ISO_AHU`, `ISO_CHILLER`, `ISO_PUMP`, `ISO_VALVE2` ... |
| Utility plant | 114 | sized variants (`ISO_RO_4V`, `ISO_GASCAB_2CYL`) x four facings |
| Pipe family | 84 | 3 diameters x 28: one joint, three runs, 16 elbows, eight tees |
| Duct | 8 | 2 sizes x three axes, plus joints |

Adjust the config block at the top of `build/gen-manifest.js` to change which
variants ship - pipe diameters, services, duct sizes, and the per-builder
variant lists all live there. The generator drops any combination the engine
cannot draw or that overflows its viewBox, and reports what it dropped.

## Engine notes

Rotation works by rotating the camera and the light rather than the artwork, so
hidden faces, shading, metal highlights and port directions all follow the
facing automatically. Face-mounted details (displays, labels, panels, fan
grilles) are dropped when their face turns away.

Cutaway and level-indicating tanks are excluded from rotation: their cut face
has to stay toward the viewer.

The engine is written in ES3 so it runs unchanged in browsers and in Windows
`cscript`; the only Node-specific line is the `module.exports` guard at the end.
