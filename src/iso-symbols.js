// Isometric HVAC symbol engine v2 (ES3 - runs in browsers and Windows cscript/JScript)
// Axes: x -> screen right-down, y -> screen left-down, z -> up. Viewer sits at +x +y +z.
var ISO = (function () {
  var C = 0.8660254, S = 0.5, PI = Math.PI;
  var V = [1, 1, 1];
  var X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

  var BODY = '#C5CBD0', PANEL = '#D6DBDF', FRAME = '#7B848B', DARK = '#4A535A', STEEL = '#A8B0B6',
      WIN = '#2B3338', ST = '#8F989E', CHW = '#3D7CBD', HW = '#C64F3B', CW = '#2E9884',
      MEDIA = '#E6E0CC', FIN = '#DCE3E8', GLASS = '#8CC3E3', WHITE = '#F4F6F7', BLADE = '#D3D8DB',
      DUCT = '#BCC3C8', REF = '#C9A227';
  var SVC = { chws: '#3D7CBD', chwr: '#6FA3D8', hws: '#C64F3B', hwr: '#DA8472', cws: '#2E9884', cwr: '#5DB8A6', ref: '#C9A227', steam: '#9B6FB5', steel: '#A8B0B6' };

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function crs(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dv(s) { var g = s.charAt(0) === '-' ? -1 : 1, k = s.charAt(1); return k === 'x' ? [g, 0, 0] : k === 'y' ? [0, g, 0] : [0, 0, g]; }
  function nrm(a) { var l = Math.sqrt(dot(a, a)) || 1; return mul(a, 1 / l); }
  function r1(n) { return Math.round(n * 10) / 10; }
  function r3(n) { return Math.round(n * 1000) / 1000; }
  // view rotation (0..3 quarter turns about z). Rotating the object == rotating camera + light the other way,
  // so culling (V), lighting (L) and depth sorting all follow automatically.
  var ROT = 0, V0 = [1, 1, 1], L0 = nrm([0.2, 0.55, 0.85]);
  function rz(p, k) {
    k = ((k % 4) + 4) % 4;
    if (k === 0) return p;
    if (k === 1) return [-p[1], p[0], p[2]];
    if (k === 2) return [-p[0], -p[1], p[2]];
    return [p[1], -p[0], p[2]];
  }
  function proj(p) { var q = ROT ? rz(p, ROT) : p; return [(q[0] - q[1]) * C, (q[0] + q[1]) * S - q[2]]; }
  var L = L0;

  // lighting: key light + sky fill + specular (half vector and a horizontal "window" reflection for metals)
  var VN = nrm(V), HV = nrm(add(L, VN)), HH = nrm([HV[0], HV[1], 0]);
  function setView(k) {
    ROT = ((k % 4) + 4) % 4;
    V = rz(V0, -ROT); L = rz(L0, -ROT);
    VN = nrm(V); HV = nrm(add(L, VN)); HH = nrm([HV[0], HV[1], 0]);
  }
  var MAT = { paint: { ks: 0.16, sh: 14, amb: 0.44 }, metal: { ks: 0.72, sh: 26, amb: 0.4 }, pipe: { ks: 0.42, sh: 20, amb: 0.44 } };
  function shade(n, m) {
    m = m || MAT.paint; n = nrm(n);
    var dif = Math.max(0, dot(n, L)), I = m.amb + 0.56 * dif + 0.12 * n[2];
    I *= 0.8 + 0.2 * Math.max(0, dot(n, VN));
    var sp = m.ks * Math.max(Math.pow(Math.max(0, dot(n, HV)), m.sh), 0.8 * Math.pow(Math.max(0, dot(n, HH)), m.sh));
    var w = Math.min(0.8, sp + Math.max(0, I - 0.9) * 1.1), b = Math.min(0.72, Math.max(0, 0.9 - I) * 0.95), net = w - b;
    return net >= 0 ? ['#FFFFFF', Math.round(net * 50) / 50] : ['#000000', Math.round(-net * 50) / 50];
  }
  function hx(n) { var s = Math.round(Math.max(0, Math.min(255, n))).toString(16); return s.length < 2 ? '0' + s : s; }
  function mixc(hex, sh) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    var t = sh[0] === '#FFFFFF' ? 255 : 0, a = sh[1];
    return '#' + hx(r + (t - r) * a) + hx(g + (t - g) * a) + hx(b + (t - b) * a);
  }
  function newell(p) {
    var n = [0, 0, 0], i, a, b;
    for (i = 0; i < p.length; i++) {
      a = p[i]; b = p[(i + 1) % p.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return n;
  }
  function onP(o, u, v, p2) {
    var r = [], i;
    for (i = 0; i < p2.length; i++) r.push(add(o, add(mul(u, p2[i][0]), mul(v, p2[i][1]))));
    return r;
  }
  function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  function circ(cx, cy, r, n) {
    n = n || 40; var p = [], i, t;
    for (i = 0; i < n; i++) { t = i / n * PI * 2; p.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
    return p;
  }
  function ringPts(cx, cy, r, n) { var p = circ(cx, cy, r, n); p.push(p[0]); return p; }
  function rot2(p, ang, dx, dy) {
    var c = Math.cos(ang), s = Math.sin(ang), r = [], i;
    for (i = 0; i < p.length; i++) r.push([p[i][0] * c - p[i][1] * s + dx, p[i][0] * s + p[i][1] * c + dy]);
    return r;
  }
  // "st" or "st#comp1" -> class="st st-comp1"
  function cls(c) {
    if (!c) return '';
    var i = c.indexOf('#');
    if (i < 0) return ' class="' + c + '"';
    return ' class="' + c.substring(0, i) + ' ' + c.substring(0, i) + '-' + c.substring(i + 1) + '"';
  }
  var EDGE = ' stroke="#1E262C" stroke-opacity=".38" stroke-width=".6" stroke-linejoin="round"';

  function Sym(id) { this.id = id; this.out = []; this.defs = []; this.n = 0; this.anim = false; this.mui = false; this.tags = {}; this.mat = 'paint'; this.once = {}; this.x0 = 1e9; this.y0 = 1e9; this.x1 = -1e9; this.y1 = -1e9; this.reset(); }
  // ---- draw groups: every top-level primitive call becomes a group with a 3D centroid; decal-like calls
  // (panels, labels, fan wheels, gauges' dials...) join the solid drawn just before them. With ROT = 0 the groups keep
  // authoring order (identical output); rotated views sort groups back-to-front and hide decals on faces turned away.
  Sym.prototype.reset = function () { this.G = []; this.pre = []; this.lvl = 0; this.acc = null; this.cg = null; this.out = []; };
  // acc = [sx, sy, sz, n, minz, maxz, minx, maxx, miny, maxy]
  Sym.prototype.acc3 = function (p) {
    var a = this.acc; if (!a) return;
    a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++;
    if (p[2] < a[4]) a[4] = p[2]; if (p[2] > a[5]) a[5] = p[2];
    if (p[0] < a[6]) a[6] = p[0]; if (p[0] > a[7]) a[7] = p[0];
    if (p[1] < a[8]) a[8] = p[1]; if (p[1] > a[9]) a[9] = p[1];
  };
  // the solid a decal at c sits on: most recent group whose bounds contain c (rotated views only)
  Sym.prototype.hostOf = function (c) {
    var i, g, t = 2.5, lim = Math.max(0, this.G.length - 60), last = this.G.length ? this.G[this.G.length - 1] : null;
    if (!ROT || !c) return last;
    for (i = this.G.length - 1; i >= lim; i--) {
      g = this.G[i];
      if (g.bb && c[0] >= g.bb[0] - t && c[0] <= g.bb[1] + t && c[1] >= g.bb[2] - t && c[1] <= g.bb[3] + t && c[2] >= g.bb[4] - t && c[2] <= g.bb[5] + t) return g;
    }
    return last;
  };
  Sym.prototype.anchor = function (c) {
    var a = this.acc;
    if (this.lvl > 0 && a && a[3]) return [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    if (this.cg && this.cg.parent) return this.cg.parent;
    var g = this.hostOf(c);
    return g ? g.c : null;
  };
  // true when a planar decal (points on its plane) faces away from the viewer in a rotated view
  Sym.prototype.hidden = function (pts) {
    if (!ROT) return false;
    var n = newell(pts), c = [0, 0, 0], i, an;
    if (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]) < 1e-9) return false;
    for (i = 0; i < pts.length; i++) c = add(c, pts[i]);
    c = mul(c, 1 / pts.length);
    an = this.anchor(c);
    if (!an) return false;
    if (dot(n, sub(c, an)) < 0) n = mul(n, -1);
    return dot(n, V) <= 0.01;
  };
  Sym.prototype.final = function () {
    var gs = this.G.slice(0), out = this.pre.slice(0), i, j;
    if (ROT) gs.sort(function (a, b) { return (a.low !== b.low) ? (a.low ? -1 : 1) : (a.d - b.d) || (a.i - b.i); });
    for (i = 0; i < gs.length; i++) for (j = 0; j < gs[i].out.length; j++) out.push(gs[i].out[j]);
    for (i = 0; i < this.out.length; i++) out.push(this.out[i]);
    return out.join('');
  };
  var DECAL = { on: 1, ln: 1, label: 1, hazard: 1, panels: 1, guard: 1, rotor: 1, ring: 1, tube: 1 };
  function wrapPrim(name) {
    var orig = Sym.prototype[name];
    Sym.prototype[name] = function () {
      if (this.lvl > 0) return orig.apply(this, arguments);
      var buf = this.out, items, a, c, g, i;
      this.lvl = 1; this.out = []; this.acc = [0, 0, 0, 0, 1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
      try { orig.apply(this, arguments); }
      finally {
        items = this.out; a = this.acc; this.out = buf; this.lvl = 0; this.acc = null;
        c = a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : null;
        if (this.cg) {
          // inside a clip block: everything belongs to that block
          if (!this.cg.discard) for (i = 0; i < items.length; i++) this.cg.out.push(items[i]);
          if (c) { this.cg.s = add(this.cg.s, mul(c, a[3])); this.cg.k += a[3]; }
        } else {
          g = DECAL[name] ? this.hostOf(c) : null;
          if (g) { for (i = 0; i < items.length; i++) g.out.push(items[i]); }
          else if (items.length) this.G.push({ out: items, c: c || [0, 0, 0], d: c ? depthOf(c) : 0, low: a[5] <= 12 && a[5] - a[4] <= 12, i: this.G.length,
            bb: a[3] ? [a[6], a[7], a[8], a[9], a[4], a[5]] : null });
        }
      }
    };
  }
  Sym.prototype.M = function () { return MAT[this.mat] || MAT.paint; };
  // shared <defs> entry created on first use
  Sym.prototype.def1 = function (key, markup) {
    var id = this.id + '-' + key;
    if (!this.once[key]) { this.once[key] = 1; this.defs.push(markup.split('@ID').join(id)); }
    return id;
  };
  // soft blurred ground shadow under a footprint polygon (world xy at height z), drawn beneath everything
  Sym.prototype.shadow = function (pts2, z, op, blur) {
    var id = this.def1('shb' + (blur || 5), '<filter id="@ID" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="' + (blur || 5) + '"/></filter>');
    var p3 = [], i, q, s = '';
    for (i = 0; i < pts2.length; i++) p3.push([pts2[i][0] + 7, pts2[i][1] - 4, z || 0]);
    for (i = 0; i < p3.length; i++) { q = proj(p3[i]); this.grow(q, (blur || 5) * 2.2); s += (i ? 'L' : 'M') + r1(q[0]) + ' ' + r1(q[1]); }
    this.pre.push('<path d="' + s + 'Z" fill="#000000" fill-opacity="' + (op || 0.3) + '" filter="url(#' + id + ')"/>');
  };
  Sym.prototype.shadowRect = function (x, y, w, d, op, blur) { this.shadow([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], 0, op, blur); };
  Sym.prototype.shadowDisc = function (cx, cy, r, op, blur) { this.shadow(circ(cx, cy, r, 32), 0, op, blur); };
  // colors tagged for MUI property panel / Custom Behavior (class + bas-symbols attribute)
  Sym.prototype.tagAttr = function (fill, extra) {
    var t = this.tags[fill];
    if (!t || (extra && extra.indexOf('class=') >= 0)) return '';
    return ' class="' + t + '" bas-symbols="' + t + '"';
  };
  Sym.prototype.grow = function (q, r) {
    r = r || 0;
    if (q[0] - r < this.x0) this.x0 = q[0] - r; if (q[0] + r > this.x1) this.x1 = q[0] + r;
    if (q[1] - r < this.y0) this.y0 = q[1] - r; if (q[1] + r > this.y1) this.y1 = q[1] + r;
  };
  Sym.prototype.P = function (p) { var q = proj(p); this.grow(q); this.acc3(p); return q; };
  Sym.prototype.d = function (pts, open) {
    var s = '', i, q;
    for (i = 0; i < pts.length; i++) { q = this.P(pts[i]); s += (i ? 'L' : 'M') + r1(q[0]) + ' ' + r1(q[1]); }
    return open ? s : s + 'Z';
  };
  Sym.prototype.path = function (d, fill, extra) { this.out.push('<path d="' + d + '" fill="' + fill + '"' + this.tagAttr(fill, extra) + (extra || '') + '/>'); };
  Sym.prototype.overlay = function (d, sh) { if (sh[1] > 0.01) this.path(d, sh[0], ' fill-opacity="' + sh[1] + '"'); };
  Sym.prototype.face = function (pts, col, c, edge) {
    var n = newell(pts); if (dot(n, V) < 0) n = mul(n, -1);
    var d = this.d(pts);
    this.path(d, col, cls(c) + (edge === false ? '' : EDGE));
    this.overlay(d, shade(n, this.M()));
    if (edge !== false && Math.abs(nrm(n)[2]) < 0.5) {
      // light falloff toward the ground on vertical faces
      var ao = this.def1('ao', '<linearGradient id="@ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".09"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity=".16"/></linearGradient>');
      this.path(d, 'url(#' + ao + ')');
    }
  };
  Sym.prototype.on = function (o, u, v, p2, col, c, edge) {
    var pts = onP(o, u, v, p2);
    if (this.hidden(pts)) return;
    this.face(pts, col, c, edge);
  };
  Sym.prototype.ln = function (o, u, v, p2, stroke, w, op) {
    if (this.hidden([o, add(o, u), add(o, v)])) return;
    this.line3(onP(o, u, v, p2), stroke, w, op);
  };
  Sym.prototype.line3 = function (pts, stroke, w, op) {
    this.out.push('<path d="' + this.d(pts, true) + '" fill="none" stroke="' + stroke + '"' + (op ? ' stroke-opacity="' + op + '"' : '') +
      ' stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round"/>');
  };
  // coil tube with outline + highlight (reads as round copper/steel tube)
  Sym.prototype.tube = function (o, u, v, p2, col, w) {
    var hp = [], i;
    for (i = 0; i < p2.length; i++) hp.push([p2[i][0], p2[i][1] + w * 0.22]);
    this.ln(o, u, v, p2, '#1B2227', w + 1.4, 0.55);
    this.ln(o, u, v, p2, col, w);
    this.ln(o, u, v, hp, '#FFFFFF', r1(w * 0.32), 0.5);
  };
  // visible half of a circumferential band on a cylinder surface
  Sym.prototype.ring = function (o, u, v, r, stroke, w, dFrom, dTo) {
    var n = 72, i, j, pts = [], vis = [], t, nn, st = -1, arr = [], deg;
    for (i = 0; i < n; i++) {
      t = i / n * 2 * PI; deg = i / n * 360;
      nn = add(mul(u, Math.cos(t)), mul(v, Math.sin(t)));
      vis.push(dot(nn, V) > 0 && (dFrom === undefined || (deg >= dFrom && deg <= dTo)));
      pts.push(add(o, mul(nn, r)));
    }
    for (i = 0; i < n; i++) {
      if (!(vis[i] && !vis[(i + n - 1) % n])) continue;
      arr = [];
      for (j = 0; j < n; j++) { st = (i + j) % n; if (!vis[st]) break; arr.push(pts[st]); }
      if (arr.length > 1) this.line3(arr, stroke, w);
    }
  };
  Sym.prototype.clip = function (pts) {
    var id = this.id + '-c' + (this.n++), top = this.lvl === 0 && !this.cg, hide = top && this.hidden(pts);
    var saveAcc = this.acc; this.acc = null;
    this.defs.push('<clipPath id="' + id + '"><path d="' + this.d(pts) + '"/></clipPath>');
    this.acc = saveAcc;
    if (top) {
      // a clipped block (window, cutaway) is one draw group; skipped entirely when its plane faces away
      var g = this.G.length ? this.G[this.G.length - 1] : null;
      var pc = [0, 0, 0], pk;
      for (pk = 0; pk < pts.length; pk++) pc = add(pc, pts[pk]);
      g = this.hostOf(mul(pc, 1 / pts.length)) || g;
      this.cg = { out: ['<g clip-path="url(#' + id + ')">'], s: [0, 0, 0], k: 0, discard: hide, parent: g ? g.c : null, host: g };
    } else this.out.push('<g clip-path="url(#' + id + ')">');
  };
  Sym.prototype.unclip = function () {
    if (this.lvl === 0 && this.cg) {
      var cg = this.cg, c = cg.k ? mul(cg.s, 1 / cg.k) : (cg.parent || [0, 0, 0]);
      this.cg = null;
      if (!cg.discard) {
        cg.out.push('</g>');
        // rotated views: a clipped window/cutaway is drawn together with the solid it is cut into
        if (ROT && cg.host) { for (var ci = 0; ci < cg.out.length; ci++) cg.host.out.push(cg.out[ci]); }
        else this.G.push({ out: cg.out, c: c, d: depthOf(c), low: false, i: this.G.length });
      }
    } else this.out.push('</g>');
  };

  // cap: undefined = draw the visible end, false = none, 'B' = base end, 'T' = top end
  Sym.prototype.ext = function (o, u, v, p2, w, col, c, mode, cap) {
    var n = p2.length, i, j, A = 0, vis = [];
    for (i = 0; i < n; i++) { j = (i + 1) % n; A += p2[i][0] * p2[j][1] - p2[j][0] * p2[i][1]; }
    var sg = A > 0 ? 1 : -1;
    var B = onP(o, u, v, p2), T = [];
    for (i = 0; i < n; i++) T.push(add(B[i], w));
    if (!mode) mode = n > 12 ? 'smooth' : 'flat';
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      var da = p2[j][0] - p2[i][0], db = p2[j][1] - p2[i][1];
      var nn = add(mul(u, db * sg), mul(v, -da * sg));
      if (dot(nn, V) > 1e-6) vis.push([i, j, nn]);
    }
    var k, q;
    if (mode === 'flat') {
      for (k = 0; k < vis.length; k++) { i = vis[k][0]; j = vis[k][1]; this.face([B[i], B[j], T[j], T[i]], col, c); }
    } else if (mode === 'facet') {
      var all = '', groups = {}, key, sh;
      for (k = 0; k < vis.length; k++) {
        i = vis[k][0]; j = vis[k][1];
        q = this.d([B[i], B[j], T[j], T[i]]); all += q;
        sh = shade(vis[k][2], this.M()); key = sh[0] + '|' + sh[1];
        groups[key] = (groups[key] || '') + q;
      }
      if (all) this.path(all, col, cls(c));
      for (key in groups) { var parts = key.split('|'); this.overlay(groups[key], [parts[0], parseFloat(parts[1])]); }
    } else {
      var d = '', stops = [];
      var p0 = proj(o), pw = proj(add(o, w));
      var pn = [-(pw[1] - p0[1]), pw[0] - p0[0]], pl = Math.sqrt(pn[0] * pn[0] + pn[1] * pn[1]) || 1;
      pn = [pn[0] / pl, pn[1] / pl];
      var tmin = 1e9, tmax = -1e9, t;
      for (i = 0; i < n; i++) { q = proj(B[i]); t = q[0] * pn[0] + q[1] * pn[1]; if (t < tmin) tmin = t; if (t > tmax) tmax = t; }
      for (k = 0; k < vis.length; k++) {
        i = vis[k][0]; j = vis[k][1];
        d += this.d([B[i], B[j], T[j], T[i]]);
        q = proj(mul(add(B[i], B[j]), 0.5));
        stops.push([q[0] * pn[0] + q[1] * pn[1], shade(vis[k][2], this.M())]);
      }
      if (d && tmax - tmin > 0.01) {
        stops.sort(function (a, b) { return a[0] - b[0]; });
        var id = this.id + '-g' + (this.n++);
        var g = '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + r1(pn[0] * tmin) + '" y1="' + r1(pn[1] * tmin) +
          '" x2="' + r1(pn[0] * tmax) + '" y2="' + r1(pn[1] * tmax) + '">';
        for (k = 0; k < stops.length; k++) {
          g += '<stop offset="' + (Math.round((stops[k][0] - tmin) / (tmax - tmin) * 1000) / 1000) + '" stop-color="' + stops[k][1][0] + '" stop-opacity="' + stops[k][1][1] + '"/>';
        }
        this.defs.push(g + '</linearGradient>');
        this.path(d, col, cls(c));
        this.path(d, 'url(#' + id + ')');
      }
    }
    if (cap === false) return;
    if (cap === 'T') this.face(T, col, c);
    else if (cap === 'B') this.face(B, col, c);
    else if (dot(w, V) > 0) this.face(T, col, c); else this.face(B, col, c);
  };
  // cylinder between two arbitrary points
  Sym.prototype.cyl = function (p0, p1, r, col, c, cap) {
    var w = sub(p1, p0), wn = nrm(w), ax = Math.abs(wn[0]) < 0.9 ? X : Y;
    var u = nrm(crs(w, ax)), v = nrm(crs(w, u));
    this.ext(p0, u, v, circ(0, 0, r, 32), w, col, c, 'smooth', cap);
  };
  // text lying on a plane (u = reading direction, v = downwards)
  Sym.prototype.label = function (o, u, v, text, size, fill) {
    if (ROT) {
      var ln = crs(u, v), an = this.anchor();
      if (an && dot(ln, sub(o, an)) < 0) ln = mul(ln, -1);
      if (dot(ln, V) <= 0.01) return;
    }
    this.acc3(o);
    var p0 = proj(o), pu = proj(add(o, u)), pv = proj(add(o, v));
    this.grow(p0, size);
    this.out.push('<text transform="matrix(' + r3(pu[0] - p0[0]) + ' ' + r3(pu[1] - p0[1]) + ' ' + r3(pv[0] - p0[0]) + ' ' + r3(pv[1] - p0[1]) + ' ' + r3(p0[0]) + ' ' + r3(p0[1]) + ')"' +
      ' x="0" y="' + r1(size * 0.36) + '" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="' + r1(size) + '" fill="' + fill + '">' + text + '</text>');
  };
  // embossed stainless panel grid on a plane (a across, b up)
  Sym.prototype.panels = function (o, u, v, na, nb, P) {
    if (this.hidden([o, add(o, mul(u, na * P)), add(o, mul(v, nb * P))])) return;
    var i, j, a, b, n = 4, A, Bp, Cp, D, A2, B2, C2, D2, top = '', bot = '', lft = '', rgt = '', seams = '';
    for (i = 0; i < na; i++) for (j = 0; j < nb; j++) {
      a = i * P; b = j * P;
      A = [a, b]; Bp = [a + P, b]; Cp = [a + P, b + P]; D = [a, b + P];
      A2 = [a + n, b + n]; B2 = [a + P - n, b + n]; C2 = [a + P - n, b + P - n]; D2 = [a + n, b + P - n];
      bot += this.d(onP(o, u, v, [A, Bp, B2, A2])); rgt += this.d(onP(o, u, v, [Bp, Cp, C2, B2]));
      top += this.d(onP(o, u, v, [Cp, D, D2, C2])); lft += this.d(onP(o, u, v, [D, A, A2, D2]));
    }
    this.path(top, '#FFFFFF', ' fill-opacity=".26"'); this.path(lft, '#FFFFFF', ' fill-opacity=".12"');
    this.path(bot, '#000000', ' fill-opacity=".12"'); this.path(rgt, '#000000', ' fill-opacity=".22"');
    // brushed sheen on each pillow
    var sheen = this.def1('sheen', '<linearGradient id="@ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".28"/><stop offset=".45" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".55" stop-color="#FFFFFF" stop-opacity=".1"/><stop offset="1" stop-color="#000000" stop-opacity=".1"/></linearGradient>');
    var pil = '';
    for (i = 0; i < na; i++) for (j = 0; j < nb; j++) pil += this.d(onP(o, u, v, rect(i * P + n, j * P + n, P - 2 * n, P - 2 * n)));
    this.path(pil, 'url(#' + sheen + ')');
    // external bolted flanges: dark joint + light lip + bolt heads
    var lip = '', bolts = '', t, q, br = 0.75;
    for (i = 1; i < na; i++) {
      seams += this.d(onP(o, u, v, [[i * P, 0], [i * P, nb * P]]), true);
      lip += this.d(onP(o, u, v, [[i * P + 1.1, 0], [i * P + 1.1, nb * P]]), true);
      for (t = 3; t < nb * P; t += 6.5) { q = proj(onP(o, u, v, [[i * P - 1.6, t]])[0]); bolts += 'M' + r1(q[0] - br) + ' ' + r1(q[1]) + 'a' + br + ' ' + br + ' 0 1 0 ' + 2 * br + ' 0a' + br + ' ' + br + ' 0 1 0 ' + (-2 * br) + ' 0'; }
    }
    for (j = 1; j < nb; j++) {
      seams += this.d(onP(o, u, v, [[0, j * P], [na * P, j * P]]), true);
      lip += this.d(onP(o, u, v, [[0, j * P + 1.1], [na * P, j * P + 1.1]]), true);
      for (t = 3; t < na * P; t += 6.5) { q = proj(onP(o, u, v, [[t, j * P - 1.6]])[0]); bolts += 'M' + r1(q[0] - br) + ' ' + r1(q[1]) + 'a' + br + ' ' + br + ' 0 1 0 ' + 2 * br + ' 0a' + br + ' ' + br + ' 0 1 0 ' + (-2 * br) + ' 0'; }
    }
    if (seams) {
      this.out.push('<path d="' + seams + '" fill="none" stroke="#6F7980" stroke-width="1.4"/>');
      this.out.push('<path d="' + lip + '" fill="none" stroke="#FFFFFF" stroke-opacity=".6" stroke-width=".8"/>');
      this.out.push('<path d="' + bolts + '" fill="#59636A"/>');
    }
  };
  Sym.prototype.box = function (x, y, z, w, d, h, col, c) {
    this.ext([x, y, z], X, Y, rect(0, 0, w, d), [0, 0, h], col, c, 'flat');
    // catch-light along the lid edges that border visible side faces
    if (w > 4 && d > 4 && h > 2) {
      var zt = z + h, px = dot(X, V) > 0, py = dot(Y, V) > 0;
      var cA = [px ? x + w : x, py ? y + d : y, zt];
      this.line3([[px ? x : x + w, py ? y + d : y, zt], cA, [px ? x + w : x, py ? y : y + d, zt]], '#FFFFFF', 0.7, 0.55);
    }
  };
  // smooth surface of revolution about a vertical axis; prof = [[z, r], ...] bottom to top. Colours are baked per facet.
  // aFrom/aTo: azimuth range in degrees (default full turn); inside: render the inner surface (for cutaways)
  Sym.prototype.lathe = function (cx, cy, prof, col, nSeg, aFrom, aTo, inside) {
    nSeg = nSeg || 56;
    var m = this.M(), quads = [], i, j, k, s = '', A0 = (aFrom || 0) * PI / 180, A1 = (aTo === undefined ? 360 : aTo) * PI / 180, sg = inside ? -1 : 1;
    for (j = 0; j < prof.length - 1; j++) {
      var z0 = prof[j][0], ra = prof[j][1], z1 = prof[j + 1][0], rb = prof[j + 1][1];
      var dz = z1 - z0, dr = rb - ra, ln = Math.sqrt(dz * dz + dr * dr) || 1;
      for (i = 0; i < nSeg; i++) {
        var a0 = A0 + i / nSeg * (A1 - A0), a1 = A0 + (i + 1) / nSeg * (A1 - A0), am = (a0 + a1) / 2;
        var nn = [sg * Math.cos(am) * dz / ln, sg * Math.sin(am) * dz / ln, -sg * dr / ln];
        if (dot(nn, V) <= -0.02) continue;
        quads.push([[[cx + ra * Math.cos(a0), cy + ra * Math.sin(a0), z0], [cx + ra * Math.cos(a1), cy + ra * Math.sin(a1), z0],
          [cx + rb * Math.cos(a1), cy + rb * Math.sin(a1), z1], [cx + rb * Math.cos(a0), cy + rb * Math.sin(a0), z1]], nn]);
      }
    }
    quads.sort(function (a, b) { return depthOf(add(a[0][0], a[0][2])) - depthOf(add(b[0][0], b[0][2])); });
    for (k = 0; k < quads.length; k++) {
      var f = mixc(col, shade(quads[k][1], m));
      this.out.push('<path d="' + this.d(quads[k][0]) + '" fill="' + f + '" stroke="' + f + '" stroke-width=".7" stroke-linejoin="round"/>');
    }
  };
  Sym.prototype.cx = function (x, y, z, len, r, col, c) { this.ext([x, y, z], Y, Z, circ(0, 0, r), [len, 0, 0], col, c, 'smooth'); };
  Sym.prototype.cy = function (x, y, z, len, r, col, c) { this.ext([x, y, z], X, Z, circ(0, 0, r), [0, len, 0], col, c, 'smooth'); };
  Sym.prototype.cz = function (x, y, z, len, r, col, c) { this.ext([x, y, z], X, Y, circ(0, 0, r), [0, 0, len], col, c, 'smooth'); };

  Sym.prototype.sphere = function (c, r, col) {
    this.acc3(c);
    var q = proj(c), R = r * 1.2247, id = this.id + '-s' + (this.n++);
    this.grow(q, R);
    this.defs.push('<radialGradient id="' + id + '" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset=".35" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".72" stop-color="#000000" stop-opacity=".14"/><stop offset="1" stop-color="#000000" stop-opacity=".45"/></radialGradient>');
    this.out.push('<circle cx="' + r1(q[0]) + '" cy="' + r1(q[1]) + '" r="' + r1(R) + '" fill="' + col + '"' + this.tagAttr(col) + EDGE + '/>');
    this.out.push('<circle cx="' + r1(q[0]) + '" cy="' + r1(q[1]) + '" r="' + r1(R) + '" fill="url(#' + id + ')"/>');
  };

  // rotating fan wheel on a plane. The plane->screen map is affine, so blades are drawn in
  // local 2D coordinates inside a matrix() group and spun with CSS (.rot) or SMIL (anim).
  Sym.prototype.rotor = function (o, u, v, cx, cy, r, nb, name) {
    if (this.hidden(onP(o, u, v, circ(cx, cy, r, 8)))) return;
    this.on(o, u, v, circ(cx, cy, r, 40), '#30373C', null, false);
    var n = newell(onP(o, u, v, [[0, 0], [1, 0], [1, 1], [0, 1]])); if (dot(n, V) < 0) n = mul(n, -1);
    var sh = shade(n), p0 = proj(o), pu = proj(add(o, u)), pv = proj(add(o, v));
    var m = 'matrix(' + r3(pu[0] - p0[0]) + ' ' + r3(pu[1] - p0[1]) + ' ' + r3(pv[0] - p0[0]) + ' ' + r3(pv[1] - p0[1]) + ' ' + r3(p0[0]) + ' ' + r3(p0[1]) + ')';
    var base = [[r * 0.2, -r * 0.08], [r * 0.58, -r * 0.34], [r * 0.93, -r * 0.26], [r * 0.9, r * 0.02], [r * 0.55, -r * 0.02], [r * 0.2, r * 0.1]];
    var s = '<g transform="' + m + '"><g transform="translate(' + r1(cx) + ' ' + r1(cy) + ')">';
    var k, p, d, i, bl = mixc(BLADE, sh), bd = mixc('#9EA7AD', sh), blades = '';
    for (k = 0; k < nb; k++) {
      p = rot2(base, k / nb * PI * 2, 0, 0); d = '';
      for (i = 0; i < p.length; i++) d += (i ? 'L' : 'M') + r1(p[i][0]) + ' ' + r1(p[i][1]);
      blades += '<path d="' + d + 'Z" fill="' + bl + '" stroke="' + bd + '" stroke-width="' + r1(r * 0.02 + 0.2) + '"/>';
    }
    var spin = '<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1.1s" repeatCount="indefinite"/>';
    if (this.mui) {
      // MUI two-state animation: static blades while Off, spinning copy while On
      s += '<g class="animateOff">' + blades + '</g><g class="animateOn" display="none"><g>' + spin + blades + '</g></g>';
    } else {
      s += '<g class="rot">' + (this.anim ? spin : '') + '<circle r="' + r1(r) + '" fill="none"/>' + blades + '</g>';
    }
    var hr = r1(r * 0.27);
    s += '<circle r="' + hr + '" fill="' + ST + '"' + cls(name ? 'st#' + name : 'st') + '/>';
    if (sh[1] > 0.01) s += '<circle r="' + hr + '" fill="' + sh[0] + '" fill-opacity="' + sh[1] + '"/>';
    s += '<circle r="' + r1(r * 0.08) + '" fill="#2A3136"/></g></g>';
    this.out.push(s);
  };
  Sym.prototype.fan = Sym.prototype.rotor;
  Sym.prototype.guard = function (o, u, v, cx, cy, r) {
    this.ln(o, u, v, ringPts(cx, cy, r * 0.5, 36), '#B9C0C5', 0.7);
    this.ln(o, u, v, ringPts(cx, cy, r * 0.8, 44), '#B9C0C5', 0.7);
    this.ln(o, u, v, [[cx - r, cy], [cx + r, cy]], '#B9C0C5', 0.8);
    this.ln(o, u, v, [[cx, cy - r], [cx, cy + r]], '#B9C0C5', 0.8);
  };
  Sym.prototype.svg = function () {
    var p = 3, x = Math.floor(this.x0 - p), y = Math.floor(this.y0 - p), W = Math.ceil(this.x1 + p) - x, H = Math.ceil(this.y1 + p) - y;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x + ' ' + y + ' ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' +
      (this.defs.length ? '<defs>' + this.defs.join('') + '</defs>' : '') + this.final() + '</svg>';
  };

  // axis mapping for parametric parts: a = along the run, t = across (horizontal), h = across (vertical)
  function AX(dir) {
    if (dir === 'y') return { dir: 'y', P: function (a, t, h) { return [t, a, h]; }, U: Y, TU: X, TV: Z };
    if (dir === 'z') return { dir: 'z', P: function (a, t, h) { return [t, h, a]; }, U: Z, TU: X, TV: Y };
    return { dir: 'x', P: function (a, t, h) { return [a, t, h]; }, U: X, TU: Y, TV: Z };
  }
  function boxA(s, m, a0, t0, h0, la, lt, lh, col, c) {
    var o = m.P(a0, t0, h0), z = m.P(la, lt, lh);
    s.box(o[0], o[1], o[2], z[0], z[1], z[2], col, c);
  }
  function cylA(s, m, a0, len, r, col, c, t, h) {
    var o = m.P(a0, t || 0, h || 0);
    if (m.dir === 'y') s.cy(o[0], o[1], o[2], len, r, col, c);
    else if (m.dir === 'z') s.cz(o[0], o[1], o[2], len, r, col, c);
    else s.cx(o[0], o[1], o[2], len, r, col, c);
  }

  function serpU(x0, x1, z0, dz, rows) {
    var p = [], k, z, i, t, rr = dz / 2, a, b, sgn;
    for (k = 0; k < rows; k++) {
      z = z0 + k * dz; a = k % 2 ? x1 : x0; b = k % 2 ? x0 : x1; sgn = k % 2 ? -1 : 1;
      p.push([a, z]); p.push([b, z]);
      if (k < rows - 1) for (i = 1; i < 10; i++) { t = -PI / 2 + i / 10 * PI; p.push([b + sgn * rr * Math.cos(t), z + rr + rr * Math.sin(t)]); }
    }
    return p;
  }
  function drop(cx, cy, s) {
    var p = [[cx, cy + 2.4 * s]], i, t;
    for (i = 0; i <= 12; i++) { t = (20 - i * 220 / 12) * PI / 180; p.push([cx + s * Math.cos(t), cy + s * Math.sin(t)]); }
    return p;
  }

  var B = {}, DEF = {}, PORTS = {}, CEN = {};

  /* ---------------- parametric parts ---------------- */

  DEF.jetfan = { dir: 'x', len: 220, d: 56 };
  B.jetfan = function (s, p) {
    var m = AX(p.dir), Ln = p.len, r = p.d / 2, sl = Ln * 0.3, k, a;
    cylA(s, m, 0, sl, r, BODY);
    for (k = 1; k * 8 < sl - 2; k++) s.ring(m.P(k * 8, 0, 0), m.TU, m.TV, r + 0.15, '#8E979D', 0.9);
    cylA(s, m, sl, 3, r * 1.13, FRAME);
    cylA(s, m, sl + 3, Ln - 2 * sl - 6, r * 1.06, BODY);
    boxA(s, m, Ln * 0.44, r * 0.9, -r * 0.3, 18, 8, 15, DARK);
    s.on(m.P(0, r * 0.9 + 8, 0), m.U, Z, circ(Ln * 0.44 + 9, 0, 2.6, 18), ST, 'st#run');
    cylA(s, m, Ln - sl - 3, 3, r * 1.13, FRAME);
    cylA(s, m, Ln - sl, sl, r, BODY);
    for (k = 1; k * 8 < sl - 2; k++) s.ring(m.P(Ln - sl + k * 8, 0, 0), m.TU, m.TV, r + 0.15, '#8E979D', 0.9);
    var br = [Ln * 0.18, Ln * 0.82 - 14];
    for (k = 0; k < 2; k++) {
      a = br[k];
      boxA(s, m, a, -3, r * 0.75, 14, 6, r * 0.5 + 4, DARK);
      boxA(s, m, a - 8, -r * 0.5, r * 1.25 + 4, 30, r, 3, FRAME);
    }
    cylA(s, m, Ln, 2.5, r * 1.04, FRAME);
    var o = m.P(Ln + 2.5, 0, 0);
    s.on(o, m.TU, m.TV, circ(0, 0, r * 0.9, 40), '#1F262A', null, false);
    s.rotor(o, m.TU, m.TV, 0, 0, r * 0.84, 7, 'fan');
    s.guard(o, m.TU, m.TV, 0, 0, r * 0.92);
  };
  PORTS.jetfan = function () { return []; };
  CEN.jetfan = function (p) { return AX(p.dir).P(p.len / 2, 0, 0); };

  DEF.inlinefan = { dir: 'x', len: 96, w: 70, h: 50 };
  B.inlinefan = function (s, p) {
    var m = AX(p.dir), Ln = p.len, w = p.w, h = p.h, bw = w + 14, bh = h + 14, mr = Math.min(12, bh * 0.2);
    boxA(s, m, 0, -w / 2 - 3, -h / 2 - 3, 3, w + 6, h + 6, FRAME);
    boxA(s, m, 3, -bw / 2, -bh / 2, Ln - 6, bw, bh, BODY);
    boxA(s, m, Ln * 0.28, -bw * 0.2, bh / 2, Ln * 0.44, bw * 0.4, 3, DARK);
    cylA(s, m, Ln * 0.24, Ln * 0.46, mr, ST, 'st#motor', 0, bh / 2 + 3 + mr);
    cylA(s, m, Ln * 0.7, 3, mr * 0.7, DARK, null, 0, bh / 2 + 3 + mr);
    var so = m.P(0, bw / 2, 0), su = m.U, sv = Z, rr = Math.min(Ln * 0.3, bh * 0.36);
    if (m.dir === 'z') { sv = X; so = m.P(0, 0, bh / 2); }
    s.on(so, su, sv, rect(Ln * 0.1, -bh / 2 + 5, Ln * 0.8, bh - 10), PANEL);
    s.on(so, su, sv, circ(Ln / 2, 0, rr + 3, 40), FRAME);
    s.rotor(so, su, sv, Ln / 2, 0, rr, 7, 'fan');
    s.on(so, su, sv, rect(Ln * 0.84, -6, 2.5, 12), DARK);
    boxA(s, m, Ln - 3, -w / 2 - 3, -h / 2 - 3, 3, w + 6, h + 6, FRAME);
    s.on(m.P(Ln, 0, 0), m.TU, m.TV, rect(-w / 2 + 1.5, -h / 2 + 1.5, w - 3, h - 3), WIN, null, false);
  };
  PORTS.inlinefan = function (p) { return ductPorts(p); };
  CEN.inlinefan = function (p) { return AX(p.dir).P(p.len / 2, 0, 0); };

  DEF.duct = { dir: 'x', len: 120, w: 70, h: 50 };
  B.duct = function (s, p) {
    var m = AX(p.dir), Ln = p.len, w = p.w, h = p.h, k, a;
    boxA(s, m, 0, -w / 2 - 2.5, -h / 2 - 2.5, 3, w + 5, h + 5, FRAME);
    boxA(s, m, 3, -w / 2, -h / 2, Ln - 6, w, h, DUCT);
    var nb = Math.floor((Ln - 6) / 40);
    for (k = 1; k <= nb; k++) {
      a = 3 + (Ln - 6) * k / (nb + 1);
      s.line3([m.P(a, -w / 2, h / 2), m.P(a, w / 2, h / 2), m.P(a, w / 2, -h / 2)], '#8F989E', 0.9);
    }
    boxA(s, m, Ln - 3, -w / 2 - 2.5, -h / 2 - 2.5, 3, w + 5, h + 5, FRAME);
    s.on(m.P(Ln, 0, 0), m.TU, m.TV, rect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2), WIN, null, false);
  };
  function ductPorts(p) {
    var m = AX(p.dir);
    return [{ p: [0, 0, 0], ax: '-' + p.dir, kind: 'duct', w: p.w, h: p.h }, { p: m.P(p.len, 0, 0), ax: '+' + p.dir, kind: 'duct', w: p.w, h: p.h }];
  }
  PORTS.duct = ductPorts;
  CEN.duct = function (p) { return AX(p.dir).P(p.len / 2, 0, 0); };

  // short flange collar centred on a duct junction (used by MUI snap sets)
  DEF.ductjoint = { dir: 'x', w: 70, h: 50 };
  B.ductjoint = function (s, p) {
    var m = AX(p.dir);
    boxA(s, m, -4, -p.w / 2 - 3, -p.h / 2 - 3, 8, p.w + 6, p.h + 6, FRAME);
    s.on(m.P(4, 0, 0), m.TU, m.TV, rect(-p.w / 2 + 1, -p.h / 2 + 1, p.w - 2, p.h - 2), WIN, null, false);
  };
  CEN.ductjoint = function () { return [0, 0, 0]; };

  DEF.pipe = { dir: 'x', len: 120, d: 12, svc: 'chws', flange: 1 };
  B.pipe = function (s, p) {
    s.mat = 'pipe';
    var m = AX(p.dir), r = p.d / 2, col = SVC[p.svc] || STEEL, Ln = p.len, f = p.flange ? Math.max(2, r * 0.45) : 0;
    var fc = mixc(col, ['#000000', 0.18]);
    s.tags[col] = 'pipCol'; s.tags[fc] = 'pipFl';
    if (f) cylA(s, m, 0, f, r * 1.65, fc);
    cylA(s, m, f, Ln - 2 * f, r, col);
    if (f) cylA(s, m, Ln - f, f, r * 1.65, fc);
  };
  PORTS.pipe = function (p) {
    var m = AX(p.dir);
    return [{ p: [0, 0, 0], ax: '-' + p.dir, kind: 'pipe', d: p.d }, { p: m.P(p.len, 0, 0), ax: '+' + p.dir, kind: 'pipe', d: p.d }];
  };
  CEN.pipe = function (p) { return AX(p.dir).P(p.len / 2, 0, 0); };

  DEF.joint = { d: 12, svc: 'chws' };
  B.joint = function (s, p) {
    s.mat = 'pipe'; var col = SVC[p.svc] || STEEL; s.tags[col] = 'pipCol'; s.sphere([0, 0, 0], p.d / 2 * 1.12, col); };
  PORTS.joint = function (p) { return [{ p: [0, 0, 0], ax: 'any', kind: 'pipe', d: p.d }]; };
  CEN.joint = function () { return [0, 0, 0]; };

  // Air-cooled screw chiller (DX evaporator), compressor and fan counts configurable
  DEF.screw = { comp: 2, fans: 4, rows: 2 };
  function screwDims(p) {
    var rows = p.rows == 1 ? 1 : 2, cols = Math.ceil(p.fans / rows), W = rows == 2 ? 124 : 76;
    var Lu = Math.max(cols * 64, p.comp * 64);
    return { rows: rows, cols: cols, W: W, H: 120, Lu: Lu, L: Lu + 56 };
  }
  B.screw = function (s, p) {
    var g = screwDims(p), W = g.W, H = g.H, Lu = g.Lu, L = g.L, i, j, k, nc = p.comp;
    s.shadowRect(-4, -4, L + 8, W + 8, 0.32, 7);
    s.box(0, 0, 0, L, W, 8, DARK);
    s.box(0, 0, 8, 6, 6, 52, FRAME);
    s.cx(8, W * 0.28, 30, Lu - 16, 15, BODY);
    s.ring([Lu * 0.3, W * 0.28, 30], Y, Z, 15.2, '#8E979D', 1);
    s.ring([Lu * 0.7, W * 0.28, 30], Y, Z, 15.2, '#8E979D', 1);
    var sp = Lu / nc;
    for (i = 0; i < nc; i++) {
      var xc = sp * (i + 0.5), yc = W * 0.66;
      s.box(xc - 26, yc - 11, 8, 50, 22, 5, DARK);
      s.cz(xc - 12, yc, 38, 22, 3, REF);
      s.cx(xc - 26, yc, 27, 30, 13, '#9AA2A8');
      s.ring([xc - 16, yc, 27], Y, Z, 13.2, '#7B848B', 0.8);
      s.cx(xc + 4, yc, 27, 3, 14.5, FRAME);
      s.cx(xc + 7, yc, 27, 20, 12, ST, 'st#comp' + (i + 1));
      for (k = 0; k < 3; k++) s.ring([xc + 11 + k * 5, yc, 27], Y, Z, 12.2, '#000000', 0.5);
      s.cx(xc + 27, yc, 27, 3, 8, DARK);
    }
    s.box(0, W - 6, 8, 6, 6, 52, FRAME);
    for (i = 1; i < nc; i++) s.box(sp * i - 3, W - 6, 8, 6, 6, 52, FRAME);
    s.cy(18, W - 10, 26, 19, 6, CHW); s.cy(18, W + 9, 26, 3, 9.5, CHW);
    s.cy(42, W - 10, 26, 19, 6, SVC.chwr); s.cy(42, W + 9, 26, 3, 9.5, SVC.chwr);
    // condenser coil section
    s.box(0, 0, 60, Lu, W, H - 60, BODY);
    var Lf = [0, W, 0];
    s.on(Lf, X, Z, rect(5, 64, Lu - 10, H - 70), FIN, null, false);
    for (k = 0; 7 + k * 3.2 < Lu - 6; k++) s.ln(Lf, X, Z, [[7 + k * 3.2, 64], [7 + k * 3.2, H - 6]], '#B1BBC3', 0.45);
    for (i = 1; i < g.cols; i++) s.on(Lf, X, Z, rect(Lu / g.cols * i - 1.5, 62, 3, H - 66), FRAME, null, false);
    s.on(Lf, X, Z, rect(0, 60, Lu, 3), FRAME, null, false);
    // fans on top deck
    var bay = Lu / g.cols, fr = Math.min(bay / 2 - 6, W / g.rows / 2 - 6), n = 0;
    for (j = 0; j < g.rows; j++) for (i = 0; i < g.cols; i++) {
      if (j * g.cols + i >= p.fans) continue;
      n++;
      var fx = bay * (i + 0.5), fy = W / g.rows * (j + 0.5), o = [0, 0, H + 6];
      s.cz(fx, fy, H, 6, fr + 3, FRAME);
      s.rotor(o, X, Y, fx, fy, fr, 5, 'fan' + (j * g.cols + i + 1));
      s.guard([0, 0, H + 6.3], X, Y, fx, fy, fr);
    }
    // control / electrical cabinet
    s.box(Lu, 0, 8, 56, W, H - 8, PANEL);
    var Cf = [0, W, 0];
    s.on(Cf, X, Z, rect(Lu + 4, 14, 22, H - 24), PANEL);
    s.on(Cf, X, Z, rect(Lu + 30, 14, 22, H - 24), PANEL);
    s.on(Cf, X, Z, rect(Lu + 8, H - 42, 14, 10), GLASS);
    s.on(Cf, X, Z, circ(Lu + 15, H - 52, 2.6, 18), ST, 'st#run');
    s.on(Cf, X, Z, rect(Lu + 23, 56, 2, 12), DARK); s.on(Cf, X, Z, rect(Lu + 31, 56, 2, 12), DARK);
    for (k = 0; k < 9; k++) s.on([L, 0, 0], Y, Z, rect(10, 20 + k * 7, W - 20, 3), '#8E979D', null, false);
  };
  PORTS.screw = function (p) {
    var g = screwDims(p);
    return [{ p: [18, g.W + 12, 26], ax: '+y', kind: 'pipe', d: 12 }, { p: [42, g.W + 12, 26], ax: '+y', kind: 'pipe', d: 12 }];
  };
  CEN.screw = function (p) { var g = screwDims(p); return [g.L / 2, g.W / 2, 60]; };

  function depthOf(p) { return dot(p, V); }

  // 90-degree bend: legs along directions a and b from the corner, smooth arc in between
  DEF.elbow = { a: '+x', b: '+y', d: 12, svc: 'chws' };
  function fixPerp(a, b) { if (a.charAt(1) !== b.charAt(1)) return b; return a.charAt(1) === 'z' ? '+x' : '+z'; }
  function elbowGeo(p) { p.b = fixPerp(p.a, p.b); var Rb = p.d * 1.5; return { r: p.d / 2, Rb: Rb, L: Rb + 10, A: dv(p.a), B: dv(p.b) }; }
  B.elbow = function (s, p) {
    s.mat = 'pipe';
    var g = elbowGeo(p), col = SVC[p.svc] || STEEL, parts = [], k, N = 16;
    s.tags[col] = 'pipCol';
    var C0 = add(mul(g.A, g.Rb), mul(g.B, g.Rb));
    function pt(t) { return sub(sub(C0, mul(g.B, g.Rb * Math.cos(t))), mul(g.A, g.Rb * Math.sin(t))); }
    parts.push([mul(g.A, g.L), pt(0), dot(g.A, V) > 0 ? 'B' : false]);
    parts.push([mul(g.B, g.L), pt(PI / 2), dot(g.B, V) > 0 ? 'B' : false]);
    var dth = (PI / 2) / N, e = g.r * Math.tan(dth / 2) + 0.5;
    for (k = 1; k <= N; k++) {
      var q0 = pt((k - 1) * dth), q1 = pt(k * dth), dn = nrm(sub(q1, q0));
      parts.push([sub(q0, mul(dn, e)), add(q1, mul(dn, e)), false]);
    }
    parts.sort(function (x, y) { return depthOf(add(x[0], x[1])) - depthOf(add(y[0], y[1])); });
    for (k = 0; k < parts.length; k++) s.cyl(parts[k][0], parts[k][1], g.r, col, null, parts[k][2]);
  };
  PORTS.elbow = function (p) { var g = elbowGeo(p); return [{ p: mul(g.A, g.L), ax: p.a, kind: 'pipe', d: p.d }, { p: mul(g.B, g.L), ax: p.b, kind: 'pipe', d: p.d }]; };
  CEN.elbow = function (p) { var g = elbowGeo(p); return mul(add(g.A, g.B), g.L / 2); };

  // tee: straight run along `run`, branch towards `br`
  DEF.tee = { run: 'x', br: '+y', d: 12, svc: 'chws' };
  B.tee = function (s, p) {
    s.mat = 'pipe';
    p.br = fixPerp('+' + p.run, p.br);
    var r = p.d / 2, Ln = p.d * 2 + 8, col = SVC[p.svc] || STEEL, R = dv('+' + p.run), Bv = dv(p.br);
    s.tags[col] = 'pipCol';
    var run = function () { s.cyl(mul(R, -Ln), mul(R, Ln), r, col); };
    var branch = function () { s.cyl([0, 0, 0], mul(Bv, Ln), r, col, null, dot(Bv, V) > 0 ? 'T' : false); };
    if (dot(Bv, V) > 0) { run(); branch(); } else { branch(); run(); }
    s.sphere([0, 0, 0], r * 1.08, col);
  };
  PORTS.tee = function (p) {
    p.br = fixPerp('+' + p.run, p.br); var Ln = p.d * 2 + 8, R = dv('+' + p.run);
    return [{ p: mul(R, -Ln), ax: '-' + p.run, kind: 'pipe', d: p.d }, { p: mul(R, Ln), ax: '+' + p.run, kind: 'pipe', d: p.d }, { p: mul(dv(p.br), Ln), ax: p.br, kind: 'pipe', d: p.d }];
  };
  CEN.tee = function () { return [0, 0, 0]; };

  // --- small realistic fittings
  // valve body on a pipe with a handwheel on top
  Sym.prototype.valveWheel = function (c, r, bodyCol, wheelCol) {
    this.mat = 'metal';
    this.cz(c[0], c[1], c[2] - r * 0.9, r * 1.8, r * 0.95, bodyCol || '#8E979D');
    this.cz(c[0], c[1], c[2] + r * 0.9, r * 1.6, r * 0.28, '#B7BEC3');
    this.mat = 'paint';
    this.cz(c[0], c[1], c[2] + r * 2.5, r * 0.35, r * 1.7, wheelCol || '#C0392B');
    this.cz(c[0], c[1], c[2] + r * 2.85, r * 0.3, r * 0.45, '#3A4247');
  };
  // dial gauge facing +y
  Sym.prototype.gaugeY = function (x, y, z, r) {
    this.mat = 'metal';
    this.cy(x, y, z, r * 0.5, r * 1.12, '#9AA3A9');
    this.mat = 'paint';
    this.on([0, y + r * 0.5 + 0.05, 0], X, Z, circ(x, z, r * 0.95, 28), '#FAFBFB', null, false);
    this.ln([0, y + r * 0.5 + 0.1, 0], X, Z, [[x, z], [x + r * 0.55, z + r * 0.45]], '#C0392B', Math.max(0.6, r * 0.14));
    this.on([0, y + r * 0.5 + 0.12, 0], X, Z, circ(x, z, r * 0.12, 10), '#2A3136', null, false);
  };

  // ---------- liquid level (cutaway) primitives ----------
  // prof = [[z, r], ...] ascending z. Shapes are regenerated at runtime by MUI (csAnimations.js) from the data-* attributes,
  // so the formulas here and in the runtime script must stay identical.
  function rAtProf(prof, z) {
    var i, a, b;
    if (z <= prof[0][0]) return prof[0][1];
    for (i = 1; i < prof.length; i++) if (z <= prof[i][0]) { a = prof[i - 1]; b = prof[i]; return a[1] + (b[1] - a[1]) * (z - a[0]) / ((b[0] - a[0]) || 1); }
    return prof[prof.length - 1][1];
  }
  function profStr(prof) { var s = [], i; for (i = 0; i < prof.length; i++) s.push(r1(prof[i][0]) + ' ' + r1(prof[i][1])); return s.join(' '); }
  // sp.wave = [amplitude, wavelength]: the free surface edge becomes a sine wave; ph = phase (animated through 4 frames)
  // sp.corner = world xy the wave phase is measured from (so both cut planes stay continuous at the corner)
  function waveZ(sp, a, zl, ph) {
    if (!sp.wave) return zl;
    return Math.max(sp.zmin, Math.min(sp.zmax, zl + sp.wave[0] * Math.sin(2 * PI * a / sp.wave[1] + ph)));
  }
  function lvlShape(kind, sp, v, ph) {
    var zl = sp.zmin + (sp.zmax - sp.zmin) * v, pts = [], i, j, s = '', rr, n;
    ph = ph || 0;
    if (kind === 'plane') {
      var pp = [[0, sp.zmin]], rz;
      for (i = 0; i < sp.prof.length; i++) { if (sp.prof[i][0] >= zl) break; if (sp.prof[i][0] >= sp.zmin) pp.push([sp.prof[i][1], sp.prof[i][0]]); }
      rz = rAtProf(sp.prof, zl);
      if (sp.wave) { n = Math.max(4, Math.ceil(rz / 2)); for (i = 0; i <= n; i++) { var aw = rz * (1 - i / n); pp.push([aw, waveZ(sp, aw, zl, ph)]); } }
      else { pp.push([rz, zl]); pp.push([0, zl]); }
      for (i = 0; i < pp.length; i++) pts.push([sp.o[0] + pp[i][0] * sp.u[0], sp.o[1] + pp[i][0] * sp.u[1] - pp[i][1]]);
    } else {
      var scaled = kind === 'disc' || kind === 'lineR', wpts = [];
      rr = scaled ? rAtProf(sp.prof, zl) : 1;
      for (i = 0; i < sp.pts.length; i++) wpts.push(scaled ? [sp.c[0] + sp.pts[i][0] * rr, sp.c[1] + sp.pts[i][1] * rr] : [sp.pts[i][0], sp.pts[i][1]]);
      if (sp.wave && (kind === 'pline' || kind === 'lineR')) {
        var cn = sp.corner || sp.c;
        for (i = 0; i < wpts.length - 1; i++) {
          var sx = wpts[i + 1][0] - wpts[i][0], sy = wpts[i + 1][1] - wpts[i][1];
          n = Math.max(2, Math.ceil(Math.sqrt(sx * sx + sy * sy) / 2));
          for (j = (i ? 1 : 0); j <= n; j++) {
            var wx = wpts[i][0] + sx * j / n, wy = wpts[i][1] + sy * j / n, ad = Math.sqrt((wx - cn[0]) * (wx - cn[0]) + (wy - cn[1]) * (wy - cn[1]));
            pts.push([(wx - wy) * C, (wx + wy) * S - waveZ(sp, ad, zl, ph)]);
          }
        }
      } else {
        for (i = 0; i < wpts.length; i++) pts.push([(wpts[i][0] - wpts[i][1]) * C, (wpts[i][0] + wpts[i][1]) * S - zl]);
      }
    }
    for (i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + r1(pts[i][0]) + ' ' + r1(pts[i][1]);
    return { d: (kind === 'pline' || kind === 'lineR') ? s : s + 'Z', pts: pts };
  }
  Sym.prototype.liquid = function (kind, sp, v, fill, extra) {
    var sh = lvlShape(kind, sp, v, 0), hi = lvlShape(kind, sp, 1, 0), lo = lvlShape(kind, sp, 0, 0), i, attrs = ' data-lvl="' + kind + '" data-z="' + r1(sp.zmin) + ' ' + r1(sp.zmax) + '"';
    for (i = 0; i < hi.pts.length; i++) this.grow(hi.pts[i]);
    for (i = 0; i < lo.pts.length; i++) this.grow(lo.pts[i]);
    if (kind === 'plane') attrs += ' data-o="' + r3(sp.o[0]) + ' ' + r3(sp.o[1]) + '" data-u="' + r3(sp.u[0]) + ' ' + r3(sp.u[1]) + '" data-prof="' + profStr(sp.prof) + '"';
    else {
      var ps = [];
      for (i = 0; i < sp.pts.length; i++) ps.push(r3(sp.pts[i][0]) + ' ' + r3(sp.pts[i][1]));
      attrs += ' data-pts="' + ps.join(' ') + '"';
      if (kind === 'disc' || kind === 'lineR') attrs += ' data-c="' + r1(sp.c[0]) + ' ' + r1(sp.c[1]) + '" data-prof="' + profStr(sp.prof) + '"';
    }
    if (sp.wave) {
      attrs += ' data-wave="' + sp.wave[0] + ' ' + sp.wave[1] + '"' + (sp.corner ? ' data-corner="' + r1(sp.corner[0]) + ' ' + r1(sp.corner[1]) + '"' : '');
      var fr = [], k;
      for (k = 0; k < 4; k++) fr.push(lvlShape(kind, sp, v, k * PI / 2).d);
      fr.push(fr[0]);
      this.out.push('<path class="lvl" d="' + sh.d + '" fill="' + fill + '"' + attrs + (extra || '') + '><animate attributeName="d" dur="' + (sp.wave[2] || 2.4) + 's" repeatCount="indefinite" values="' + fr.join(';') + '"/></path>');
    } else {
      this.out.push('<path class="lvl" d="' + sh.d + '" fill="' + fill + '"' + attrs + (extra || '') + '/>');
    }
  };
  Sym.prototype.liquidDefs = function (top, deep) {
    return {
      body: this.def1('liq', '<linearGradient id="@ID" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/><stop offset="1" stop-color="' + deep + '"/></linearGradient>'),
      surf: this.def1('liqs', '<linearGradient id="@ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".32"/><stop offset=".5" stop-color="' + top + '" stop-opacity=".16"/><stop offset="1" stop-color="' + top + '" stop-opacity=".26"/></linearGradient>')
    };
  };

  // N2 storage tank: white vertical pressure vessel, elliptical heads, legs, instrument/valve manifold. cut=1 -> cutaway with live level
  DEF.n2tank = { h: 140, d: 64, cut: 0, level: 65 };
  function n2Geo(p) { var r = p.d / 2, z0 = 30, hb = r * 0.5; return { r: r, z0: z0, hb: hb, zc0: z0 + hb, zc1: z0 + hb + p.h, zt: z0 + hb + p.h + hb }; }
  function n2Prof(g, rr, N) {
    var prof = [], k, a, hb = g.hb * rr / g.r;
    for (k = 0; k <= N; k++) { a = -PI / 2 + k / N * PI / 2; prof.push([g.zc0 + hb * Math.sin(a), Math.max(0.01, rr * Math.cos(a))]); }
    prof.push([g.zc1, rr]);
    for (k = 1; k <= N; k++) { a = k / N * PI / 2; prof.push([g.zc1 + hb * Math.sin(a), Math.max(0.01, rr * Math.cos(a))]); }
    return prof;
  }
  B.n2tank = function (s, p) {
    var g = n2Geo(p), r = g.r, k, a, legs = [], cut = !!p.cut, i;
    var prof = n2Prof(g, r, 10), ri = r - 3.2, pin = n2Prof(g, ri, 10);
    s.shadowDisc(0, 0, r * 1.25, 0.32, 7);
    s.box(-r * 1.3, -r * 1.3, 0, r * 2.6, r * 2.6, 5, '#BFC3C5');
    for (k = 0; k < 4; k++) { a = PI / 4 + k * PI / 2; legs.push([Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78]); }
    legs.sort(function (m, n) { return (m[0] + m[1]) - (n[0] + n[1]); });
    for (k = 0; k < 4; k++) {
      s.box(legs[k][0] - 6, legs[k][1] - 6, 5, 12, 12, 2, '#6B747A');
      s.mat = 'metal'; s.cz(legs[k][0], legs[k][1], 7, g.zc0 - 7 - g.hb * 0.35, 2.6, '#8A9399'); s.mat = 'paint';
    }
    if (!cut) {
      s.lathe(0, 0, prof, '#E9ECEE', 60);
      s.ring([0, 0, g.zc0], X, Y, r + 0.15, '#B9BFC3', 0.9);
      s.ring([0, 0, g.zc1], X, Y, r + 0.15, '#B9BFC3', 0.9);
      s.ring([0, 0, g.zc0 + p.h * 0.5], X, Y, r + 0.15, '#C7CCD0', 0.7);
      s.ring([0, 0, g.zc0 + p.h * 0.3], X, Y, r + 0.3, '#2F6DB5', 3.2);
      var fx = r * 0.7071 + 0.8, fz = g.zc0 + p.h * 0.62;
      s.label([fx, fx, fz], [0.7071, -0.7071, 0], [0, 0, -1], 'N2', Math.max(10, r * 0.6), '#1F4E8C');
      s.label([fx, fx, fz - r * 0.5], [0.7071, -0.7071, 0], [0, 0, -1], 'NITROGEN', Math.max(4, r * 0.15), '#3A4A5A');
    } else {
      // outer shell without the front quadrant
      s.lathe(0, 0, prof, '#E9ECEE', 64, 90, 360);
      // interior seen through the two cut planes
      var zmin = pin[0][0], zmax = pin[pin.length - 1][0];
      var secA = [], secB = [];
      for (i = 0; i < pin.length; i++) secA.push([pin[i][1], 0, pin[i][0]]);
      for (i = pin.length - 1; i >= 0; i--) secA.push([0, 0, pin[i][0]]);
      for (i = 0; i < pin.length; i++) secB.push([0, pin[i][1], pin[i][0]]);
      for (i = pin.length - 1; i >= 0; i--) secB.push([0, 0, pin[i][0]]);
      var open = [];
      for (i = 0; i < pin.length; i++) open.push([0, pin[i][1], pin[i][0]]);
      for (i = pin.length - 1; i >= 0; i--) open.push([pin[i][1], 0, pin[i][0]]);
      s.clip(open);
      s.lathe(0, 0, pin, '#8D969C', 64, 90, 360, true);
      var LQ = s.liquidDefs('#BFE6F7', '#6FB8DE'), arc = [[0, 0]];
      for (i = 0; i <= 27; i++) { a = (90 + i * 10) * PI / 180; arc.push([Math.cos(a), Math.sin(a)]); }
      s.liquid('disc', { zmin: zmin, zmax: zmax, prof: pin, c: [0, 0], pts: arc }, p.level / 100, 'url(#' + LQ.surf + ')', ' stroke="#FFFFFF" stroke-opacity=".7" stroke-width=".8"');
      s.unclip();
      var pa = proj([0, 0, 0]), ua = proj([1, 0, 0]), ub = proj([0, 1, 0]);
      s.liquid('plane', { zmin: zmin, zmax: zmax, prof: pin, o: pa, u: [ua[0] - pa[0], ua[1] - pa[1]], wave: [1.1, 13, 2.8] }, p.level / 100, 'url(#' + LQ.body + ')', ' fill-opacity=".92"');
      s.liquid('plane', { zmin: zmin, zmax: zmax, prof: pin, o: pa, u: [ub[0] - pa[0], ub[1] - pa[1]], wave: [1.1, 13, 2.8] }, p.level / 100, 'url(#' + LQ.body + ')', ' fill-opacity=".8"');
      s.liquid('lineR', { zmin: zmin, zmax: zmax, prof: pin, c: [0, 0], pts: [[1, 0], [0, 0], [0, 1]], wave: [1.1, 13, 2.8] }, p.level / 100, 'none', ' stroke="#F2FBFF" stroke-width="1.6" stroke-linejoin="round"');
      // double-wall section bands (outer jacket + inner vessel)
      var bandA = [], bandB = [];
      for (i = 0; i < prof.length; i++) { bandA.push([prof[i][1], 0, prof[i][0]]); bandB.push([0, prof[i][1], prof[i][0]]); }
      for (i = pin.length - 1; i >= 0; i--) { bandA.push([pin[i][1], 0, pin[i][0]]); bandB.push([0, pin[i][1], pin[i][0]]); }
      s.face(bandA, '#9AA3A9', null, false); s.face(bandB, '#AEB6BB', null, false);
      var midA = [], midB = [];
      for (i = 0; i < prof.length; i++) { midA.push([prof[i][1] - 1.6, 0, prof[i][0]]); midB.push([0, prof[i][1] - 1.6, prof[i][0]]); }
      s.line3(midA, '#E4E0D2', 1.1); s.line3(midB, '#E4E0D2', 1.1);
      s.ring([0, 0, g.zc0], X, Y, r + 0.15, '#B9BFC3', 0.9, 90, 360);
      s.ring([0, 0, g.zc1], X, Y, r + 0.15, '#B9BFC3', 0.9, 90, 360);
      s.ring([0, 0, g.zc0 + p.h * 0.3], X, Y, r + 0.3, '#2F6DB5', 3.2, 90, 360);
      var lt = -30 * PI / 180, lz = g.zc0 + p.h * 0.62;
      s.label([Math.cos(lt) * (r + 0.8), Math.sin(lt) * (r + 0.8), lz], [-Math.sin(lt) * -1, -Math.cos(lt), 0], [0, 0, -1], 'N2', Math.max(9, r * 0.5), '#1F4E8C');
    }
    // top: relief valves + vent stack
    s.mat = 'metal';
    s.cz(-r * 0.2, -r * 0.1, g.zt - 2, 8, 2, '#A9B1B7'); s.cz(-r * 0.2, -r * 0.1, g.zt + 6, 6, 3.2, REF);
    s.cz(-r * 0.05, -r * 0.35, g.zt - 3, 7, 2, '#A9B1B7'); s.cz(-r * 0.05, -r * 0.35, g.zt + 4, 5, 3, REF);
    s.cz(-r * 0.3, -r * 0.3, g.zt - 1, 16, 1.6, '#A9B1B7'); s.cz(-r * 0.3, -r * 0.3, g.zt + 15, 2.5, 3, '#6E777D');
    var px = r * 0.97 + 5, py = -r * 0.25;
    s.cyl([r * 0.35, py, g.zt - g.hb * 0.3], [px, py, g.zt - g.hb * 0.3], 1.7, '#A9B1B7', null, false);
    s.cz(px, py, g.zc0 - 6, g.zt - g.hb * 0.3 - g.zc0 + 6, 1.7, '#A9B1B7');
    s.mat = 'paint';
    // manifold on the front-left
    var my = r * 0.95, mx = cut ? -r * 0.62 : 0;
    s.box(mx - r * 0.45, my - 2, 5, r * 0.9, 4, g.zc0 - 2, '#7B848B');
    s.mat = 'metal';
    s.cyl([mx - r * 0.25, my + 5, 12], [mx - r * 0.25, my + 5, g.zc0 - 4], 1.8, '#A9B1B7');
    s.cyl([mx + r * 0.22, my + 5, 12], [mx + r * 0.22, my + 5, g.zc0 - 4], 1.8, '#A9B1B7');
    s.mat = 'paint';
    s.valveWheel([mx - r * 0.25, my + 5, 20], 2.4, '#8E979D', '#2F6DB5');
    s.valveWheel([mx + r * 0.22, my + 5, 24], 2.4, '#8E979D', '#C0392B');
    s.gaugeY(mx, my + 2, g.zc0 - 10, 4.5);
    s.mat = 'metal';
    s.cy(mx + r * 0.22, my + 5, 14, 12, 1.8, '#A9B1B7'); s.cy(mx + r * 0.22, my + 17, 14, 2, 3.4, '#8E979D');
    s.mat = 'paint';
  };
  PORTS.n2tank = function (p) { var g = n2Geo(p), r = g.r, mx = p.cut ? -r * 0.62 : 0; return [{ p: [mx + r * 0.22, r * 0.95 + 19, 14], ax: '+y', kind: 'pipe', d: 4 }]; };
  CEN.n2tank = function (p) { var g = n2Geo(p); return [0, 0, g.zt / 2]; };

  // assembled stainless panel water tank (nx x ny x nz panels) on a steel base. cut=1 -> front corner cut away with live level
  DEF.watertank = { nx: 4, ny: 3, nz: 2, cut: 0, level: 65 };
  var SUS = '#C3CAD0', PNL = 26;
  function wtGeo(p) {
    var g = { X: p.nx * PNL, Y: p.ny * PNL, H: p.nz * PNL, zb: 14 };
    g.xc = Math.max(1, Math.floor(p.nx / 2)) * PNL; g.yc = Math.max(1, Math.floor(p.ny / 2)) * PNL;
    return g;
  }
  B.watertank = function (s, p) {
    var g = wtGeo(p), Xl = g.X, Yl = g.Y, H = g.H, zb = g.zb, k, z, zs, cut = !!p.cut, xc = cut ? g.xc : Xl, yc = cut ? g.yc : Yl, t = 1.6;
    s.shadowRect(-10, -10, Xl + 20, Yl + 20, 0.34, 7);
    s.box(-12, -12, 0, Xl + 24, Yl + 24, 5, '#BFC3C5');
    for (k = 0; k <= p.nx; k++) s.box(Math.min(Math.max(k * PNL - 3, -2), Xl - 4), -5, 5, 6, Yl + 10, 6, '#58626A');
    s.box(-4, -4, 11, Xl + 8, 4, 3, '#4E575D');
    s.box(-4, -4, 11, 4, Yl + 8, 3, '#4E575D');
    s.box(-4, Yl, 11, Xl + 8, 4, 3, '#4E575D');
    s.box(Xl, -4, 11, 4, Yl + 8, 3, '#4E575D');
    var top = zb + H;
    if (!cut) {
      s.mat = 'metal'; s.box(0, 0, zb, Xl, Yl, H, SUS); s.mat = 'paint';
      s.panels([0, Yl, zb], X, Z, p.nx, p.nz, PNL);
      s.panels([Xl, Yl, zb], [0, -1, 0], Z, p.ny, p.nz, PNL);
      s.panels([0, 0, top], X, Y, p.nx, p.ny, PNL);
    } else {
      var zi0 = zb + t, zi1 = top - t;
      // interior through the two cut planes
      s.clip([[xc, Yl - t, zi0], [xc, Yl - t, zi1], [xc, yc, zi1], [Xl - t, yc, zi1], [Xl - t, yc, zi0], [xc, yc, zi0]]);
      s.mat = 'metal';
      s.face([[t, t, zi0], [Xl - t, t, zi0], [Xl - t, t, zi1], [t, t, zi1]], '#8F999F', null, false);
      s.face([[t, t, zi0], [t, Yl - t, zi0], [t, Yl - t, zi1], [t, t, zi1]], '#A3ACB2', null, false);
      s.face([[t, t, zi0], [Xl - t, t, zi0], [Xl - t, Yl - t, zi0], [t, Yl - t, zi0]], '#9AA3A9', null, false);
      s.mat = 'paint';
      var WQ = s.liquidDefs('#7CC3EE', '#2F79BD');
      s.liquid('poly', { zmin: zi0, zmax: zi1, pts: [[t, t], [Xl - t, t], [Xl - t, yc], [xc, yc], [xc, Yl - t], [t, Yl - t]] }, p.level / 100,
        'url(#' + WQ.surf + ')', ' stroke="#FFFFFF" stroke-opacity=".75" stroke-width=".9"');
      s.unclip();
      var po = proj([xc, yc, 0]), pux = proj([xc + 1, yc, 0]), puy = proj([xc, yc + 1, 0]);
      s.liquid('plane', { zmin: zi0, zmax: zi1, prof: [[zi0, Xl - t - xc], [zi1, Xl - t - xc]], o: po, u: [pux[0] - po[0], pux[1] - po[1]], wave: [1.4, 18] }, p.level / 100, 'url(#' + WQ.body + ')', ' fill-opacity=".9"');
      s.liquid('plane', { zmin: zi0, zmax: zi1, prof: [[zi0, Yl - t - yc], [zi1, Yl - t - yc]], o: po, u: [puy[0] - po[0], puy[1] - po[1]], wave: [1.4, 18] }, p.level / 100, 'url(#' + WQ.body + ')', ' fill-opacity=".78"');
      s.liquid('pline', { zmin: zi0, zmax: zi1, pts: [[Xl - t, yc], [xc, yc], [xc, Yl - t]], wave: [1.4, 18], corner: [xc, yc] }, p.level / 100, 'none', ' stroke="#E8F6FF" stroke-width="1.6" stroke-linejoin="round"');
      // exterior walls that remain
      s.mat = 'metal';
      s.face([[0, Yl, zb], [xc, Yl, zb], [xc, Yl, top], [0, Yl, top]], SUS);
      s.face([[Xl, 0, zb], [Xl, yc, zb], [Xl, yc, top], [Xl, 0, top]], SUS);
      s.face([[0, 0, top], [Xl, 0, top], [Xl, yc, top], [xc, yc, top], [xc, Yl, top], [0, Yl, top]], SUS);
      s.mat = 'paint';
      s.panels([0, Yl, zb], X, Z, xc / PNL, p.nz, PNL);
      s.panels([Xl, yc, zb], [0, -1, 0], yc / PNL, p.nz, PNL);
      s.clip([[0, 0, top], [Xl, 0, top], [Xl, yc, top], [xc, yc, top], [xc, Yl, top], [0, Yl, top]]);
      s.panels([0, 0, top], X, Y, p.nx, p.ny, PNL);
      s.unclip();
      // section edges of the wall panels
      s.face([[xc, Yl - t, zb], [xc, Yl, zb], [xc, Yl, top], [xc, Yl - t, top]], '#7C868D', null, false);
      s.face([[xc, yc, top - t], [xc, Yl, top - t], [xc, Yl, top], [xc, yc, top]], '#8A949B', null, false);
      s.face([[Xl - t, yc, zb], [Xl, yc, zb], [Xl, yc, top], [Xl - t, yc, top]], '#8F999F', null, false);
      s.face([[xc, yc, top - t], [Xl, yc, top - t], [Xl, yc, top], [xc, yc, top]], '#9DA6AC', null, false);
      s.face([[xc, yc, zb], [Xl, yc, zb], [Xl, yc, zb + t], [xc, yc, zb + t]], '#8F999F', null, false);
      s.face([[xc, yc, zb], [xc, Yl, zb], [xc, Yl, zb + t], [xc, yc, zb + t]], '#7C868D', null, false);
      s.line3([[xc, yc, zb], [xc, yc, top]], '#FFFFFF', 0.8, 0.5);
    }
    s.mat = 'metal';
    for (k = 1; k < p.nz; k++) {
      zs = zb + k * PNL;
      s.box(0, Yl, zs - 1.5, xc, 2.2, 3, '#AEB6BC');
      s.box(Xl, 0, zs - 1.5, 2.2, yc + (cut ? 0 : 2.2), 3, '#AEB6BC');
    }
    // roof: manhole hatch + gooseneck vent
    s.box(PNL * 0.35, PNL * 0.35, top, PNL * 0.9, PNL * 0.9, 3, '#B4BCC2');
    s.box(PNL * 0.42, PNL * 0.42, top + 3, PNL * 0.76, PNL * 0.76, 1.6, '#CDD3D8');
    s.cyl([PNL * 0.8, PNL * 1.2, top + 5], [PNL * 1.1, PNL * 1.2, top + 5], 0.8, '#8E979D');
    var vx = (cut ? xc : Xl) - PNL * 0.55, vy = PNL * 0.55;
    s.cz(vx, vy, top, 12, 2.4, '#A9B1B7');
    s.cyl([vx, vy, top + 12], [vx + 6, vy, top + 12], 2.4, '#A9B1B7', null, false);
    s.sphere([vx, vy, top + 12], 2.4, '#A9B1B7');
    s.cz(vx + 6, vy, top + 6, 6, 3.4, '#A9B1B7');
    s.mat = 'paint';
    if (!cut) {
      var gx = Xl - 14;
      s.mat = 'metal';
      s.cy(gx, Yl, zb + 5, 6, 1.1, '#9AA3A9'); s.cy(gx, Yl, top - 5, 6, 1.1, '#9AA3A9');
      s.cz(gx, Yl + 6, zb + 2, H - 4, 2.6, '#D8E3EA');
      s.mat = 'paint';
      s.cz(gx, Yl + 6, zb + 3, (H - 6) * 0.7, 1.7, '#3F8FD2');
    }
    // outlet with flange + gate valve on the long face, drain below
    s.mat = 'pipe';
    s.cy(PNL * 0.5, Yl, zb + 9, 10, 4.5, '#3D7CBD'); s.cy(PNL * 0.5, Yl + 10, zb + 9, 2.2, 7.5, '#35699F');
    s.mat = 'metal'; s.cy(PNL * 0.5, Yl + 12.2, zb + 9, 6, 5.2, '#8E979D'); s.mat = 'pipe';
    s.cy(PNL * 0.5, Yl + 18.2, zb + 9, 2.2, 7.5, '#35699F'); s.cy(PNL * 0.5, Yl + 20.4, zb + 9, 8, 4.5, '#3D7CBD');
    s.mat = 'paint';
    s.cz(PNL * 0.5, Yl + 15.2, zb + 14, 5, 0.8, '#B7BEC3'); s.cz(PNL * 0.5, Yl + 15.2, zb + 19, 1, 4.5, '#C0392B');
    s.mat = 'metal'; s.cy(PNL * 1.5 > xc - 6 ? xc - 8 : PNL * 1.5, Yl, zb + 4, 8, 2, '#A9B1B7'); s.mat = 'paint';
    // inlet + overflow on the short face
    var iy = cut ? yc * 0.62 : Yl * 0.8, oy = cut ? yc * 0.3 + 8 : Yl * 0.52;
    s.mat = 'pipe';
    s.cx(Xl, iy, top - 8, 9, 3.8, '#3D7CBD'); s.cx(Xl + 9, iy, top - 8, 2.2, 6.5, '#35699F');
    s.cx(Xl + 11.2, iy, top - 8, 8, 3.8, '#3D7CBD');
    s.mat = 'metal'; s.cx(Xl, oy, top - 13, 10, 3, '#A9B1B7');
    s.mat = 'paint';
    // cage ladder on the short face
    var ly = Math.min(Yl * 0.12, yc * 0.12), tp = top + 14, lx = Xl + 8;
    s.mat = 'metal';
    s.cz(lx, ly, 5, tp - 5, 1.1, '#9BA4AA'); s.cz(lx, ly + 11, 5, tp - 5, 1.1, '#9BA4AA');
    for (z = 16; z < tp - 2; z += 7) s.cy(lx, ly, z, 11, 0.8, '#9BA4AA');
    s.cyl([Xl, ly, tp - 2], [lx, ly, tp], 1, '#9BA4AA'); s.cyl([Xl, ly + 11, tp - 2], [lx, ly + 11, tp], 1, '#9BA4AA');
    s.mat = 'paint';
  };
  PORTS.watertank = function (p) {
    var g = wtGeo(p), iy = p.cut ? g.yc * 0.62 : g.Y * 0.8;
    return [{ p: [g.X + 19.2, iy, g.zb + g.H - 8], ax: '+x', kind: 'pipe', d: 7.6 }, { p: [PNL * 0.5, g.Y + 28.4, g.zb + 9], ax: '+y', kind: 'pipe', d: 9 }];
  };
  CEN.watertank = function (p) { var g = wtGeo(p); return [g.X / 2, g.Y / 2, g.zb + g.H / 2]; };

  // vacuum pump package: n pump/motor units on one skid, common suction header, control panel
  DEF.vacuum = { n: 3 };
  var VU = 56;
  B.vacuum = function (s, p) {
    var n = p.n, W = 64, L = n * VU + 52, i, k, xc;
    s.shadowRect(-4, -4, L + 8, W + 8, 0.3, 6);
    s.box(0, 0, 0, L, W, 8, DARK);
    for (i = 0; i < n; i++) {
      xc = 28 + i * VU;
      s.box(xc - 9, 8, 8, 18, 20, 10, DARK);
      s.cy(xc, 4, 32, 28, 13, ST, 'st#pump' + (i + 1));
      for (k = 0; k < 4; k++) s.ring([xc, 9 + k * 6, 32], X, Z, 13.2, '#000000', 0.5);
      s.box(xc - 5, 12, 44, 10, 10, 6, FRAME);
      s.cy(xc, 32, 32, 6, 8, DARK);
      s.box(xc - 11, 40, 8, 22, 18, 8, DARK);
      s.cy(xc, 38, 32, 20, 16, BODY);
      s.ring([xc, 44, 32], X, Z, 16.2, '#8E979D', 0.8); s.ring([xc, 50, 32], X, Z, 16.2, '#8E979D', 0.8);
      s.cy(xc, 58, 32, 3, 12, FRAME);
      s.cz(xc + 12, 48, 20, 22, 2.6, STEEL); s.cz(xc + 12, 48, 42, 10, 4.5, '#6E777D');
      s.cz(xc, 46, 47, 22, 3.5, STEEL); s.cz(xc, 46, 55, 6, 5.5, REF);
    }
    s.cx(-6, 46, 73, n * VU + 6, 5, STEEL);
    s.cx(-6, 46, 73, 2.5, 8.5, STEEL);
    s.box(n * VU + 6, 4, 8, 42, W - 8, 96, PANEL);
    var F = [0, W - 4, 0];
    s.on(F, X, Z, rect(n * VU + 10, 14, 34, 82), PANEL);
    s.on(F, X, Z, rect(n * VU + 15, 78, 16, 10), GLASS);
    for (i = 0; i < n; i++) s.on(F, X, Z, circ(n * VU + 16 + i * 8, 66, 2.6, 18), ST, 'st#pump' + (i + 1));
    s.on(F, X, Z, rect(n * VU + 38, 40, 2, 12), DARK);
    for (k = 0; k < 6; k++) s.on([n * VU + 48, 0, 0], Y, Z, rect(12, 20 + k * 7, W - 32, 3), '#8E979D', null, false);
  };
  PORTS.vacuum = function (p) { return [{ p: [-8.5, 46, 73], ax: '-x', kind: 'pipe', d: 10 }]; };
  CEN.vacuum = function (p) { return [(p.n * VU + 52) / 2, 32, 40]; };

  /* ---------------- shared realistic parts (v4) ---------------- */

  // surface of revolution about an arbitrary axis ('x' | 'y' | 'z') starting at o; prof = [[along, r], ...]
  Sym.prototype.latheAx = function (o, dir, prof, col, nSeg) {
    nSeg = nSeg || 48;
    var mm = AX(dir), m = this.M(), quads = [], i, j, k;
    function pt(z, r, a) { return add(o, mm.P(z, r * Math.cos(a), r * Math.sin(a))); }
    for (j = 0; j < prof.length - 1; j++) {
      var z0 = prof[j][0], ra = prof[j][1], z1 = prof[j + 1][0], rb = prof[j + 1][1];
      var dz = z1 - z0, dr = rb - ra, ln = Math.sqrt(dz * dz + dr * dr) || 1;
      for (i = 0; i < nSeg; i++) {
        var a0 = i / nSeg * 2 * PI, a1 = (i + 1) / nSeg * 2 * PI, am = (a0 + a1) / 2;
        var nn = mm.P(-dr / ln, Math.cos(am) * dz / ln, Math.sin(am) * dz / ln);
        if (dot(nn, V) <= -0.02) continue;
        quads.push([[pt(z0, ra, a0), pt(z0, ra, a1), pt(z1, rb, a1), pt(z1, rb, a0)], nn]);
      }
    }
    quads.sort(function (a, b) { return depthOf(add(a[0][0], a[0][2])) - depthOf(add(b[0][0], b[0][2])); });
    for (k = 0; k < quads.length; k++) {
      var f = mixc(col, shade(quads[k][1], m));
      this.out.push('<path d="' + this.d(quads[k][0]) + '" fill="' + f + '" stroke="' + f + '" stroke-width=".7" stroke-linejoin="round"/>');
    }
  };
  // capsule profile (elliptical heads) of total length len, radius r, head depth hb
  function capProf(z0, len, r, hb, N) {
    var p = [], k, a;
    N = N || 8;
    for (k = 0; k <= N; k++) { a = -PI / 2 + k / N * PI / 2; p.push([z0 + hb + hb * Math.sin(a), Math.max(0.01, r * Math.cos(a))]); }
    p.push([z0 + len - hb, r]);
    for (k = 1; k <= N; k++) { a = k / N * PI / 2; p.push([z0 + len - hb + hb * Math.sin(a), Math.max(0.01, r * Math.cos(a))]); }
    return p;
  }
  // vertical capsule vessel
  Sym.prototype.vessel = function (x, y, z0, len, r, col, mat, hbf) {
    var old = this.mat; this.mat = mat || 'paint';
    this.lathe(x, y, capProf(z0, len, r, r * (hbf || 0.5), 8), col, 48);
    this.mat = old;
  };
  // flanged gate valve: body on axis `ax` ('+x'...), stem + handwheel towards `stem`
  Sym.prototype.valve3d = function (c, ax, r, stem, wheel) {
    var A = dv(ax), St = dv(stem), parts = [], k;
    function P(v, t) { return add(c, mul(v, t)); }
    parts.push([P(A, -1.3 * r), P(A, -0.95 * r), r * 1.6, '#7B848B', 'pipe']);
    parts.push([P(A, 0.95 * r), P(A, 1.3 * r), r * 1.6, '#7B848B', 'pipe']);
    parts.push([P(A, -0.95 * r), P(A, 0.95 * r), r * 1.2, '#8C959B', 'metal']);
    parts.push([c, P(St, 2.2 * r), r * 0.62, '#8C959B', 'metal']);
    parts.push([P(St, 2.2 * r), P(St, 3.1 * r), r * 0.2, '#C9CFD4', 'metal']);
    parts.push([P(St, 3.1 * r), P(St, 3.45 * r), r * 1.5, wheel || '#C0392B', 'paint']);
    parts.sort(function (a, b) { return depthOf(add(a[0], a[1])) - depthOf(add(b[0], b[1])); });
    for (k = 0; k < parts.length; k++) { this.mat = parts[k][4]; this.cyl(parts[k][0], parts[k][1], parts[k][2], parts[k][3]); }
    this.mat = 'paint';
  };
  // dial gauge facing +x
  Sym.prototype.gaugeX = function (x, y, z, r) {
    this.mat = 'metal'; this.cx(x, y, z, r * 0.5, r * 1.12, '#9AA3A9'); this.mat = 'paint';
    var o = [x + r * 0.5 + 0.05, 0, 0];
    this.on(o, [0, -1, 0], Z, circ(-y, z, r * 0.95, 28), '#FAFBFB', null, false);
    this.ln([x + r * 0.5 + 0.1, 0, 0], [0, -1, 0], Z, [[-y, z], [-y + r * 0.55, z + r * 0.45]], '#C0392B', Math.max(0.6, r * 0.14));
  };
  // dial gauge on a stem, facing +x or +y
  Sym.prototype.gaugeOn = function (p3, face, r, stemLen) {
    var sl = stemLen || 0;
    this.mat = 'metal';
    if (sl) this.cz(p3[0], p3[1], p3[2] - sl, sl, r * 0.18, '#A9B1B7');
    this.mat = 'paint';
    if (face === '+x') this.gaugeX(p3[0], p3[1], p3[2] + r, r); else this.gaugeY(p3[0], p3[1], p3[2] + r, r);
  };
  // industrial gas cylinder with coloured shoulder and brass valve
  Sym.prototype.gasCyl = function (x, y, z0, h, r, body, shoulder) {
    this.mat = 'paint';
    this.lathe(x, y, [[z0, r * 0.8], [z0 + 1.5, r], [z0 + h * 0.76, r]], body, 36);
    this.lathe(x, y, [[z0 + h * 0.76, r], [z0 + h * 0.84, r * 0.93], [z0 + h * 0.9, r * 0.7], [z0 + h * 0.94, r * 0.38], [z0 + h * 0.95, r * 0.3]], shoulder, 36);
    this.mat = 'metal';
    this.cz(x, y, z0 + h * 0.95, h * 0.03, r * 0.28, '#9AA3A9');
    this.cz(x, y, z0 + h * 0.98, h * 0.05, r * 0.36, REF);
    this.cy(x, y, z0 + h * 1.0, r * 0.7, r * 0.12, REF);
    this.mat = 'paint';
    this.cz(x, y, z0 + h * 1.03, h * 0.012, r * 0.45, '#2A3136');
  };
  // hazard stripes band on a plane rectangle
  Sym.prototype.hazard = function (o, u, v, x, y, w, h) {
    if (this.hidden(onP(o, u, v, rect(x, y, w, h)))) return;
    this.on(o, u, v, rect(x, y, w, h), '#F2C230', null, false);
    this.clip(onP(o, u, v, rect(x, y, w, h)));
    var k, d = '';
    for (k = x - h * 1.5; k < x + w; k += h * 1.2) d += this.d(onP(o, u, v, [[k, y], [k + h * 0.6, y], [k + h * 1.6, y + h], [k + h, y + h]]));
    this.path(d, '#22272B');
    this.unclip();
  };

  /* ---------------- header (manifold) ---------------- */
  DEF.header = { n: 4, br: 'up', D: 30, d: 12, valves: 1, svc: 'chws', dir: 'x' };
  function hdrGeo(p) {
    var sp = Math.max(p.d * 3.6, 42), L = (p.n + 1) * sp, R = p.D / 2, low = p.br === 'down' || p.br === 'updown';
    return { sp: sp, L: L, R: R, hz: low ? 128 : 58, blen: Math.max(48, p.d * 4.2), hb: R * 0.55 };
  }
  B.header = function (s, p) {
    var g = hdrGeo(p), m = AX(p.dir), col = SVC[p.svc] || STEEL, R = g.R, r = p.d / 2, i, k, a;
    var T = p.dir === 'y' ? '+x' : '+y', AXS = '+' + p.dir;
    function W(a, t, h) { return m.P(a, t, h); }
    var c0 = W(-g.hb - 6, -R - 12, 0), c1 = W(g.L + g.hb + 26, R + 14, 0);
    s.shadowRect(Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]), Math.abs(c1[0] - c0[0]), Math.abs(c1[1] - c0[1]), 0.28, 6);
    // stands
    var sup = [g.sp * 0.5, g.L - g.sp * 0.5];
    for (k = 0; k < 2; k++) {
      a = sup[k];
      boxA(s, m, a - 10, -13, 0, 20, 26, 3, '#5E676D');
      boxA(s, m, a - 3, -3, 3, 6, 6, g.hz - R - 5, '#7B848B');
      boxA(s, m, a - 6, -R * 0.95, g.hz - R - 5, 12, R * 1.9, 4, '#6E777D');
    }
    function branch(i, kind, pass) {
      var a = g.sp * (i + 1), vr = r * 0.95;
      if (kind === 'down' && pass === 0) {
        s.mat = 'pipe';
        s.cyl(W(a, 0, g.hz - R * 0.9), W(a, 0, g.hz - R - 10), r, col, null, false);
        if (p.valves) s.valve3d(W(a, 0, g.hz - R - 10 - 1.3 * vr), '+z', vr, T);
        s.mat = 'pipe';
        s.cyl(W(a, 0, g.hz - R - 10 - 2.6 * vr), W(a, 0, g.hz - R - g.blen), r, col, null, 'B');
        s.cyl(W(a, 0, g.hz - R - g.blen - 2.5), W(a, 0, g.hz - R - g.blen), r * 1.6, mixc(col, ['#000000', 0.2]));
      }
      if (kind === 'up' && pass === 1) {
        s.mat = 'pipe';
        s.cyl(W(a, 0, g.hz + R * 0.92), W(a, 0, g.hz + R + 10), r, col, null, false);
        if (p.valves) s.valve3d(W(a, 0, g.hz + R + 10 + 1.3 * vr), '+z', vr, T);
        s.mat = 'pipe';
        s.cyl(W(a, 0, g.hz + R + 10 + (p.valves ? 2.6 * vr : 0)), W(a, 0, g.hz + R + g.blen), r, col);
        s.cyl(W(a, 0, g.hz + R + g.blen), W(a, 0, g.hz + R + g.blen + 2.5), r * 1.6, mixc(col, ['#000000', 0.2]));
      }
      if (kind === 'side' && pass === 1) {
        s.mat = 'pipe';
        s.cyl(W(a, R * 0.92, g.hz), W(a, R + 10, g.hz), r, col, null, false);
        if (p.valves) s.valve3d(W(a, R + 10 + 1.3 * vr, g.hz), T, vr, '+z');
        s.mat = 'pipe';
        s.cyl(W(a, R + 10 + (p.valves ? 2.6 * vr : 0), g.hz), W(a, R + g.blen, g.hz), r, col);
        s.cyl(W(a, R + g.blen, g.hz), W(a, R + g.blen + 2.5, g.hz), r * 1.6, mixc(col, ['#000000', 0.2]));
      }
      s.mat = 'paint';
    }
    function kindOf(i) { return p.br === 'updown' ? (i % 2 ? 'down' : 'up') : p.br; }
    for (i = 0; i < p.n; i++) branch(i, kindOf(i), 0);
    // shell with dished heads
    s.mat = 'pipe';
    s.latheAx(W(-g.hb, 0, g.hz), p.dir, capProf(0, g.L + 2 * g.hb, R, g.hb, 8), col, 48);
    // end nozzle
    s.cyl(W(g.L + g.hb * 0.7, 0, g.hz), W(g.L + g.hb + 16, 0, g.hz), R * 0.5, col);
    s.cyl(W(g.L + g.hb + 16, 0, g.hz), W(g.L + g.hb + 19, 0, g.hz), R * 0.8, mixc(col, ['#000000', 0.2]));
    s.mat = 'paint';
    s.ring(W(g.sp * 0.5, 0, g.hz), m.TU, Z, R + 0.3, '#5E676D', 2.6);
    s.ring(W(g.L - g.sp * 0.5, 0, g.hz), m.TU, Z, R + 0.3, '#5E676D', 2.6);
    for (i = 0; i < p.n; i++) branch(i, kindOf(i), 1);
    // instruments: pressure gauge + thermometer on top, drain below
    s.mat = 'metal';
    s.cyl(W(g.sp * 0.25, 0, g.hz + R * 0.9), W(g.sp * 0.25, 0, g.hz + R + 12), 1.3, '#A9B1B7');
    s.cyl(W(g.L - g.sp * 0.25, 0, g.hz + R * 0.9), W(g.L - g.sp * 0.25, 0, g.hz + R + 8), 1.3, '#A9B1B7');
    s.mat = 'paint';
    var gp = W(g.sp * 0.25, 0, g.hz + R + 12), tp = W(g.L - g.sp * 0.25, 0, g.hz + R + 8);
    if (T === '+y') { s.gaugeY(gp[0], gp[1] + 1, gp[2] + 5, 5); s.gaugeY(tp[0], tp[1] + 1, tp[2] + 5, 4); }
    else { s.gaugeX(gp[0] + 1, gp[1], gp[2] + 5, 5); s.gaugeX(tp[0] + 1, tp[1], tp[2] + 5, 4); }
  };
  PORTS.header = function (p) {
    var g = hdrGeo(p), m = AX(p.dir), out = [{ p: m.P(g.L + g.hb + 19, 0, g.hz), ax: '+' + p.dir, kind: 'pipe', d: p.D }], i, kind, a;
    for (i = 0; i < p.n; i++) {
      kind = p.br === 'updown' ? (i % 2 ? 'down' : 'up') : p.br; a = g.sp * (i + 1);
      if (kind === 'up') out.push({ p: m.P(a, 0, g.hz + g.R + g.blen + 2.5), ax: '+z', kind: 'pipe', d: p.d });
      else if (kind === 'down') out.push({ p: m.P(a, 0, g.hz - g.R - g.blen - 2.5), ax: '-z', kind: 'pipe', d: p.d });
      else out.push({ p: m.P(a, g.R + g.blen + 2.5, g.hz), ax: p.dir === 'y' ? '+x' : '+y', kind: 'pipe', d: p.d });
    }
    return out;
  };
  CEN.header = function (p) { var g = hdrGeo(p); return AX(p.dir).P(g.L / 2, 0, g.hz); };

  /* ---------------- pumps ---------------- */
  var PUMPBLUE = '#3A5F8F';
  // horizontal multistage (ring section) pump
  DEF.pumpms = { stages: 5 };
  function pmsGeo(p) { var st = 13, xs = 104, xe = xs + 24 + p.stages * st; return { st: st, xs: xs, xe: xe, L: xe + 24 + 12, zc: 36, yc: 26 }; }
  B.pumpms = function (s, p) {
    var g = pmsGeo(p), zc = g.zc, yc = g.yc, k, x;
    s.shadowRect(-6, 0, g.L + 12, 52, 0.3, 6);
    s.box(-4, 4, 0, g.L + 8, 44, 8, '#474F55');
    s.box(8, 12, 8, 56, 28, 6, '#474F55');
    // motor
    s.cx(0, yc, zc, 74, 22, ST, 'st#motor');
    for (k = 0; k < 6; k++) s.ring([8 + k * 11, yc, zc], Y, Z, 22.3, '#000000', 0.5);
    s.box(26, yc - 9, zc + 20, 20, 18, 12, '#6E777D');
    s.cx(74, yc, zc, 5, 16, '#5E676D');
    s.box(79, yc - 11, zc - 12, 20, 22, 24, '#D6A21E');
    s.cx(99, yc, zc, 5, 12, PUMPBLUE);
    // tie rods behind
    s.mat = 'metal';
    s.cx(g.xs, yc - 18, zc - 18, g.xe + 24 - g.xs, 1.6, '#A9B1B7'); s.cx(g.xs, yc - 18, zc + 18, g.xe + 24 - g.xs, 1.6, '#A9B1B7'); s.cx(g.xs, yc + 18, zc - 18, g.xe + 24 - g.xs, 1.6, '#A9B1B7');
    s.mat = 'paint';
    // feet
    s.box(g.xs + 2, yc - 14, 8, 18, 28, zc - 30, PUMPBLUE); s.box(g.xe + 4, yc - 14, 8, 18, 28, zc - 30, PUMPBLUE);
    // casings
    s.cx(g.xs, yc, zc, 24, 23, PUMPBLUE);
    for (k = 0; k < p.stages; k++) {
      x = g.xs + 24 + k * g.st;
      s.cx(x, yc, zc, g.st, k % 2 ? 20 : 20.6, PUMPBLUE);
      s.ring([x, yc, zc], Y, Z, 21, '#22384F', 0.8);
    }
    s.cx(g.xe, yc, zc, 24, 23, PUMPBLUE);
    s.cx(g.xe + 24, yc, zc, 12, 11, '#2E4B70');
    s.mat = 'metal';
    s.cx(g.xs - 2, yc + 18, zc + 18, g.xe + 28 - g.xs, 1.6, '#A9B1B7');
    s.mat = 'paint';
    // nozzles
    s.cz(g.xs + 12, yc, zc + 20, 16, 8, PUMPBLUE); s.cz(g.xs + 12, yc, zc + 36, 3, 13, '#2E4B70');
    s.cz(g.xe + 12, yc, zc + 20, 12, 7, PUMPBLUE); s.cz(g.xe + 12, yc, zc + 32, 3, 12, '#2E4B70');
    s.gaugeY(g.xe + 2, yc + 20, zc + 12, 4);
  };
  PORTS.pumpms = function (p) { var g = pmsGeo(p); return [{ p: [g.xs + 12, g.yc, g.zc + 39], ax: '+z', kind: 'pipe', d: 16 }, { p: [g.xe + 12, g.yc, g.zc + 35], ax: '+z', kind: 'pipe', d: 14 }]; };
  CEN.pumpms = function (p) { var g = pmsGeo(p); return [g.L / 2, g.yc, g.zc]; };

  // vertical inline multistage pump
  DEF.pumpv = { stages: 6 };
  function pvGeo(p) { var h = p.stages * 10; return { h: h, zm: 34 + h }; }
  B.pumpv = function (s, p) {
    var g = pvGeo(p), h = g.h, zm = g.zm, k;
    s.shadowRect(-44, -24, 88, 48, 0.3, 6);
    s.box(-24, -20, 0, 48, 40, 6, '#2E4B70');
    // inline suction / discharge
    s.cx(-44, 0, 20, 4, 12, PUMPBLUE); s.cx(-40, 0, 20, 26, 7.5, PUMPBLUE);
    s.cz(0, 0, 6, 26, 19, PUMPBLUE);
    s.cx(14, 0, 20, 26, 7.5, PUMPBLUE); s.cx(40, 0, 20, 4, 12, PUMPBLUE);
    s.cz(0, 0, 30, 5, 16, '#2E4B70');
    s.mat = 'metal';
    s.cz(-13, -13, 30, h + 8, 1.4, '#A9B1B7'); s.cz(13, -13, 30, h + 8, 1.4, '#A9B1B7');
    s.cz(0, 0, 34, h, 12.5, '#C3CAD0');
    for (k = 1; k < p.stages; k++) s.ring([0, 0, 34 + k * 10], X, Y, 12.7, '#8E979D', 0.6);
    s.cz(-13, 13, 30, h + 8, 1.4, '#A9B1B7'); s.cz(13, 13, 30, h + 8, 1.4, '#A9B1B7');
    s.mat = 'paint';
    s.cz(0, 0, zm, 8, 18, PUMPBLUE);
    s.cz(0, 0, zm + 8, 16, 11, '#2E4B70');
    s.on([0, 11.2, 0], X, Z, rect(-5, zm + 11, 10, 10), WIN, null, false);
    s.cz(0, 0, zm + 24, 4, 17, PUMPBLUE);
    s.cz(0, 0, zm + 28, 42, 15, ST, 'st#motor');
    for (k = 0; k < 6; k++) s.ring([0, 0, zm + 32 + k * 6], X, Y, 15.3, '#000000', 0.45);
    s.lathe(0, 0, [[zm + 70, 15], [zm + 74, 14], [zm + 77, 11], [zm + 79, 6], [zm + 80, 0.1]], '#4B535A', 36);
    s.box(12, -7, zm + 44, 9, 14, 13, '#5E676D');
    s.gaugeY(-26, 8, 24, 3.5);
  };
  PORTS.pumpv = function () { return [{ p: [-44, 0, 20], ax: '-x', kind: 'pipe', d: 15 }, { p: [44, 0, 20], ax: '+x', kind: 'pipe', d: 15 }]; };
  CEN.pumpv = function (p) { return [0, 0, pvGeo(p).zm / 2]; };

  /* ---------------- compressed air (CDA) ---------------- */
  // packaged screw air compressor
  DEF.aircomp = { label: 'CDA' };
  B.aircomp = function (s, p) {
    var L = 150, Wd = 80, H = 112, k, F = [0, Wd, 0];
    s.shadowRect(-4, -4, L + 8, Wd + 8, 0.32, 7);
    s.box(-3, -3, 0, L + 6, Wd + 6, 7, '#3F474D');
    s.box(0, 0, 7, L, Wd, H, '#E2E6E9');
    s.on(F, X, Z, rect(0, 7, L, 10), '#4E575D', null, false);
    s.on(F, X, Z, rect(4, 20, L * 0.48, H - 18), '#E7EBED');
    s.on(F, X, Z, rect(L * 0.52, 20, L * 0.48 - 4, H - 18), '#E7EBED');
    s.on(F, X, Z, rect(L * 0.58, H - 30, 44, 26), '#2E3439');
    s.on(F, X, Z, rect(L * 0.61, H - 26, 20, 14), GLASS);
    s.on(F, X, Z, circ(L * 0.61 + 29, H - 19, 2.8, 16), ST, 'st#run');
    s.on(F, X, Z, circ(L * 0.61 + 37, H - 19, 2.8, 16), '#C0392B');
    s.label([L * 0.18, Wd + 0.3, H - 12], X, [0, 0, -1], p.label || 'CDA', 18, '#1F4E8C');
    s.label([L * 0.18, Wd + 0.3, H - 30], X, [0, 0, -1], 'AIR COMPRESSOR', 5.5, '#48545E');
    s.on(F, X, Z, rect(L * 0.47, 50, 2, 16), '#5E676D'); s.on(F, X, Z, rect(L * 0.53, 50, 2, 16), '#5E676D');
    for (k = 0; k < 8; k++) s.on([L, 0, 0], Y, Z, rect(12, 20 + k * 8, Wd - 24, 4), '#8E979D', null, false);
    s.on([0, 0, H + 7], X, Y, rect(L * 0.55, 12, 56, 56), '#30373C', null, false);
    s.rotor([0, 0, H + 7.1], X, Y, L * 0.55 + 28, 40, 24, 7, 'fan');
    s.guard([0, 0, H + 7.3], X, Y, L * 0.55 + 28, 40, 24);
    s.mat = 'metal';
    s.cx(L, Wd * 0.25, H - 14, 16, 5, '#A9B1B7'); s.cx(L + 16, Wd * 0.25, H - 14, 3, 8.5, '#8E979D');
    s.mat = 'paint';
  };
  PORTS.aircomp = function () { return [{ p: [169, 20, 98], ax: '+x', kind: 'pipe', d: 10 }]; };
  CEN.aircomp = function () { return [75, 40, 60]; };

  // air receiver tank
  DEF.airtank = { h: 120, d: 56, col: 'white' };
  var TANKCOL = { white: '#E9ECEE', red: '#C0392B', blue: '#2F6CB0', grey: '#A9B1B7' };
  B.airtank = function (s, p) {
    var r = p.d / 2, z0 = 22, k, a, col = TANKCOL[p.col] || TANKCOL.white, zt = z0 + p.h;
    s.shadowDisc(0, 0, r * 1.15, 0.3, 6);
    for (k = 0; k < 3; k++) {
      a = PI / 2 + k * 2 * PI / 3;
      s.box(Math.cos(a) * r * 0.75 - 5, Math.sin(a) * r * 0.75 - 5, 0, 10, 10, 2, '#5E676D');
      s.mat = 'metal'; s.cz(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, 2, z0 + r * 0.25, 2.2, '#7B848B'); s.mat = 'paint';
    }
    s.vessel(0, 0, z0, p.h, r, col, 'paint', 0.5);
    s.label([r * 0.7071 + 0.7, r * 0.7071 + 0.7, z0 + p.h * 0.55], [0.7071, -0.7071, 0], [0, 0, -1], 'AIR', Math.max(8, r * 0.34), '#34495E');
    s.mat = 'metal';
    s.cz(0, 0, zt - 2, 10, 2, '#A9B1B7'); s.cz(0, 0, zt + 8, 7, 3.4, REF);
    s.cyl([r * 0.6, 0, zt - p.h * 0.18], [r + 14, 0, zt - p.h * 0.18], 4, '#A9B1B7', null, false);
    s.cx(r + 14, 0, zt - p.h * 0.18, 3, 7, '#8E979D');
    s.cyl([0, r * 0.6, z0 + p.h * 0.2], [0, r + 14, z0 + p.h * 0.2], 4, '#A9B1B7', null, false);
    s.cy(0, r + 14, z0 + p.h * 0.2, 3, 7, '#8E979D');
    s.mat = 'paint';
    s.gaugeY(-r * 0.45, r * 0.9, z0 + p.h * 0.72, 5);
    s.valve3d([r * 0.3, r * 0.3, z0 - 8], '+z', 2.2, '+y', '#2F6CB0');
  };
  PORTS.airtank = function (p) { var r = p.d / 2, zt = 22 + p.h; return [{ p: [r + 17, 0, zt - p.h * 0.18], ax: '+x', kind: 'pipe', d: 8 }, { p: [0, r + 17, 22 + p.h * 0.2], ax: '+y', kind: 'pipe', d: 8 }]; };
  CEN.airtank = function (p) { return [0, 0, 22 + p.h / 2]; };

  // diaphragm expansion tank on a skirt
  DEF.exptank2 = { h: 90, d: 60, col: 'red' };
  B.exptank2 = function (s, p) {
    var r = p.d / 2, z0 = 16, col = TANKCOL[p.col] || TANKCOL.red, k;
    s.shadowDisc(0, 0, r * 1.05, 0.3, 6);
    s.cz(0, 0, 0, z0 + 4, r * 0.72, mixc(col, ['#000000', 0.25]));
    for (k = 0; k < 2; k++) s.on([0, r * 0.72 + 0.1, 0], X, Z, rect(-r * 0.5 + k * r * 0.62, 3, r * 0.38, 9), '#1E2327', null, false);
    s.vessel(0, 0, z0, p.h, r, col, 'paint', 0.55);
    s.ring([0, 0, z0 + p.h * 0.45], X, Y, r + 0.2, mixc(col, ['#000000', 0.3]), 1.6);
    s.label([r * 0.7071 + 0.7, r * 0.7071 + 0.7, z0 + p.h * 0.68], [0.7071, -0.7071, 0], [0, 0, -1], 'EXPANSION', Math.max(4.5, r * 0.15), '#FFFFFF');
    s.label([r * 0.7071 + 0.7, r * 0.7071 + 0.7, z0 + p.h * 0.6], [0.7071, -0.7071, 0], [0, 0, -1], 'TANK', Math.max(4.5, r * 0.15), '#FFFFFF');
    s.mat = 'metal';
    s.cz(0, 0, z0 + p.h - 1, 6, 2.2, '#A9B1B7'); s.cz(0, 0, z0 + p.h + 5, 3, 3.4, '#2A3136');
    s.cyl([0, r * 0.55, z0 + 10], [0, r + 16, z0 + 10], 4, '#A9B1B7', null, false); s.cy(0, r + 16, z0 + 10, 3, 7, '#8E979D');
    s.mat = 'paint';
    s.gaugeY(r * 0.35, r * 0.95, z0 + p.h * 0.3, 4);
  };
  PORTS.exptank2 = function (p) { return [{ p: [0, p.d / 2 + 19, 26], ax: '+y', kind: 'pipe', d: 8 }]; };
  CEN.exptank2 = function (p) { return [0, 0, 16 + p.h / 2]; };

  // water-cooled aftercooler with moisture separator
  DEF.aftercooler = { len: 130 };
  B.aftercooler = function (s, p) {
    var L = p.len, R = 16, zc = 44, yc = 22, sx = L + 40, k;
    s.shadowRect(-24, 0, L + 84, 46, 0.3, 6);
    s.box(10, yc - 14, 0, 16, 28, zc - R + 2, '#5E676D'); s.box(L - 26, yc - 14, 0, 16, 28, zc - R + 2, '#5E676D');
    // water nozzles (behind/below)
    s.mat = 'pipe';
    s.cyl([18, yc + R * 0.6, zc - 8], [18, yc + R + 12, zc - 8], 4, CW); s.cy(18, yc + R + 12, zc - 8, 2.5, 7, '#236F60');
    s.mat = 'metal';
    s.latheAx([-2, yc, zc], 'x', [[0, R * 0.2], [0.5, R + 3], [5, R + 3], [5.5, R], [L - 5.5, R], [L - 5, R + 3], [L - 0.5, R + 3], [L, R * 0.2]], '#B7BEC3', 44);
    s.cx(-14, yc, zc, 12, R * 0.85, '#8E979D'); s.cx(L - 2, yc, zc, 12, R * 0.85, '#8E979D');
    s.mat = 'pipe';
    s.cyl([L - 18, yc + R * 0.6, zc + 8], [L - 18, yc + R + 12, zc + 8], 4, CW); s.cy(L - 18, yc + R + 12, zc + 8, 2.5, 7, '#236F60');
    // air in / out
    s.mat = 'metal';
    s.cz(12, yc, zc + R * 0.8, 14, 6, '#A9B1B7'); s.cz(12, yc, zc + R + 14, 3, 10, '#8E979D');
    s.cz(L - 12, yc, zc + R * 0.8, 16, 6, '#A9B1B7');
    s.sphere([L - 12, yc, zc + R + 16], 6, '#A9B1B7');
    s.cyl([L - 12, yc, zc + R + 16], [sx, yc, zc + R + 16], 6, '#A9B1B7', null, false);
    // separator
    s.box(sx - 12, yc - 12, 0, 24, 24, 3, '#5E676D');
    s.vessel(sx, yc, 10, 74, 14, '#DDE2E5', 'metal', 0.5);
    s.sphere([sx, yc, zc + R + 16], 6, '#A9B1B7');
    s.cz(sx, yc, 82, 12, 4.5, '#A9B1B7'); s.cz(sx, yc, 94, 3, 8, '#8E979D');
    s.cz(sx, yc, 2, 8, 2, '#A9B1B7');
    s.mat = 'paint';
    s.box(sx + 6, yc + 8, 4, 10, 10, 8, '#2A3136');
    s.gaugeY(sx - 6, yc + 13, 60, 4);
    s.label([L * 0.5, yc + R + 0.4, zc + 2], X, [0, 0, -1], 'AFTERCOOLER', 5, '#48545E');
  };
  PORTS.aftercooler = function (p) {
    var L = p.len;
    return [{ p: [12, 22, 77], ax: '+z', kind: 'pipe', d: 12 }, { p: [L + 40, 22, 97], ax: '+z', kind: 'pipe', d: 9 },
      { p: [18, 52.5, 36], ax: '+y', kind: 'pipe', d: 8 }, { p: [L - 18, 52.5, 52], ax: '+y', kind: 'pipe', d: 8 }];
  };
  CEN.aftercooler = function (p) { return [p.len / 2 + 20, 22, 44]; };

  // refrigerated air dryer
  DEF.dryer = {};
  B.dryer = function (s) {
    var L = 90, Wd = 68, H = 104, F = [0, Wd, 0], k;
    s.shadowRect(-3, -3, L + 6, Wd + 6, 0.3, 6);
    s.box(-2, -2, 0, L + 4, Wd + 4, 5, '#3F474D');
    s.box(0, 0, 5, L, Wd, H, '#E4E8EA');
    s.on(F, X, Z, rect(6, H - 36, L - 12, 34), '#3A4146');
    s.on(F, X, Z, rect(12, H - 28, 26, 18), GLASS);
    s.on(F, X, Z, circ(50, H - 19, 3, 16), ST, 'st#run');
    s.on(F, X, Z, circ(60, H - 19, 3, 16), '#C0392B');
    s.on(F, X, Z, circ(72, H - 19, 3, 16), '#F2C230');
    s.label([L * 0.5, Wd + 0.3, 40], X, [0, 0, -1], 'AIR DRYER', 7, '#34495E');
    s.gaugeY(L * 0.5, Wd, 20, 6);
    s.on([L, 0, 0], Y, Z, rect(8, 22, Wd - 16, 60), '#30373C', null, false);
    s.rotor([L + 0.1, 0, 0], Y, Z, Wd / 2, 52, 24, 5, 'fan');
    s.guard([L + 0.3, 0, 0], Y, Z, Wd / 2, 52, 24);
    s.mat = 'metal';
    s.cz(22, 22, H + 5, 18, 5, '#A9B1B7'); s.cz(22, 22, H + 23, 3, 8.5, '#8E979D');
    s.cz(62, 22, H + 5, 18, 5, '#A9B1B7'); s.cz(62, 22, H + 23, 3, 8.5, '#8E979D');
    s.mat = 'paint';
    s.label([22, 32, H + 5.2], X, [0, 1, 0], 'IN', 5, '#34495E');
    s.label([62, 32, H + 5.2], X, [0, 1, 0], 'OUT', 5, '#34495E');
  };
  PORTS.dryer = function () { return [{ p: [22, 22, 135], ax: '+z', kind: 'pipe', d: 10 }, { p: [62, 22, 135], ax: '+z', kind: 'pipe', d: 10 }]; };
  CEN.dryer = function () { return [45, 34, 55]; };

  // heatless / heated desiccant twin-tower dryer
  DEF.adsorb = { h: 130 };
  B.adsorb = function (s, p) {
    var h = p.h, z0 = 20, yT = 18, yM = 46, zb = 26, zt = z0 + h + 10, k, x;
    s.shadowRect(-18, -8, 150, 72, 0.3, 7);
    s.box(-12, -6, 0, 138, 66, 6, '#3F474D');
    // towers
    s.vessel(28, yT, z0, h, 16, '#E7EAEC', 'paint', 0.55);
    s.vessel(86, yT, z0, h, 16, '#E7EAEC', 'paint', 0.55);
    s.box(20, yT - 8, 6, 16, 16, z0 - 4, '#5E676D'); s.box(78, yT - 8, 6, 16, 16, z0 - 4, '#5E676D');
    s.label([28 + 16 * 0.7071 + 0.5, yT + 16 * 0.7071 + 0.5, z0 + h * 0.6], [0.7071, -0.7071, 0], [0, 0, -1], 'A', 9, '#1F4E8C');
    s.label([86 + 16 * 0.7071 + 0.5, yT + 16 * 0.7071 + 0.5, z0 + h * 0.6], [0.7071, -0.7071, 0], [0, 0, -1], 'B', 9, '#1F4E8C');
    // tower-to-manifold stubs
    s.mat = 'metal';
    for (k = 0; k < 2; k++) {
      x = 28 + k * 58;
      s.cyl([x, yT + 12, zb], [x, yM, zb], 3.5, '#A9B1B7', null, false);
      s.cyl([x, yT + 8, zt], [x, yM, zt], 3.5, '#A9B1B7', null, false);
    }
    // manifolds
    s.cx(-2, yM, zb, 120, 5, '#A9B1B7');
    s.cx(-2, yM, zt, 120, 5, '#A9B1B7');
    s.mat = 'paint';
    // switching valves with actuators (bottom) and purge silencers (top)
    for (k = 0; k < 2; k++) {
      x = 28 + k * 58;
      s.mat = 'metal'; s.cx(x - 6, yM, zb, 12, 7, '#8C959B'); s.mat = 'paint';
      s.box(x - 7, yM - 7, zb + 7, 14, 14, 11, '#D6A21E');
      s.on([0, yM + 7.05, 0], X, Z, circ(x, zb + 12.5, 2.2, 14), ST, 'st#tower' + (k ? 'B' : 'A'));
      s.mat = 'metal'; s.cx(x - 6, yM, zt, 12, 7, '#8C959B'); s.cz(x + 14, yM, zt, 16, 4, '#A9B1B7'); s.mat = 'paint';
      s.cz(x + 14, yM, zt + 16, 14, 6, '#4B535A');
      for (var q = 0; q < 3; q++) s.ring([x + 14, yM, zt + 19 + q * 4], X, Y, 6.2, '#9AA3A9', 0.8);
    }
    // pre / after filters
    s.vessel(-6, yM, 34, 52, 6.5, '#C3CAD0', 'metal', 0.4);
    s.vessel(122, yM, 34, 52, 6.5, '#C3CAD0', 'metal', 0.4);
    // control panel
    s.box(46, yM + 8, 36, 22, 7, 38, PANEL);
    s.on([0, yM + 15, 0], X, Z, rect(49, 58, 16, 10), GLASS);
    s.label([57, yM + 15.2, 48], X, [0, 0, -1], 'A / B', 4.5, '#34495E');
  };
  PORTS.adsorb = function (p) { return [{ p: [-8, 46, 26], ax: '-x', kind: 'pipe', d: 10 }, { p: [118, 46, 20 + p.h + 10], ax: '+x', kind: 'pipe', d: 10 }]; };
  CEN.adsorb = function (p) { return [57, 30, 20 + p.h / 2]; };

  /* ---------------- gas supply ---------------- */
  var GASCOL = ['#E8C547', '#3C8DBC', '#8E44AD', '#27AE60', '#C0392B', '#95A5A6'];
  DEF.gascab = { cyl: 2 };
  B.gascab = function (s, p) {
    var n = p.cyl, Wx = 26 + n * 24, Dp = 42, H = 156, zb = 4, i, F = [0, Dp, 0];
    s.shadowRect(-3, -3, Wx + 6, Dp + 6, 0.32, 7);
    s.box(-2, -2, 0, Wx + 4, Dp + 4, zb, '#3F474D');
    s.box(0, 0, zb, Wx, Dp, H, '#E6E3DA');
    // exhaust duct
    s.mat = 'metal'; s.cz(Wx * 0.68, Dp * 0.45, zb + H, 22, 9, '#BCC3C8'); s.cz(Wx * 0.68, Dp * 0.45, zb + H + 22, 3, 11, '#9AA3A9'); s.mat = 'paint';
    s.mat = 'metal'; s.cz(Wx * 0.25, Dp * 0.35, zb + H, 14, 1.6, '#C9CFD4'); s.mat = 'paint';
    // door frame + window with the cylinders behind glass
    s.on(F, X, Z, rect(3, zb + 6, Wx - 6, H - 12), '#DAD6CB');
    var wz0 = zb + 22, wz1 = zb + H - 44;
    s.clip(onP(F, X, Z, rect(8, wz0, Wx - 16, wz1 - wz0)));
    s.on([0, 3, 0], X, Z, rect(0, zb, Wx, H), '#4D555B', null, false);
    s.on([0, 0, zb + 4], X, Y, rect(0, 0, Wx, Dp), '#5E676D', null, false);
    s.box(4, 3, zb + H * 0.55, Wx - 8, 3, 30, '#8E979D');
    for (i = 0; i < n; i++) s.gaugeY(12 + i * 24, 6, zb + H * 0.55 + 18, 3);
    for (i = 0; i < n; i++) {
      var cxp = 16 + i * 24;
      s.gasCyl(cxp, Dp * 0.5, zb + 6, H * 0.62, 9, '#8E9AA3', GASCOL[i % GASCOL.length]);
      s.mat = 'metal'; s.line3([[cxp, Dp * 0.5, zb + 6 + H * 0.65], [cxp, Dp * 0.3, zb + H * 0.58], [cxp - 4, 6, zb + H * 0.58]], '#D5DBDF', 1.2); s.mat = 'paint';
    }
    s.unclip();
    var glass = s.def1('glass', '<linearGradient id="@ID" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".05"/><stop offset=".42" stop-color="#FFFFFF" stop-opacity=".05"/><stop offset=".48" stop-color="#FFFFFF" stop-opacity=".45"/><stop offset=".56" stop-color="#FFFFFF" stop-opacity=".08"/><stop offset="1" stop-color="#BFD9E6" stop-opacity=".25"/></linearGradient>');
    if (!s.hidden(onP(F, X, Z, rect(8, wz0, Wx - 16, wz1 - wz0)))) s.path(s.d(onP(F, X, Z, rect(8, wz0, Wx - 16, wz1 - wz0))), 'url(#' + glass + ')', ' stroke="#8E979D" stroke-width="1.6"');
    // HMI, lamps, labels
    s.on(F, X, Z, rect(8, zb + H - 38, Wx * 0.45, 24), '#2E3439');
    s.on(F, X, Z, rect(11, zb + H - 34, Wx * 0.45 - 6, 14), GLASS);
    s.on(F, X, Z, circ(Wx * 0.62, zb + H - 26, 3, 16), ST, 'st#run');
    s.on(F, X, Z, circ(Wx * 0.62 + 9, zb + H - 26, 3, 16), '#C0392B', 'st#alarm');
    s.hazard(F, X, Z, 8, zb + 9, Wx - 16, 7);
    s.on(F, X, Z, rect(Wx * 0.2, zb + H - 10, Wx * 0.6, 6), '#FFFFFF', null, false);
    s.label([Wx * 0.5, Dp + 0.3, zb + H - 7], X, [0, 0, -1], 'GAS CABINET', 4.2, '#C0392B');
    s.on(F, X, Z, rect(Wx - 7, zb + 60, 2.5, 26), '#8E979D');
    for (i = 0; i < 6; i++) s.on([Wx, 0, 0], Y, Z, rect(8, zb + 12 + i * 5, Dp - 16, 2.5), '#9AA3A9', null, false);
  };
  PORTS.gascab = function (p) { var Wx = 26 + p.cyl * 24; return [{ p: [Wx * 0.25, 42 * 0.35, 174], ax: '+z', kind: 'pipe', d: 3 }]; };
  CEN.gascab = function (p) { return [(26 + p.cyl * 24) / 2, 21, 80]; };

  DEF.gasrack = { cyl: 3 };
  B.gasrack = function (s, p) {
    var n = p.cyl, Lx = 22 + n * 24, Dp = 34, H = 138, i, k;
    s.shadowRect(-4, -4, Lx + 8, Dp + 8, 0.3, 6);
    s.box(-2, -2, 0, Lx + 4, Dp + 4, 4, '#4B535A');
    s.box(0, 0, 4, 5, 5, H, '#6E777D'); s.box(Lx - 5, 0, 4, 5, 5, H, '#6E777D');
    // back panel with regulators and gauges
    s.box(6, 1, 50, Lx - 12, 3, H - 58, '#B8BFC4');
    for (i = 0; i < n; i++) {
      var px = 14 + i * 24;
      s.mat = 'metal'; s.cy(px, 4, 104, 6, 4, '#C9CFD4'); s.cz(px, 7, 104, 10, 1.4, '#C9CFD4'); s.mat = 'paint';
      s.gaugeY(px + 7, 4, 112, 3); s.gaugeY(px - 7, 4, 112, 3);
      s.valve3d([px, 6, 88], '+z', 2, '+y', '#2F6CB0');
    }
    s.mat = 'metal'; s.cx(4, 7, H - 14, Lx + 8, 2, '#C9CFD4'); s.mat = 'paint';
    // cylinders + pigtails
    for (i = 0; i < n; i++) {
      var cx2 = 14 + i * 24;
      s.gasCyl(cx2, Dp * 0.55, 6, H * 0.66, 9.5, '#7F8C8D', GASCOL[i % GASCOL.length]);
      s.mat = 'metal';
      s.line3([[cx2, Dp * 0.55 + 6.6, 6 + H * 0.69], [cx2 + 3, Dp * 0.4, 6 + H * 0.73], [cx2, 9, 88]], '#D5DBDF', 1.2);
      s.mat = 'paint';
    }
    // restraint chains
    for (k = 0; k < 2; k++) s.line3([[3, Dp * 0.55 + 10, 34 + k * 40], [Lx - 3, Dp * 0.55 + 10, 34 + k * 40]], '#3A4247', 1.4);
    s.box(0, Dp - 5, 4, 5, 5, H, '#6E777D'); s.box(Lx - 5, Dp - 5, 4, 5, 5, H, '#6E777D');
    s.box(0, 0, H, Lx, 5, 4, '#7B848B'); s.box(0, Dp - 5, H, Lx, 5, 4, '#7B848B');
    s.box(0, 0, H, 5, Dp, 4, '#7B848B'); s.box(Lx - 5, 0, H, 5, Dp, 4, '#7B848B');
    s.on([0, Dp, 0], X, Z, rect(Lx * 0.3, H - 1, Lx * 0.4, 6), '#F2C230', null, false);
    s.label([Lx * 0.5, Dp + 0.3, H + 2], X, [0, 0, -1], 'GAS RACK', 3.8, '#22272B');
  };
  PORTS.gasrack = function (p) { var Lx = 22 + p.cyl * 24; return [{ p: [Lx + 12, 7, 124], ax: '+x', kind: 'pipe', d: 4 }]; };
  CEN.gasrack = function (p) { return [(22 + p.cyl * 24) / 2, 17, 70]; };

  /* ---------------- water treatment ---------------- */
  // RO skid: horizontal membrane pressure vessels on a rack, cartridge filters, HP pump, panel
  DEF.ro = { vessels: 4 };
  function roGeo(p) { var cols = Math.ceil(p.vessels / 2); return { cols: cols, L: 176, Wd: 36 + cols * 26, H: 132 }; }
  B.ro = function (s, p) {
    var g = roGeo(p), L = g.L, Wd = g.Wd, i, c, rw, list = [];
    s.shadowRect(-4, -4, L + 20, Wd + 8, 0.3, 7);
    s.box(-2, -2, 0, L + 16, Wd + 4, 6, '#3F474D');
    s.box(8, 4, 6, 5, 5, g.H, '#7B848B'); s.box(158, 4, 6, 5, 5, g.H, '#7B848B');
    for (i = 0; i < p.vessels; i++) list.push([i % 2, Math.floor(i / 2)]);
    list.sort(function (a, b) { return (a[1] * 26 + a[0] * 26) - (b[1] * 26 + b[0] * 26); });
    for (i = 0; i < list.length; i++) {
      rw = list[i][0]; c = list[i][1];
      var yv = 16 + c * 26, zv = 72 + rw * 26;
      s.mat = 'pipe';
      s.latheAx([4, yv, zv], 'x', [[0, 6], [2, 9.5], [4, 10], [150, 10], [152, 9.5], [154, 6]], '#F0F2F3', 32);
      s.mat = 'metal'; s.cx(158, yv, zv, 6, 2.6, '#A9B1B7'); s.mat = 'paint';
      s.ring([10, yv, zv], Y, Z, 10.2, '#9AA3A9', 1.2); s.ring([148, yv, zv], Y, Z, 10.2, '#9AA3A9', 1.2);
    }
    s.mat = 'metal'; s.cz(166, 16, 60, 60, 3, '#A9B1B7'); if (g.cols > 1) s.cz(166, 16 + (g.cols - 1) * 26, 60, 60, 3, '#A9B1B7'); s.mat = 'paint';
    s.box(8, Wd - 9, 6, 5, 5, g.H, '#7B848B'); s.box(158, Wd - 9, 6, 5, 5, g.H, '#7B848B');
    s.box(8, 4, 56, 155, 5, 4, '#7B848B'); s.box(8, Wd - 9, 56, 155, 5, 4, '#7B848B');
    // cartridge filters
    s.vessel(24, Wd - 14, 8, 44, 7, '#C3CAD0', 'metal', 0.35); s.vessel(42, Wd - 14, 8, 44, 7, '#C3CAD0', 'metal', 0.35);
    s.gaugeY(33, Wd - 7, 50, 3.5);
    // high pressure pump (compact vertical multistage)
    s.cz(86, Wd - 16, 8, 8, 10, PUMPBLUE);
    s.mat = 'metal'; s.cz(86, Wd - 16, 16, 22, 7, '#C3CAD0'); s.mat = 'paint';
    s.cz(86, Wd - 16, 38, 22, 8.5, ST, 'st#pump');
    // control panel
    s.box(118, Wd - 16, 6, 36, 12, 48, PANEL);
    s.on([0, Wd - 4, 0], X, Z, rect(122, 36, 18, 11), GLASS);
    s.on([0, Wd - 4, 0], X, Z, circ(146, 42, 2.4, 14), ST, 'st#run');
    s.label([136, Wd - 3.7, 24], X, [0, 0, -1], 'RO', 8, '#1F4E8C');
  };
  PORTS.ro = function (p) { var g = roGeo(p); return [{ p: [-2, g.Wd - 14, 30], ax: '-x', kind: 'pipe', d: 8 }, { p: [166, 16, 120], ax: '+z', kind: 'pipe', d: 6 }]; };
  CEN.ro = function (p) { var g = roGeo(p); return [85, g.Wd / 2, 60]; };

  // DI skid: FRP resin columns with valve heads, conductivity panel
  DEF.di = { cols: 3 };
  B.di = function (s, p) {
    var n = p.cols, Lx = 20 + n * 40, i, x;
    s.shadowRect(-4, -4, Lx + 8, 70, 0.3, 7);
    s.box(-2, -2, 0, Lx + 4, 66, 6, '#3F474D');
    s.mat = 'metal'; s.cx(6, 52, 20, Lx - 12, 3.5, '#A9B1B7'); s.cx(6, 52, 118, Lx - 12, 3.5, '#A9B1B7'); s.mat = 'paint';
    for (i = 0; i < n; i++) {
      x = 30 + i * 40;
      s.cz(x, 26, 6, 6, 16, '#2A3136');
      s.mat = 'pipe';
      s.lathe(x, 26, capProf(10, 96, 17, 9, 8), '#2F6CB0', 44);
      s.mat = 'paint';
      s.label([x + 17 * 0.7071 + 0.6, 26 + 17 * 0.7071 + 0.6, 60], [0.7071, -0.7071, 0], [0, 0, -1], i === n - 1 && n > 2 ? 'MB' : (i % 2 ? 'AN' : 'CAT'), 5.5, '#FFFFFF');
      s.cz(x, 26, 104, 8, 8, '#1E2327'); s.box(x - 8, 18, 110, 16, 16, 8, '#2A3136');
      s.mat = 'metal';
      s.cyl([x, 30, 114], [x, 52, 118], 2.2, '#A9B1B7', null, false);
      s.cyl([x, 40, 20], [x, 52, 20], 2.2, '#A9B1B7', null, false);
      s.mat = 'paint';
      s.on([0, 34.1, 0], X, Z, circ(x, 114, 2.2, 14), ST, 'st#col' + (i + 1));
    }
    s.box(Lx - 20, 56, 30, 18, 8, 34, PANEL);
    s.on([0, 64, 0], X, Z, rect(Lx - 17, 50, 12, 8), GLASS);
    s.label([Lx - 11, 64.2, 40], X, [0, 0, -1], 'DI', 6, '#1F4E8C');
  };
  PORTS.di = function (p) { var Lx = 20 + p.cols * 40; return [{ p: [2.5, 52, 20], ax: '-x', kind: 'pipe', d: 7 }, { p: [Lx - 6 + 3.5, 52, 118], ax: '+x', kind: 'pipe', d: 7 }]; };
  CEN.di = function (p) { return [(20 + p.cols * 40) / 2, 32, 60]; };

  /* ---------------- fixed symbols ---------------- */

  B.ahu = function (s) {
    s.shadowRect(-8, -8, 236, 86, 0.3, 6);
    var Lf = [0, 70, 0], k, xs = [56, 100, 144];
    s.box(-6, -6, -8, 232, 82, 8, DARK);
    s.box(-26, 12, 16, 26, 46, 50, STEEL);
    s.box(0, 0, 0, 220, 70, 80, BODY);
    for (k = 0; k < 3; k++) {
      s.on(Lf, X, Z, rect(xs[k] - 0.6, 0, 1.2, 80), DARK, null, false);
      s.on([0, 0, 80], X, Y, rect(xs[k] - 0.6, 0, 1.2, 70), FRAME, null, false);
    }
    s.on(Lf, X, Z, rect(7, 9, 42, 62), FRAME); s.on(Lf, X, Z, rect(10, 12, 36, 56), MEDIA, null, false);
    for (k = 0; k < 9; k++) s.on(Lf, X, Z, rect(10 + k * 4, 12, 2, 56), '#D6CFB6', null, false);
    var coils = [[62, CHW], [106, HW]], c;
    for (c = 0; c < 2; c++) {
      var x0 = coils[c][0];
      s.on(Lf, X, Z, rect(x0, 9, 32, 62), FRAME); s.on(Lf, X, Z, rect(x0 + 3, 12, 26, 56), '#AEB6BB', null, false);
      s.on(Lf, X, Z, rect(x0 + 8, 12, 16, 56), FIN, null, false);
      for (k = 0; k < 6; k++) s.ln(Lf, X, Z, [[x0 + 9 + k * 2.8, 12], [x0 + 9 + k * 2.8, 68]], '#B7C2CA', 0.5);
      s.tube(Lf, X, Z, serpU(x0 + 8, x0 + 24, 17, 7, 8), coils[c][1], 2);
    }
    s.on(Lf, X, Z, rect(151, 7, 62, 66), FRAME); s.on(Lf, X, Z, rect(154, 10, 56, 60), WIN, null, false);
    s.rotor(Lf, X, Z, 182, 40, 25, 7, 'sf');
    var hx2 = [49, 93, 137, 215];
    for (k = 0; k < 4; k++) s.on(Lf, X, Z, rect(hx2[k], 34, 2.5, 12), DARK);
    s.cy(70, 70, 66, 12, 3, CHW); s.cy(86, 70, 14, 12, 3, CHW);
    s.cy(114, 70, 66, 12, 3, HW); s.cy(130, 70, 14, 12, 3, HW);
    s.box(220, 12, 18, 26, 46, 50, STEEL);
  };
  CEN.ahu = [110, 35, 40];

  B.fan = function (s) {
    var p = [], k, N = 48, t, r;
    s.shadowRect(-42, -4, 144, 44, 0.3, 5);
    for (k = 0; k <= N; k++) { t = PI / 2 - k / N * 2 * PI; r = 30 + 14 * k / N; p.push([r * Math.cos(t), r * Math.sin(t)]); }
    p.push([50, 44]); p.push([50, 30]);
    s.box(-40, -2, -52, 140, 40, 8, DARK);
    s.box(-28, 6, -44, 8, 24, 12, FRAME); s.box(20, 6, -44, 8, 24, 12, FRAME);
    s.box(68, 4, -44, 20, 24, 6, DARK);
    s.cy(78, 0, -24, 32, 13, ST, 'st#motor'); s.cy(78, 32, -24, 3, 10, DARK);
    s.ext([0, 0, 0], X, Z, p, [0, 36, 0], BODY, null, 'facet');
    var F = [0, 36, 0];
    s.on(F, X, Z, circ(0, 0, 21, 40), FRAME);
    s.rotor(F, X, Z, 0, 0, 17, 8, 'fan');
    s.box(50, -2, 28, 4, 40, 18, FRAME);
  };
  CEN.fan = [20, 18, -10];

  B.fcu = function (s) {
    var k;
    s.box(-2, -2, -3, 124, 64, 3, FRAME);
    s.cz(6, 6, 34, 12, 1.2, STEEL); s.cz(114, 6, 34, 12, 1.2, STEEL);
    s.box(0, 0, 0, 120, 60, 34, BODY);
    s.cz(6, 54, 34, 12, 1.2, STEEL); s.cz(114, 54, 34, 12, 1.2, STEEL);
    var Lf = [0, 60, 0];
    s.on(Lf, X, Z, rect(4, 4, 38, 26), PANEL);
    s.on(Lf, X, Z, rect(50, 4, 50, 26), WIN);
    s.rotor(Lf, X, Z, 63, 17, 10, 6, 'fan1'); s.rotor(Lf, X, Z, 87, 17, 10, 6, 'fan2');
    var R = [120, 0, 0];
    s.on(R, Y, Z, rect(6, 5, 48, 24), FRAME);
    s.on(R, Y, Z, rect(8, 7, 44, 20), WIN, null, false);
    for (k = 0; k < 6; k++) s.on(R, Y, Z, rect(9, 8 + k * 3.2, 42, 1.4), STEEL, null, false);
    s.cy(10, 60, 24, 10, 2.5, CHW); s.cy(20, 60, 24, 10, 2.5, CHW); s.cy(34, 60, 5, 8, 1.8, STEEL);
  };
  CEN.fcu = [60, 30, 17];

  B.damper = function (s) {
    var k, R = [12, 0, 0];
    s.box(-30, 6, 6, 30, 68, 68, STEEL);
    s.box(0, 0, 0, 12, 80, 80, BODY);
    s.on(R, Y, Z, rect(7, 7, 66, 66), FRAME);
    s.on(R, Y, Z, rect(9, 9, 62, 62), WIN, null, false);
    s.clip(onP(R, Y, Z, rect(9, 9, 62, 62)));
    for (k = 0; k < 4; k++) s.ext([0, 9, 0], X, Z, rot2(rect(-8, -1.2, 16, 2.4), 0.7, 7, 17 + k * 15.3), [0, 62, 0], ST, 'st', 'flat');
    s.unclip();
    s.box(1, 80, 30, 10, 12, 22, DARK);
    s.cy(6, 92, 41, 3, 4, FRAME);
  };
  CEN.damper = [6, 40, 40];

  function coil(s, col) {
    var k, R = [12, 0, 0];
    s.box(0, 0, 0, 12, 76, 96, FRAME);
    s.on(R, Y, Z, rect(5, 5, 66, 86), '#AEB6BB', null, false);
    s.on(R, Y, Z, rect(14, 5, 48, 86), FIN, null, false);
    for (k = 0; k < 16; k++) s.ln(R, Y, Z, [[15.5 + k * 3, 5], [15.5 + k * 3, 91]], '#B5C0C8', 0.5);
    s.tube(R, Y, Z, serpU(14, 62, 10, 7.6, 11), col, 2.6);
    s.cz(6, 82, 6, 84, 4, col);
    s.cy(6, 84, 80, 14, 3, col); s.cy(6, 84, 14, 14, 3, col);
  }
  B.ccoil = function (s) { coil(s, CHW); };
  B.hcoil = function (s) { coil(s, HW); };
  CEN.ccoil = CEN.hcoil = CEN.filter = CEN.humid = [6, 38, 48];

  B.filter = function (s) {
    var k, R = [12, 0, 0];
    s.box(0, 0, 0, 12, 76, 96, FRAME);
    for (k = 0; k < 17; k++) s.on(R, Y, Z, rect(5 + k * 3.88, 5, 3.88, 86), k % 2 ? '#D6CFB6' : MEDIA, null, false);
    s.box(20, 76, 58, 20, 4, 26, DARK);
    s.on([0, 80, 0], X, Z, circ(30, 74, 7, 28), WHITE);
    s.ln([0, 80, 0], X, Z, [[30, 74], [34, 79]], HW, 1.2);
  };

  B.humid = function (s) {
    var k, R = [12, 0, 0], D = [16, 0, 0];
    s.box(0, 0, 0, 12, 76, 96, FRAME);
    s.on(R, Y, Z, rect(5, 5, 66, 86), FIN, null, false);
    s.on(R, Y, Z, rect(5, 5, 66, 8), '#9AA3A9', null, false);
    for (k = 0; k < 5; k++) {
      s.on(D, Y, Z, drop(14 + k * 13, 58, 2.6), '#5AA6DE', null, false);
      s.on(D, Y, Z, drop(20 + k * 13 - (k === 4 ? 12 : 0), 40, 2.2), '#5AA6DE', null, false);
      s.on(D, Y, Z, drop(14 + k * 13, 22, 1.8), '#7DB8E4', null, false);
    }
    for (k = 0; k < 5; k++) s.cz(16, 14 + k * 13, 71, 7, 1.6, STEEL);
    s.cy(16, 4, 80, 66, 3, STEEL);
    s.cy(16, 70, 80, 22, 3, STEEL);
    s.box(10, 78, 74, 12, 10, 12, ST, 'st');
    s.cz(16, 83, 86, 8, 4, DARK);
  };

  B.chiller = function (s) {
    s.shadowRect(-8, 8, 222, 76, 0.3, 7);
    s.box(-6, 10, -8, 216, 72, 8, DARK);
    s.box(20, 22, 0, 14, 46, 8, FRAME); s.box(160, 22, 0, 14, 46, 8, FRAME);
    s.cx(5, 45, 30, 190, 24, BODY);
    s.cx(195, 45, 30, 9, 27, FRAME);
    s.cy(199, 66, 40, 22, 5, CHW); s.cy(199, 86, 40, 3, 8, CHW);
    s.cy(199, 66, 20, 22, 5, CHW); s.cy(199, 86, 20, 3, 8, CHW);
    s.cx(5, 45, 80, 190, 24, BODY);
    s.cx(195, 45, 80, 9, 27, FRAME);
    s.cy(199, 66, 90, 22, 5, CW); s.cy(199, 86, 90, 3, 8, CW);
    s.cy(199, 66, 70, 22, 5, CW); s.cy(199, 86, 70, 3, 8, CW);
    s.cz(34, 45, 100, 12, 6, FRAME);
    s.cx(24, 45, 122, 12, 24, FRAME);
    s.cx(36, 45, 122, 78, 18, BODY);
    s.cx(114, 45, 122, 52, 17, ST, 'st#comp1');
    s.cx(166, 45, 122, 4, 12, DARK);
    s.box(30, 72, 30, 40, 8, 46, DARK);
    var F = [0, 80, 0];
    s.on(F, X, Z, rect(36, 56, 22, 14), GLASS);
    s.on(F, X, Z, rect(36, 38, 22, 3), STEEL, null, false);
    s.on(F, X, Z, circ(64, 64, 2.8, 20), ST, 'st#run');
  };
  CEN.chiller = [100, 45, 60];

  B.boiler = function (s) {
    s.shadowRect(-6, 2, 174, 76, 0.3, 7);
    s.box(-4, 4, -6, 170, 72, 6, DARK);
    s.box(18, 14, 0, 14, 52, 10, FRAME); s.box(118, 14, 0, 14, 52, 10, FRAME);
    s.cz(20, 40, 78, 52, 10, STEEL);
    s.cx(0, 40, 48, 150, 40, BODY);
    s.cz(20, 40, 130, 3, 12, FRAME);
    s.cx(150, 40, 48, 8, 40, FRAME);
    s.cz(70, 40, 84, 22, 6, HW); s.cz(70, 40, 106, 3, 9, HW);
    s.cz(100, 40, 84, 14, 3, STEEL); s.cz(100, 40, 98, 4, 5, HW);
    s.box(158, 20, 26, 26, 40, 44, DARK);
    s.on([184, 0, 0], Y, Z, circ(30, 36, 4, 20), '#F29B38');
    s.cx(184, 40, 52, 22, 12, ST, 'st#burner'); s.cx(206, 40, 52, 3, 8, DARK);
    s.cy(120, 72, 20, 18, 5, CHW); s.cy(120, 90, 20, 3, 8, CHW);
    s.box(30, 76, 40, 34, 6, 34, DARK);
    var F = [0, 82, 0];
    s.on(F, X, Z, rect(35, 58, 16, 10), GLASS);
    s.on(F, X, Z, circ(58, 62, 5, 24), WHITE);
    s.ln(F, X, Z, [[58, 62], [61, 65]], HW, 1);
  };
  CEN.boiler = [80, 40, 48];

  B.tower = function (s) {
    s.shadowRect(-6, -6, 112, 112, 0.3, 7);
    var k, Lf = [0, 100, 0], R = [100, 0, 0], sx = [25, 50, 75];
    s.box(-4, -4, 0, 108, 108, 20, FRAME);
    s.box(0, 0, 20, 100, 100, 100, BODY);
    for (k = 0; k < 7; k++) {
      s.on(Lf, X, Z, rect(4, 26 + k * 6, 92, 3.4), '#6D767C', null, false);
      s.on(R, Y, Z, rect(4, 26 + k * 6, 92, 3.4), '#6D767C', null, false);
    }
    for (k = 0; k < 3; k++) {
      s.on(Lf, X, Z, rect(sx[k] - 0.5, 72, 1, 48), FRAME, null, false);
      s.on(R, Y, Z, rect(sx[k] - 0.5, 72, 1, 48), FRAME, null, false);
    }
    s.cz(50, 50, 120, 26, 40, BODY);
    s.cz(50, 50, 146, 3, 42, FRAME);
    s.rotor([0, 0, 149], X, Y, 50, 50, 37, 6, 'fan');
    s.guard([0, 0, 149.3], X, Y, 50, 50, 37);
    s.cy(20, 100, 106, 22, 6, CW); s.cy(20, 120, 106, 3, 9, CW);
    s.cx(104, 70, 8, 20, 5, CW); s.cx(122, 70, 8, 3, 8, CW);
  };
  CEN.tower = [50, 50, 70];

  B.pump = function (s) {
    s.shadowRect(-6, -4, 164, 48, 0.3, 5);
    var k;
    s.box(-4, -2, -6, 160, 44, 6, DARK);
    s.box(8, 6, 0, 52, 28, 10, DARK);
    s.cx(0, 20, 32, 72, 22, ST, 'st#motor');
    for (k = 0; k < 5; k++) s.cx(8 + k * 12, 20, 32, 1.6, 23.2, ST, 'st#motor');
    s.box(24, 10, 53, 20, 20, 10, FRAME);
    s.cx(72, 20, 32, 6, 16, DARK);
    s.box(78, 8, 20, 18, 24, 22, FRAME);
    s.cx(96, 20, 32, 10, 14, FRAME);
    s.box(106, 8, 0, 18, 24, 8, DARK);
    s.cx(106, 20, 32, 30, 26, BODY);
    s.cz(121, 20, 56, 18, 9, STEEL); s.cz(121, 20, 74, 3, 14, STEEL);
    s.cx(136, 20, 32, 14, 11, STEEL); s.cx(150, 20, 32, 3, 16, STEEL);
  };
  PORTS.pump = function () { return [{ p: [153, 20, 32], ax: '+x', kind: 'pipe', d: 22 }, { p: [121, 20, 77], ax: '+z', kind: 'pipe', d: 18 }]; };
  CEN.pump = [75, 20, 30];

  function valve(s, three) {
    s.cx(0, 20, 20, 26, 7, STEEL); s.cx(26, 20, 20, 4, 12, STEEL);
    s.cz(44, 20, 4, 5, 12, ST, 'st'); s.cz(44, 20, 9, 5, 16, ST, 'st'); s.cz(44, 20, 14, 12, 18, ST, 'st');
    s.cz(44, 20, 26, 5, 16, ST, 'st'); s.cz(44, 20, 31, 5, 12, ST, 'st');
    if (three) { s.cy(44, 34, 20, 20, 7, STEEL); s.cy(44, 54, 20, 4, 12, STEEL); }
    s.cx(58, 20, 20, 4, 12, STEEL); s.cx(62, 20, 20, 26, 7, STEEL);
    s.cz(44, 20, 36, 10, 8, FRAME); s.cz(44, 20, 46, 10, 2, STEEL);
    s.box(30, 6, 56, 28, 28, 20, BODY);
    s.on([0, 34, 0], X, Z, rect(35, 62, 12, 7), WIN);
    s.on([58, 0, 0], Y, Z, rect(10, 60, 10, 3), DARK, null, false);
    s.cz(44, 20, 76, 5, 9, FRAME);
  }
  B.valve2 = function (s) { valve(s, false); };
  B.valve3 = function (s) { valve(s, true); };
  PORTS.valve2 = function () { return [{ p: [0, 20, 20], ax: '-x', kind: 'pipe', d: 14 }, { p: [88, 20, 20], ax: '+x', kind: 'pipe', d: 14 }]; };
  PORTS.valve3 = function () { return [{ p: [0, 20, 20], ax: '-x', kind: 'pipe', d: 14 }, { p: [88, 20, 20], ax: '+x', kind: 'pipe', d: 14 }, { p: [44, 58, 20], ax: '+y', kind: 'pipe', d: 14 }]; };
  CEN.valve2 = CEN.valve3 = [44, 20, 30];

  B.phe = function (s) {
    s.shadowRect(-6, -2, 144, 64, 0.3, 6);
    var k;
    s.box(-4, 0, -6, 20, 60, 6, DARK); s.box(120, 20, -6, 16, 20, 6, DARK);
    s.box(0, 0, 0, 12, 60, 116, FRAME);
    s.box(12, 4, 6, 68, 52, 104, PANEL);
    for (k = 0; k < 22; k++) {
      s.on([0, 56, 0], X, Z, rect(14 + k * 3, 6, 1, 104), '#8E979D', null, false);
      s.on([0, 0, 110], X, Y, rect(14 + k * 3, 4, 1, 52), '#9AA3A9', null, false);
    }
    s.box(80, 0, 0, 12, 60, 116, FRAME);
    s.box(124, 24, 0, 8, 12, 110, DARK);
    s.box(0, 26, 110, 132, 8, 7, DARK);
    s.cx(-4, 62, 18, 100, 2.2, STEEL); s.cx(92, 62, 18, 4, 4, DARK);
    s.cx(-4, 62, 94, 100, 2.2, STEEL); s.cx(92, 62, 94, 4, 4, DARK);
    s.cx(92, 16, 92, 16, 6, HW); s.cx(108, 16, 92, 3, 10, HW);
    s.cx(92, 16, 24, 16, 6, CHW); s.cx(108, 16, 24, 3, 10, CHW);
    s.cx(92, 44, 92, 16, 6, CHW); s.cx(108, 44, 92, 3, 10, CHW);
    s.cx(92, 44, 24, 16, 6, HW); s.cx(108, 44, 24, 3, 10, HW);
  };
  CEN.phe = [60, 30, 58];

  B.exptank = function (s) {
    s.shadowDisc(0, 0, 30, 0.3, 6);
    s.cz(-16, -16, 0, 14, 2, DARK); s.cz(16, -16, 0, 14, 2, DARK); s.cz(-16, 16, 0, 14, 2, DARK); s.cz(16, 16, 0, 14, 2, DARK);
    s.cz(0, 0, 0, 16, 4, STEEL);
    s.cz(0, 0, 14, 40, 26, BODY);
    s.cz(0, 0, 54, 3, 27, FRAME);
    s.cz(0, 0, 57, 45, 26, BODY);
    s.cz(0, 0, 102, 4, 22, BODY); s.cz(0, 0, 106, 3, 15, BODY); s.cz(0, 0, 109, 5, 4, STEEL);
    s.cy(0, 24, 84, 8, 2.5, STEEL); s.cy(0, 32, 84, 3, 7, WHITE);
    s.ln([0, 35, 0], X, Z, [[0, 84], [3.5, 87.5]], HW, 1);
    s.cy(0, 24, 36, 10, 3, STEEL); s.cy(0, 34, 36, 3, 5, STEEL);
  };
  CEN.exptank = [0, 0, 55];

  // primitives that form draw groups (see Sym.reset); 'fan' is the old alias of rotor
  var PRIMS = ['box', 'cx', 'cy', 'cz', 'cyl', 'ext', 'face', 'on', 'ln', 'line3', 'tube', 'ring', 'lathe', 'latheAx', 'vessel', 'sphere', 'rotor', 'fan', 'guard',
    'label', 'panels', 'valve3d', 'gaugeX', 'gaugeY', 'gaugeOn', 'gasCyl', 'hazard', 'liquid', 'valveWheel', 'path'];
  DECAL.fan = 1; DECAL.path = 1;
  for (var pi = 0; pi < PRIMS.length; pi++) if (Sym.prototype[PRIMS[pi]]) wrapPrim(PRIMS[pi]);

  // equipment that can face four directions (pipe family, ducts and fans use their own dir parameter)
  var ROTATABLE = { screw: 1, n2tank: 1, watertank: 1, vacuum: 1, header: 1, pumpms: 1, pumpv: 1, aircomp: 1, airtank: 1, exptank2: 1,
    aftercooler: 1, dryer: 1, adsorb: 1, gascab: 1, gasrack: 1, ro: 1, di: 1 };
  for (var rt in ROTATABLE) { if (!DEF[rt]) DEF[rt] = {}; if (DEF[rt].rot === undefined) DEF[rt].rot = 0; }
  function quarter(type, q) { return ROTATABLE[type] && !q.cut ? Math.round((q.rot || 0) / 90) : 0; }
  function axRot(ax, k) {
    if (!ax || ax === 'any' || !k) return ax;
    var v = rz(dv(ax), k);
    return (v[0] + v[1] + v[2] < 0 ? '-' : '+') + (Math.abs(v[0]) > 0.5 ? 'x' : Math.abs(v[1]) > 0.5 ? 'y' : 'z');
  }

  var ids = ['jetfan', 'inlinefan', 'duct', 'pipe', 'joint', 'screw', 'ahu', 'fan', 'fcu', 'damper', 'ccoil', 'hcoil', 'filter', 'humid', 'chiller', 'boiler', 'tower', 'pump', 'valve2', 'valve3', 'phe', 'exptank'];

  function params(type, p) {
    var d = DEF[type] || {}, r = {}, k;
    for (k in d) r[k] = d[k];
    if (p) for (k in p) r[k] = p[k];
    return r;
  }
  // build with the view rotated for this item; always restores the default view
  function withView(type, q, fn) {
    setView(quarter(type, q));
    try { return fn(); } finally { setView(0); }
  }
  function make(type, p, uid, anim) {
    var q = params(type, p), s = new Sym(uid || type); s.anim = !!anim;
    withView(type, q, function () { B[type](s, q); s.body = s.final(); });
    return s;
  }
  function body(s) { return (s.defs.length ? '<defs>' + s.defs.join('') + '</defs>' : '') + s.body; }
  function svgOf(s) {
    var p = 3, x = Math.floor(s.x0 - p), y = Math.floor(s.y0 - p), W = Math.ceil(s.x1 + p) - x, H = Math.ceil(s.y1 + p) - y;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x + ' ' + y + ' ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + body(s) + '</svg>';
  }
  function portsOf(type, q) {
    var list = PORTS[type] ? PORTS[type](q) : [], k = quarter(type, q), out = [], i, pt, key;
    for (i = 0; i < list.length; i++) {
      pt = {}; for (key in list[i]) pt[key] = list[i][key];
      if (k) { pt.p = rz(list[i].p, k); pt.ax = axRot(list[i].ax, k); }
      out.push(pt);
    }
    return out;
  }
  return {
    ids: ids,
    stopColor: ST,
    svc: SVC,
    proj: proj,
    params: params,
    parametric: function (type) { return !!DEF[type]; },
    rotatable: function (type) { return !!ROTATABLE[type]; },
    build: function (type, p, anim) { return svgOf(make(type, p, type, anim)); },
    part: function (type, p, uid, anim) {
      var s = make(type, p, uid, anim);
      return { markup: body(s), box: [s.x0, s.y0, s.x1, s.y1] };
    },
    mix: mixc,
    // MUI Custom Symbol markup (viewBox origin 0 0; pipe family carries MUI stock-pipe snap attributes)
    mui: function (type, p, name, frame) {
      var q = params(type, p), s = new Sym(name), vb, k = quarter(type, q);
      s.mui = true;
      setView(k);
      try {
        B[type](s, q);
        if (frame && (type === 'joint' || type === 'ductjoint')) vb = [-frame.mx, -frame.my, 2 * frame.mx, 2 * frame.my];
        else if (frame) {
          var e = proj(AX(q.dir).P(q.len, 0, 0));
          vb = [Math.min(0, e[0]) - frame.mx, Math.min(0, e[1]) - frame.my, Math.abs(e[0]) + 2 * frame.mx, Math.abs(e[1]) + 2 * frame.my];
        } else {
          vb = [Math.floor(s.x0 - 3), Math.floor(s.y0 - 3), 0, 0];
          vb[2] = Math.ceil(s.x1 + 3) - vb[0]; vb[3] = Math.ceil(s.y1 + 3) - vb[1];
        }
        s.body = s.final();
        if (type === 'ductjoint') { s.defs = []; s.body = '<rect x="' + r1(vb[0]) + '" y="' + r1(vb[1]) + '" width="' + r1(vb[2]) + '" height="' + r1(vb[3]) + '" fill="#FFFFFF" fill-opacity="0.01"/>'; }
        var W = Math.ceil(vb[2]), H = Math.ceil(vb[3]), jt = [], k2, pts = PORTS[type] ? PORTS[type](q) : [];
        if (type === 'joint' || type === 'ductjoint') pts = [{ p: [0, 0, 0] }];
        var isRun = type === 'pipe' || type === 'elbow' || type === 'tee' || type === 'joint';
        if (isRun) for (k2 = 0; k2 < pts.length; k2++) { var pp = proj(pts[k2].p); jt.push('[' + r1(pp[0] - vb[0]) + ', ' + r1(pp[1] - vb[1]) + ']'); }
        var slope = '';
        if (isRun && pts.length === 2) {
          var a0 = proj(pts[0].p), a1 = proj(pts[1].p);
          if (Math.abs(a1[0] - a0[0]) > 0.5) slope = ' jci-slope="' + (Math.round((a1[1] - a0[1]) / (a1[0] - a0[0]) * 10000) / 10000) + '"';
        }
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:jci="http://jci.com" version="1.1" width="' + W + 'px" height="' + H + 'px" viewBox="0 0 ' + W + ' ' + H + '"' +
          ' enable-background="new 0 0 ' + W + ' ' + H + '" xml:space="preserve"' +
          (isRun ? ' type="pipe"' : '') + (jt.length ? ' jci-joints="[' + jt.join(', ') + ']" jci-width="' + W + '" jci-height="' + H + '"' + slope : '') +
          ' jci-id="' + name + '"' +
          (isRun ? ' pipecolorfornonetype="#FFFFFF" bas-symbols="pipJCId" svgfillopacity="1" selectedsystemtype="null" selectedshape="null"' : '') + '>' +
          '<g class="' + name + '"><g transform="translate(' + r1(-vb[0]) + ' ' + r1(-vb[1]) + ')">' + body(s) + '</g></g></svg>';
        return { svg: svg, w: W, h: H, joints: jt.join(' '), fit: [s.x0 >= vb[0] - 0.5, s.y0 >= vb[1] - 0.5, s.x1 <= vb[0] + vb[2] + 0.5, s.y1 <= vb[1] + vb[3] + 0.5] };
      } finally { setView(0); }
    },
    ports: function (type, p) { return portsOf(type, params(type, p)); },
    center: function (type, p) {
      var q = params(type, p), c = CEN[type];
      c = typeof c === 'function' ? c(q) : (c || [0, 0, 0]);
      return rz(c, quarter(type, q));
    }
  };
})();

// Node: expose the same ISO object to build tooling. No effect in the browser.
if (typeof module !== 'undefined' && module.exports) module.exports = ISO;
