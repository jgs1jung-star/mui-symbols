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

The engine and the studio are complete and are the pieces that matter.

`build/symbols.json` is **provisional**. The released v14 package contained 277
symbols (139 base plus `_R90`/`_R180`/`_R270` variants) whose names and
parameter sets came from a build script that was lost. The current manifest is
a stand-in generated from each builder's default parameters — 92 entries with
placeholder `ISO_*` names.

Before publishing a package, rebuild the manifest from
`MUI-CustomSymbols-Isometric-v14.zip` so the released names are preserved.
Renaming symbols breaks the references in graphics that already use them.

## Engine notes

Rotation works by rotating the camera and the light rather than the artwork, so
hidden faces, shading, metal highlights and port directions all follow the
facing automatically. Face-mounted details (displays, labels, panels, fan
grilles) are dropped when their face turns away.

Cutaway and level-indicating tanks are excluded from rotation: their cut face
has to stay toward the viewer.

The engine is written in ES3 so it runs unchanged in browsers and in Windows
`cscript`; the only Node-specific line is the `module.exports` guard at the end.
