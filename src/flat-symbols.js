// Flat (2D schematic) symbol engine for Metasys UI custom symbols.
//
// The companion to src/iso-symbols.js. Same MUI output contract - ISO-style
// jci-* attributes, viewBox origin 0 0 - but P&ID-style line art instead of an
// isometric render, for operating screens that carry a lot of live values.
//
// Every builder declares its own width and height rather than inferring a
// bounding box: the shapes are simple enough that the extent is known, and a
// declared extent keeps symbols on a shared size grid.
//
// Parts that a point can drive carry class="st st-<part>" so each binds
// separately in the graphics editor, the same convention the isometric set uses.
var FLAT = (function () {
  var LINE = '#46515A',      // outlines
      BODY = '#EDF1F3',      // equipment fill
      WHITE = '#FFFFFF',
      DARK = '#7C8992',      // secondary detail
      SW = 2;                // stroke width

  // service colours, matched to the saturation Metasys stock pipes use
  var SVC = {
    chws: '#2C7BC4', chwr: '#79AEDF', hws: '#D24B32', hwr: '#E58C79',
    cws: '#25A05B', cwr: '#74C894', ref: '#C9A227', steam: '#9B6FB5', steel: '#94A0A8'
  };

  function r1(n) { return Math.round(n * 10) / 10; }

  // ---- drawing helpers -----------------------------------------------------
  function attrs(o) {
    var s = '', k;
    for (k in o) if (o[k] !== undefined && o[k] !== null) s += ' ' + k + '="' + o[k] + '"';
    return s;
  }
  function shape(tag, o, cls) {
    if (cls) o['class'] = cls;
    return '<' + tag + attrs(o) + '/>';
  }
  function rect(x, y, w, h, fill, cls, rx) {
    return shape('rect', { x: r1(x), y: r1(y), width: r1(w), height: r1(h), rx: rx,
      fill: fill || BODY, stroke: LINE, 'stroke-width': SW }, cls);
  }
  function circle(cx, cy, r, fill, cls) {
    return shape('circle', { cx: r1(cx), cy: r1(cy), r: r1(r),
      fill: fill || BODY, stroke: LINE, 'stroke-width': SW }, cls);
  }
  function poly(pts, fill, cls) {
    var d = pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' ');
    return shape('polygon', { points: d, fill: fill || BODY, stroke: LINE, 'stroke-width': SW }, cls);
  }
  function line(x1, y1, x2, y2, w, col) {
    return shape('line', { x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2),
      stroke: col || LINE, 'stroke-width': w || SW, 'stroke-linecap': 'round' });
  }
  function path(d, fill, stroke, w) {
    return shape('path', { d: d, fill: fill || 'none', stroke: stroke || LINE,
      'stroke-width': w || SW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }
  // filter zigzag, coil serpentine and fan blades recur across air-handling symbols
  function zigzag(x, y, w, h, n) {
    var d = 'M' + r1(x) + ' ' + r1(y + h), i, up;
    for (i = 1; i <= n; i++) {
      up = i % 2;
      d += 'L' + r1(x + w * i / n) + ' ' + r1(up ? y : y + h);
    }
    return path(d, 'none', DARK, 1.5);
  }
  function serpentine(x, y, w, h, n) {
    var d = 'M' + r1(x) + ' ' + r1(y), i, step = h / n;
    for (i = 0; i < n; i++) {
      d += 'L' + r1(x + w) + ' ' + r1(y + step * i + step / 2) +
           'L' + r1(x) + ' ' + r1(y + step * (i + 1));
    }
    return path(d, 'none', DARK, 1.5);
  }
  function blades(cx, cy, r, n, cls) {
    var s = '', i, a;
    for (i = 0; i < n; i++) {
      a = i * 2 * Math.PI / n;
      s += path('M' + r1(cx) + ' ' + r1(cy) +
        'L' + r1(cx + r * Math.cos(a)) + ' ' + r1(cy + r * Math.sin(a)), 'none', DARK, 1.5);
    }
    return '<g' + (cls ? ' class="' + cls + '"' : '') + '>' + s + '</g>';
  }

  // ---- builders ------------------------------------------------------------
  // Each returns { w, h, body, ports }. Ports are [x, y] in the symbol's own
  // space and become jci-joints for the pipe family.
  var DEF = {}, B = {};

  DEF.pump = { d: 12 };
  B.pump = function (q) {
    var w = 92, h = 70, cx = 46, cy = 30, r = 24;
    return { w: w, h: h, ports: [[0, cy], [cx, h - 8]], body:
      // suction on the left, discharge down: the standard centrifugal convention.
      // The base goes down first so the discharge run reads on top of it.
      rect(cx - 30, h - 12, 60, 10, DARK) +
      line(0, cy, cx - r, cy, q.d / 2) +
      line(cx, cy + r, cx, h - 2, q.d / 2) +
      circle(cx, cy, r, WHITE, 'st st-pump') +
      poly([[cx - 11, cy - 13], [cx - 11, cy + 13], [cx + 15, cy]], BODY) };
  };

  DEF.valve2 = { d: 12 };
  B.valve2 = function () {
    var w = 74, h = 56, cx = 37, cy = 38, hw = 18, hh = 13;
    return { w: w, h: h, ports: [[0, cy], [w, cy]], body:
      line(0, cy, w, cy, 3) +
      // bowtie body, stem, actuator
      poly([[cx - hw, cy - hh], [cx - hw, cy + hh], [cx, cy]], WHITE, 'st st-valve') +
      poly([[cx + hw, cy - hh], [cx + hw, cy + hh], [cx, cy]], WHITE, 'st st-valve') +
      line(cx, cy, cx, 14, 2) +
      rect(cx - 14, 4, 28, 12, DARK, 'st st-act', 2) };
  };

  DEF.valve3 = { d: 12 };
  B.valve3 = function () {
    var w = 74, h = 70, cx = 37, cy = 38, hw = 18, hh = 13;
    return { w: w, h: h, ports: [[0, cy], [w, cy], [cx, h]], body:
      line(0, cy, w, cy, 3) + line(cx, cy, cx, h, 3) +
      poly([[cx - hw, cy - hh], [cx - hw, cy + hh], [cx, cy]], WHITE, 'st st-valve') +
      poly([[cx + hw, cy - hh], [cx + hw, cy + hh], [cx, cy]], WHITE, 'st st-valve') +
      poly([[cx - hh, cy + hw], [cx + hh, cy + hw], [cx, cy]], WHITE, 'st st-valve') +
      line(cx, cy - 6, cx, 14, 2) +
      rect(cx - 14, 4, 28, 12, DARK, 'st st-act', 2) };
  };

  DEF.ahu = {};
  B.ahu = function () {
    var w = 210, h = 96, y = 8, bh = 80;
    return { w: w, h: h, ports: [[0, y + bh / 2], [w, y + bh / 2]], body:
      rect(0, y, w, bh) +
      // air path: filter, cooling coil, heating coil, supply fan
      line(46, y, 46, y + bh, 1.5) + line(96, y, 96, y + bh, 1.5) +
      line(146, y, 146, y + bh, 1.5) +
      zigzag(10, y + 16, 26, bh - 32, 6) +
      serpentine(56, y + 14, 30, bh - 28, 4) +
      serpentine(106, y + 14, 30, bh - 28, 4) +
      circle(178, y + bh / 2, 26, WHITE, 'st st-fan') +
      blades(178, y + bh / 2, 22, 6, 'st st-fanblade') };
  };

  DEF.chiller = {};
  B.chiller = function () {
    var w = 168, h = 104;
    return { w: w, h: h, ports: [[0, 32], [0, 78], [w, 32], [w, 78]], body:
      rect(0, 8, w, 88, BODY, null, 3) +
      // evaporator and condenser barrels with the compressor between them
      rect(12, 62, 100, 26, WHITE, null, 13) +
      rect(12, 18, 100, 26, WHITE, null, 13) +
      circle(136, 52, 22, WHITE, 'st st-comp') +
      path('M126 52 L146 42 L146 62 Z', DARK, DARK, 1) +
      line(112, 31, 126, 38, 1.5) + line(112, 75, 126, 66, 1.5) };
  };

  DEF.tower = {};
  B.tower = function () {
    var w = 132, h = 104;
    return { w: w, h: h, ports: [[0, 84], [w, 84]], body:
      // induced-draught tower: fan on top, drift eliminators, basin
      poly([[16, 34], [w - 16, 34], [w - 4, 92], [4, 92]]) +
      line(10, 62, w - 10, 62, 1.5) +
      zigzag(16, 40, w - 32, 16, 10) +
      rect(0, 92, w, 10, DARK) +
      rect(40, 22, 52, 12, BODY) +
      circle(66, 22, 24, WHITE, 'st st-fan') +
      blades(66, 22, 20, 6, 'st st-fanblade') };
  };

  DEF.watertank = { level: 65 };
  B.watertank = function (q) {
    var w = 96, h = 118, top = 10, bh = 100;
    var lv = Math.max(0, Math.min(100, q.level)) / 100, fh = (bh - 8) * lv;
    return { w: w, h: h, ports: [[w / 2, h], [0, top + 14]], body:
      rect(4, top, w - 8, bh, WHITE, null, 6) +
      shape('rect', { x: 8, y: r1(top + bh - 4 - fh), width: w - 16, height: r1(fh),
        fill: SVC.cws, 'fill-opacity': 0.55, rx: 3 }, 'st st-level') +
      rect(4, top, w - 8, bh, 'none', null, 6) +
      // sight glass ticks
      line(w - 16, top + 12, w - 16, top + bh - 12, 1.5) +
      line(w / 2, top + bh, w / 2, h, 3) };
  };

  // ---- pipe family ---------------------------------------------------------
  // 2D runs are plain rectangles, so one length stretches cleanly - no ladder
  // of fixed lengths and only four elbows, unlike the isometric set.
  DEF.pipe = { len: 120, d: 12, svc: 'chws', dir: 'x' };
  B.pipe = function (q) {
    var c = SVC[q.svc] || SVC.chws, t = q.d, L = q.len;
    if (q.dir === 'y') {
      return { w: t, h: L, ports: [[t / 2, 0], [t / 2, L]], body:
        shape('rect', { x: 0, y: 0, width: t, height: L, fill: c }, 'st st-pipe') +
        line(t * 0.3, 0, t * 0.3, L, Math.max(1, t * 0.16), '#FFFFFF') };
    }
    return { w: L, h: t, ports: [[0, t / 2], [L, t / 2]], body:
      shape('rect', { x: 0, y: 0, width: L, height: t, fill: c }, 'st st-pipe') +
      line(0, t * 0.3, L, t * 0.3, Math.max(1, t * 0.16), '#FFFFFF') };
  };

  // a is the incoming leg, b the outgoing one; both are compass directions
  DEF.elbow = { a: 'w', b: 's', d: 12, svc: 'chws' };
  B.elbow = function (q) {
    var c = SVC[q.svc] || SVC.chws, t = q.d, S = t * 2.5, m = S / 2;
    var end = { n: [m, 0], s: [m, S], w: [0, m], e: [S, m] };
    var a = end[q.a] || end.w, b = end[q.b] || end.s;
    return { w: S, h: S, ports: [a, b], body:
      path('M' + a[0] + ' ' + a[1] + 'L' + m + ' ' + m + 'L' + b[0] + ' ' + b[1],
        'none', c, t) };
  };

  DEF.tee = { run: 'x', br: 's', d: 12, svc: 'chws' };
  B.tee = function (q) {
    var c = SVC[q.svc] || SVC.chws, t = q.d, S = t * 2.5, m = S / 2;
    var end = { n: [m, 0], s: [m, S], w: [0, m], e: [S, m] };
    var run = q.run === 'y' ? ['n', 's'] : ['w', 'e'];
    var a = end[run[0]], b = end[run[1]], c2 = end[q.br] || end.s;
    return { w: S, h: S, ports: [a, b, c2], body:
      path('M' + a[0] + ' ' + a[1] + 'L' + b[0] + ' ' + b[1], 'none', c, t) +
      path('M' + m + ' ' + m + 'L' + c2[0] + ' ' + c2[1], 'none', c, t) };
  };

  // ---- output --------------------------------------------------------------
  function params(type, p) {
    var d = DEF[type] || {}, r = {}, k;
    for (k in d) r[k] = d[k];
    if (p) for (k in p) r[k] = p[k];
    return r;
  }
  var PAD = 4;

  function make(type, p) {
    if (!B[type]) throw new Error('unknown flat symbol type: ' + type);
    return B[type](params(type, p));
  }

  return {
    types: function () { var k, a = []; for (k in B) a.push(k); return a.sort(); },
    svc: SVC,
    params: params,
    build: function (type, p) {
      var s = make(type, p), W = s.w + PAD * 2, H = s.h + PAD * 2;
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H +
        '" width="' + W + '" height="' + H + '"><g transform="translate(' + PAD + ' ' + PAD + ')">' +
        s.body + '</g></svg>';
    },
    // Metasys UI custom symbol markup, matching the isometric engine's contract
    mui: function (type, p, name) {
      var s = make(type, p), W = Math.ceil(s.w + PAD * 2), H = Math.ceil(s.h + PAD * 2);
      var isRun = type === 'pipe' || type === 'elbow' || type === 'tee';
      var jt = [], i, q;
      for (i = 0; i < s.ports.length; i++) {
        q = s.ports[i];
        jt.push('[' + r1(q[0] + PAD) + ', ' + r1(q[1] + PAD) + ']');
      }
      var slope = '';
      if (isRun && s.ports.length === 2) {
        var a = s.ports[0], b = s.ports[1];
        if (Math.abs(b[0] - a[0]) > 0.5) slope = ' jci-slope="' + r1((b[1] - a[1]) / (b[0] - a[0])) + '"';
      }
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
        ' xmlns:jci="http://jci.com" version="1.1" width="' + W + 'px" height="' + H + 'px"' +
        ' viewBox="0 0 ' + W + ' ' + H + '" enable-background="new 0 0 ' + W + ' ' + H + '"' +
        ' xml:space="preserve"' + (isRun ? ' type="pipe"' : '') +
        (isRun ? ' jci-joints="[' + jt.join(', ') + ']" jci-width="' + W + '" jci-height="' + H + '"' + slope : '') +
        ' jci-id="' + name + '"' +
        (isRun ? ' pipecolorfornonetype="#FFFFFF" bas-symbols="pipJCId" svgfillopacity="1"' +
          ' selectedsystemtype="null" selectedshape="null"' : '') + '>' +
        '<g class="' + name + '"><g transform="translate(' + PAD + ' ' + PAD + ')">' + s.body + '</g></g></svg>';
      return { svg: svg, w: W, h: H, joints: jt.join(' ') };
    },
    ports: function (type, p) { return make(type, p).ports; }
  };
})();

// Node: expose the same FLAT object to build tooling. No effect in the browser.
if (typeof module !== 'undefined' && module.exports) module.exports = FLAT;
