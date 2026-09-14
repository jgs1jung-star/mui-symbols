# Metasys UI custom symbol format

What this file records is **derived from the working engine** (`ISO.mui()` in
`src/iso-symbols.js`), which produced symbols that Metasys UI 14.1 accepted.
It is not transcribed from Johnson Controls' *Metasys UI Custom Symbols
Technical Bulletin*. Where the bulletin disagrees, the bulletin wins.

## Root `<svg>`

```
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:jci="http://jci.com"
     version="1.1"
     width="Wpx" height="Hpx" viewBox="0 0 W H"
     enable-background="new 0 0 W H"
     xml:space="preserve"
     jci-id="SYMBOL_NAME">
  <g class="SYMBOL_NAME">
    <g transform="translate(-vbX -vbY)"> … </g>
  </g>
</svg>
```

- The viewBox origin is always `0 0`. The engine draws in its own isometric
  coordinate space and shifts the result into positive space with the inner
  `translate`, which matches JCI's requirement that artwork sit in quadrant 1.
- `width`/`height` carry an explicit `px` unit and are whole numbers.
- `jci-id` and the wrapper `class` both carry the symbol name.

## Pipe-family extras

Symbols of type `pipe`, `elbow`, `tee` and `joint` additionally carry the
attributes that let Metasys snap stock pipe runs together:

| Attribute | Meaning |
|---|---|
| `type="pipe"` | marks the symbol as a pipe run |
| `jci-joints="[[x, y], [x, y]]"` | connection points, in viewBox coordinates |
| `jci-width`, `jci-height` | repeated symbol extent |
| `jci-slope` | rise/run between the two joints, for sloped runs |
| `pipecolorfornonetype="#FFFFFF"` | fallback colour when no system type is set |
| `bas-symbols="pipJCId"` | JCI pipe symbol marker |
| `svgfillopacity="1"` | |
| `selectedsystemtype="null"`, `selectedshape="null"` | set by the editor at use time |

`ductjoint` is emitted as an invisible hit rectangle (`fill-opacity="0.01"`)
rather than artwork.

## Binding

State-driven parts carry per-part classes such as `class="st st-comp1"` and
`st-fan3`, so each can be bound to its own point in the graphics editor.

## Open questions

- Package layout for upload: the v14 release was a flat zip of `.svg` files.
  Whether Metasys 14.1 wants a manifest alongside them is unconfirmed.
- Whether `jci-slope` is required or optional on straight runs.
