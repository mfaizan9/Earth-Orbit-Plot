/* ============================================================================
   Earth Orbit Plot -- HTML5 port of earthOrbitPlot002.swf (AS3).
   Behaviour is a faithful port of EarthOrbitPlot.as + CubicEaser.as; presentation
   follows the KL-UNL foundation + WCAG 2.1 AA.

   Physics (verbatim from the ActionScript):
     P = 2*pi*sqrt(R^3 / GM)          orbital period (Kepler's third law)
     V = sqrt(GM / R)                 circular orbital velocity
   Constants copied exactly from EarthOrbitPlot.as:
     GM   = 398378100000000
     minR = 6378000   maxR = 450000000
   The original exposes x-is-log / y-is-log checkboxes but frame1() sets them
   .visible = false, so the shipped sim is fixed at x = log, y = linear. We keep
   that exact behaviour (no toggle exposed).
   ============================================================================ */

'use strict';

/* -------------------------------------------------------------------------- */
/* CubicEaser -- 1:1 port of CubicEaser.as (natural cubic-spline tween used    */
/* for every fade-in / fade-out, so easing timing matches the original).       */
/* -------------------------------------------------------------------------- */
class CubicEaser {
  constructor(v) {
    this.targetValue = 0;
    this.slope0 = 0;
    this.slope1 = 0;
    this.parametersList = null;
    this.splinePointsList = null;
    this.targetTime = 0;
    this.init(v);
  }

  init(v) { this.setTarget(0, v, 1, v); }

  setTarget(t0, y0, t1, y1) {
    if (!(typeof y0 === 'number')) {
      y0 = this.getValue(t0);
      this.slope0 = this.getDerivative(t0);
    } else {
      this.slope0 = 0;
    }
    this.splinePointsList = [{ x: t0, y: y0 }, { x: t1, y: y1 }];
    this.doComputations();
    this.targetTime = t1;
    this.targetValue = y1;
    return {
      a: this.parametersList[0].a,
      b: this.parametersList[0].b,
      c: this.parametersList[0].c,
      d: this.parametersList[0].d
    };
  }

  doComputations() {
    this.splinePointsList.sort((p, q) => p.x - q.x);
    const p = this.splinePointsList;
    const n = p.length;
    const last = n - 1;
    const secondLast = n - 2;
    const s0 = this.slope0;
    const s1 = this.slope1;
    const u = [];
    const y2 = []; // second-derivative helper array (unused name kept generic)

    p[0].d2 = -0.5;
    u[0] = 3 / (p[1].x - p[0].x) * ((p[1].y - p[0].y) / (p[1].x - p[0].x) - s0);

    for (let i = 1; i < last; i++) {
      const sig = (p[i].x - p[i - 1].x) / (p[i + 1].x - p[i - 1].x);
      const pp = sig * p[i - 1].d2 + 2;
      p[i].d2 = (sig - 1) / pp;
      u[i] = (p[i + 1].y - p[i].y) / (p[i + 1].x - p[i].x) - (p[i].y - p[i - 1].y) / (p[i].x - p[i - 1].x);
      u[i] = (6 * u[i] / (p[i + 1].x - p[i - 1].x) - sig * u[i - 1]) / pp;
    }

    const qn = 0.5;
    const un = 3 / (p[last].x - p[secondLast].x) * (s1 - (p[last].y - p[secondLast].y) / (p[last].x - p[secondLast].x));
    p[last].d2 = (un - qn * u[secondLast]) / (qn * p[secondLast].d2 + 1);

    for (let k = secondLast; k >= 0; k--) {
      p[k].d2 = p[k].d2 * p[k + 1].d2 + u[k];
    }

    const params = [];
    for (let i = 0; i < last; i++) {
      const lo = p[i];
      const hi = p[i + 1];
      const y2lo = lo.d2, y2hi = hi.d2;
      const xlo = lo.x, xhi = hi.x;
      const ylo = lo.y, yhi = hi.y;
      const h = xhi - xlo;
      const a = (y2hi - y2lo) / (6 * h);
      const b = (3 * xhi * y2lo - 3 * y2hi * xlo) / (6 * h);
      const c = (-6 * ylo + 2 * xhi * y2hi * xlo - xhi * xhi * y2hi - 2 * xhi * y2lo * xlo + y2lo * xlo * xlo - 2 * xhi * xhi * y2lo + 6 * yhi + 2 * y2hi * xlo * xlo) / (6 * h);
      const d = (-2 * y2hi * xhi * xlo * xlo + 2 * y2lo * xhi * xhi * xlo + y2hi * xhi * xhi * xlo - 6 * yhi * xlo + 6 * ylo * xhi - y2lo * xhi * xlo * xlo) / (6 * h);
      params.push({ xUpper: xhi, a, b, c, d });
    }
    this.parametersList = params;
  }

  getValue(t) {
    const a = this.parametersList;
    const n = a.length;
    let i = 0;
    while (i < n) { if (t < a[i].xUpper) break; i++; }
    if (i < n) return a[i].d + t * (a[i].c + t * (a[i].b + t * a[i].a));
    return this.targetValue;
  }

  getDerivative(t) {
    const a = this.parametersList;
    const n = a.length;
    let i = 0;
    while (i < n) { if (t < a[i].xUpper) break; i++; }
    if (i < n) return a[i].c + t * (2 * a[i].b + 3 * t * a[i].a);
    return 0;
  }
}

/* -------------------------------------------------------------------------- */
/* Physics constants + plot geometry                                          */
/* -------------------------------------------------------------------------- */
const GM = 398378100000000;      // Earth's GM, m^3/s^2 (verbatim)
const MIN_R = 6378000;           // Earth radius, m
const MAX_R = 450000000;         // plot's max orbital radius, m
const PLOT_W = 600;              // original _plotWidth
const PLOT_H = 400;              // original _plotHeight
const Y_MARGIN = 0.05;           // original _yMargin

// Fixed axis modes (checkboxes hidden in the original -> x log, y linear).
const X_IS_LOG = true;
const Y_IS_LOG = false;

// Stage layout (px). Plot origin = local (0,0) = bottom-left of the plot area.
const ML = 110, MT = 50, MR = 70, MB = 80;
const STAGE_W = ML + PLOT_W + MR;   // 780
const STAGE_H = MT + PLOT_H + MB;   // 530
const OX = ML;                      // plot origin x in stage coords
const OY = MT + PLOT_H;             // plot origin y in stage coords (= 450)

// x scale (log): xScale = plotWidth / (log(maxR) - log(minR))
const LOG_MIN_R = Math.log(MIN_R);
const X_SCALE = PLOT_W / (Math.log(MAX_R) - LOG_MIN_R);

// y scale (linear), exactly as in set yIsLog(false):
const _maxP = period(MAX_R);
const _minP0 = period(MIN_R);
const _yRange = (_maxP - _minP0) / (1 - 2 * Y_MARGIN);
let MIN_P = _minP0 - _yRange * Y_MARGIN;
if (MIN_P < 0) MIN_P = 0;
const _yTopVal = _maxP + _yRange * Y_MARGIN;
const Y_SCALE = -PLOT_H / (_yTopVal - MIN_P);

function period(R) { return 2 * Math.PI * Math.sqrt(R * R * R / GM); }   // seconds
function velocity(R) { return Math.sqrt(GM / R); }                      // m/s
function localX(R) { return X_IS_LOG ? X_SCALE * (Math.log(R) - LOG_MIN_R) : X_SCALE * (R - MIN_R); }
function localY(P) { return Y_IS_LOG ? Y_SCALE * (Math.log(P) - Math.log(MIN_P)) : Y_SCALE * (P - MIN_P); }
function rFromLocalX(lx) { return X_IS_LOG ? Math.exp(LOG_MIN_R + lx / X_SCALE) : MIN_R + lx / X_SCALE; }

/* -------------------------------------------------------------------------- */
/* Number formatting -- reproduces the AS toPrecision(3)/parseFloat strings.   */
/* -------------------------------------------------------------------------- */
function fmtRadius(R) {
  // (parseFloat(R.toPrecision(3)) / 1000).toString() + " km"
  return (parseFloat(R.toPrecision(3)) / 1000).toString() + ' km';
}
function fmtPeriod(P) {
  if (P <= 10800) return parseFloat((P / 60).toPrecision(3)).toString() + ' minutes';
  if (P <= 86400) return parseFloat((P / 3600).toPrecision(3)).toString() + ' hours';
  return parseFloat((P / 86400).toPrecision(3)).toString() + ' days';
}
function fmtVelocity(R) {
  const v = velocity(R);
  return (parseFloat(v.toPrecision(3)) / 1000).toString() + ' km/s';
}

// Spoken (screen-reader) forms: quantity + number + FULL unit word, never bare.
function spokenRadius(R) {
  const km = (parseFloat(R.toPrecision(3)) / 1000).toString();
  return `orbital radius ${km} kilometers`;
}
function spokenPeriod(P) {
  // fmtPeriod already includes a full unit word ("minutes"/"hours"/"days").
  return `orbital period ${fmtPeriod(P)}`;
}
function spokenVelocity(R) {
  const v = velocity(R);
  const kms = (parseFloat(v.toPrecision(3)) / 1000).toString();
  return `orbital velocity ${kms} kilometers per second`;
}

/* -------------------------------------------------------------------------- */
/* Special points (red markers + hover callouts) -- same 5, same radii/order.  */
/* -------------------------------------------------------------------------- */
const SPECIALS = [
  { key: 'newton',   name: "Newton's Cannon",                          R: 6378000 },
  { key: 'iss',      name: 'International Space Station',              R: 6730000,   photo: 'assets/img/iss.jpg',  photoAlt: 'Photograph of the International Space Station orbiting above Earth.' },
  { key: 'gps',      name: 'Global Positioning System (GPS) Satellites', R: 26600000 },
  { key: 'geosynch', name: 'Geostationary Satellites',                R: 42164000 },
  { key: 'moon',     name: 'The Moon',                                R: 384000000, photo: 'assets/img/moon.jpg', photoAlt: 'Photograph of the full Moon.', photoLeft: true }
];

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */
const state = {
  specials: [],          // { ...def, lx, ly, sx, sy, easer, el, box }
  readoutEaser: new CubicEaser(0),
  readout: { lx: 0, ly: 0, R: MIN_R, P: period(MIN_R), visible: false },
  activeFeature: null,   // for live-region change detection: special key | 'curve' | null
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

/* -------------------------------------------------------------------------- */
/* DOM refs                                                                     */
/* -------------------------------------------------------------------------- */
const canvas = document.getElementById('eop-canvas');
const ctx = canvas.getContext('2d');
const viewport = document.getElementById('eop-viewport');
const stageEl = document.getElementById('eop-stage');
const readoutEl = document.getElementById('eop-readout');
const cursorDot = document.getElementById('eop-cursor-dot');
const specialsHost = document.getElementById('eop-specials');
const slider = document.getElementById('cursor-slider');
const sliderReadout = document.getElementById('cursor-readout');
const liveRegion = document.getElementById('cursor-live');

/* -------------------------------------------------------------------------- */
/* Canvas drawing (static: axes, ticks, curve, red dots)                       */
/* -------------------------------------------------------------------------- */
function setupCanvasBacking() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(STAGE_W * dpr);
  canvas.height = Math.round(STAGE_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawArrowhead(x, y, dir) {
  const s = 7;
  ctx.beginPath();
  if (dir === 'up') { ctx.moveTo(x, y); ctx.lineTo(x - s, y + s * 1.4); ctx.lineTo(x + s, y + s * 1.4); }
  else { ctx.moveTo(x, y); ctx.lineTo(x - s * 1.4, y - s); ctx.lineTo(x - s * 1.4, y + s); } // right
  ctx.closePath();
  ctx.fill();
}

function drawStatic() {
  ctx.clearRect(0, 0, STAGE_W, STAGE_H);

  // --- Axes with arrowheads ---
  ctx.strokeStyle = '#1a1a1a';
  ctx.fillStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  // Y axis (up)
  ctx.beginPath();
  ctx.moveTo(OX, OY);
  ctx.lineTo(OX, MT - 12);
  ctx.stroke();
  drawArrowhead(OX, MT - 20, 'up');
  // X axis (right)
  ctx.beginPath();
  ctx.moveTo(OX, OY);
  ctx.lineTo(OX + PLOT_W + 40, OY);
  ctx.stroke();
  drawArrowhead(OX + PLOT_W + 48, OY, 'right');

  // --- Tick marks (short lines; numeric labels are HTML/MathJax overlays) ---
  ctx.lineWidth = 1.5;
  for (const t of X_TICKS) {
    const sx = OX + localX(t.R);
    ctx.beginPath();
    ctx.moveTo(sx, OY - 5);
    ctx.lineTo(sx, OY + 5);
    ctx.stroke();
  }
  for (const t of Y_TICKS) {
    const sy = OY + localY(t.days * 86400);
    ctx.beginPath();
    ctx.moveTo(OX - 5, sy);
    ctx.lineTo(OX + 5, sy);
    ctx.stroke();
  }

  // --- The P(R) curve (blue), sampled every 1px in local x, like update() ---
  ctx.strokeStyle = CURVE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let lx = 0; lx <= PLOT_W; lx++) {
    const R = rFromLocalX(lx);
    const P = period(R);
    const ly = localY(P);
    const sx = OX + lx, sy = OY + ly;
    if (lx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // --- Red special-point markers (drawCircle r=3), with a dark ring so the
  //     marker is distinguishable by shape, not colour alone. ---
  for (const s of state.specials) {
    const sx = OX + s.lx, sy = OY + s.ly;
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fillStyle = DOT_COLOR;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#1a1a1a';
    ctx.stroke();
  }
}

// Curve colour: original 0x3299FF is a light blue with < 3:1 contrast on white.
// Remapped to the KL-UNL french blue (>= 3:1 for graphical objects). See ACCESSIBILITY.md.
const CURVE_COLOR = '#005a9c';
// Marker: original 0xFF0000; use the KL-UNL alert red (still supplemented by labels + dark ring).
const DOT_COLOR = '#ea351f';

const X_TICKS = [6378000, 10000000, 20000000, 40000000, 100000000, 200000000, 400000000]
  .map(R => ({ R, label: (R / 1000).toString() }));
const Y_TICKS = [7, 14, 21, 28, 35].map(d => ({ days: d, label: d.toString() }));

/* -------------------------------------------------------------------------- */
/* Overlay: tick labels (MathJax), special callouts                            */
/* -------------------------------------------------------------------------- */
function buildTickLabels() {
  const xHost = document.getElementById('eop-xlabels');
  const yHost = document.getElementById('eop-ylabels');
  for (const t of X_TICKS) {
    const el = document.createElement('div');
    el.className = 'eop-tick eop-tick--x';
    el.style.left = (OX + localX(t.R)) + 'px';
    el.style.top = (OY + 12) + 'px';
    el.innerHTML = `\\(${t.label}\\)`;
    xHost.appendChild(el);
  }
  for (const t of Y_TICKS) {
    const el = document.createElement('div');
    el.className = 'eop-tick eop-tick--y';
    el.style.left = '0px';
    el.style.width = (OX - 12) + 'px';
    el.style.top = (OY + localY(t.days * 86400)) + 'px';
    el.innerHTML = `\\(${t.label}\\)`;
    yHost.appendChild(el);
  }
}

function buildSpecials() {
  for (const def of SPECIALS) {
    const P = period(def.R);
    const lx = X_IS_LOG ? Math.trunc(X_SCALE * (Math.log(def.R) - LOG_MIN_R)) : Math.trunc(X_SCALE * (def.R - MIN_R));
    const ly = localY(P);

    const rStr = fmtRadius(def.R);
    const pStr = fmtPeriod(P);
    const vStr = fmtVelocity(def.R);

    const el = document.createElement('div');
    el.className = 'eop-callout';
    el.style.opacity = '0';

    const rows = `
      <div class="eop-callout__title">${def.name}</div>
      <div class="eop-callout__row"><span>R:</span><span>${rStr}</span></div>
      <div class="eop-callout__row"><span>P:</span><span>${pStr}</span></div>
      <div class="eop-callout__row"><span>V:</span><span>${vStr}</span></div>`;

    if (def.photo) {
      el.classList.add('eop-callout--photo');
      if (def.photoLeft) el.classList.add('eop-callout--photoleft');
      const img = `<img class="eop-callout__photo" src="${def.photo}" alt="${def.photoAlt}">`;
      const body = `<div class="eop-callout__body">${rows}</div>`;
      el.innerHTML = def.photoLeft ? (body + img) : (img + body);
    } else {
      el.innerHTML = rows;
    }
    const tail = document.createElement('span');
    tail.className = 'eop-callout__tail';
    el.appendChild(tail);

    specialsHost.appendChild(el);
    state.specials.push({ ...def, lx, ly, sx: OX + lx, sy: OY + ly, P, easer: new CubicEaser(0), el });
  }
}

/* Position a callout element so its tail points at the stage point (sx, sy).
   Chooses above/below based on where there's room; clamps horizontally. */
function positionCallout(el, sx, sy) {
  const w = el.offsetWidth || 140;
  const h = el.offsetHeight || 90;
  const gap = 14;
  const above = sy > 200;                     // room above? (most points sit low)
  let left = sx - w / 2;
  left = Math.max(2, Math.min(left, STAGE_W - w - 2));
  const top = above ? (sy - h - gap) : (sy + gap);

  el.classList.toggle('eop-callout--above', above);
  el.classList.toggle('eop-callout--below', !above);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  el.style.setProperty('--tail-x', (sx - left) + 'px');
}

/* -------------------------------------------------------------------------- */
/* Hover logic -- 1:1 port of onMouseMove(). Inputs are LOCAL plot coords.      */
/* -------------------------------------------------------------------------- */
function computeHover(mx, my) {
  // Nearest point on the curve to (mx, my).
  let best = Number.POSITIVE_INFINITY, cx = 0, cy = 0, cR = 0, cP = 0;
  for (let lx = 0; lx <= PLOT_W; lx++) {
    const R = rFromLocalX(lx);
    const P = period(R);
    const ly = localY(P);
    const dx = mx - lx, dy = my - ly;
    const d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; cx = lx; cy = ly; cR = R; cP = P; }
  }

  // Nearest special point to that curve point.
  let best2 = Number.POSITIVE_INFINITY, sp = null;
  for (const s of state.specials) {
    const dx = cx - s.lx, dy = cy - s.ly;
    const d2 = dx * dx + dy * dy;
    if (d2 < best2) { best2 = d2; sp = s; }
  }

  const now = performance.now();
  const tgt = now + 200;
  let feature = null;

  if (best < 10000) {                 // within 100px of the curve
    if (best2 < 200) {                // and within ~14px of a special point
      bringSpecialToFront(sp);
      for (const s of state.specials) {
        if (s !== sp && s.easer.targetValue !== 0) setEaser(s.easer, now, tgt, 0);
        else if (s === sp && s.easer.targetValue !== 1) setEaser(s.easer, now, tgt, 1);
      }
      if (state.readoutEaser.targetValue !== 0) setEaser(state.readoutEaser, now, tgt, 0);
      feature = sp.key;
    } else {                          // generic readout on the curve
      for (const s of state.specials) if (s.easer.targetValue !== 0) setEaser(s.easer, now, tgt, 0);
      if (state.readoutEaser.targetValue !== 1) setEaser(state.readoutEaser, now, tgt, 1);
      state.readout.lx = cx; state.readout.ly = cy; state.readout.R = cR; state.readout.P = cP;
      setReadoutText(cR, cP);
      feature = 'curve';
    }
  } else {                            // far from the curve -> hide everything
    for (const s of state.specials) if (s.easer.targetValue !== 0) setEaser(s.easer, now, tgt, 0);
    if (state.readoutEaser.targetValue !== 0) setEaser(state.readoutEaser, now, tgt, 0);
    feature = null;
  }

  return { feature, cx, cy, cR, cP, sp: best2 < 200 ? sp : null };
}

// prefers-reduced-motion: jump straight to the target instead of tweening.
function setEaser(easer, now, tgt, value) {
  if (state.reducedMotion) easer.setTarget(now, value, now + 0.0001, value);
  else easer.setTarget(now, null, tgt, value);
}

function bringSpecialToFront(sp) {
  if (specialsHost.lastElementChild !== sp.el) specialsHost.appendChild(sp.el);
}

function setReadoutText(R, P) {
  document.getElementById('ro-R').textContent = fmtRadius(R);
  document.getElementById('ro-P').textContent = fmtPeriod(P);
  document.getElementById('ro-V').textContent = fmtVelocity(R);
}

/* -------------------------------------------------------------------------- */
/* Pointer input (mouse + touch share one path via Pointer Events)             */
/* -------------------------------------------------------------------------- */
function stagePointFromEvent(ev) {
  const rect = stageEl.getBoundingClientRect();
  const scaleX = STAGE_W / rect.width;
  const scaleY = STAGE_H / rect.height;
  const sx = (ev.clientX - rect.left) * scaleX;
  const sy = (ev.clientY - rect.top) * scaleY;
  return { lx: sx - OX, ly: sy - OY };
}

function onPointerMove(ev) {
  const p = stagePointFromEvent(ev);
  const r = computeHover(p.lx, p.ly);
  syncSliderToCurve(r);
  maybeAnnounce(r);
  requestTick();
}

/* -------------------------------------------------------------------------- */
/* Keyboard / slider path -- cursor rides the curve at the chosen x.           */
/* The slider value is the local x (0..600); the y is taken ON the curve, so    */
/* computeHover() behaves exactly like a mouse hover sitting on the curve.      */
/* -------------------------------------------------------------------------- */
function onSliderInput() {
  const lx = Number(slider.value);
  const R = rFromLocalX(lx);
  const ly = localY(period(R));
  const r = computeHover(lx, ly);
  updateSliderAria(r, lx);
  maybeAnnounce(r);
  requestTick();
}

function updateSliderAria(r, lx) {
  const R = rFromLocalX(lx);
  const P = period(R);
  let text;
  if (r.sp) {
    text = `${r.sp.name}. ${spokenRadius(r.sp.R)}, ${spokenPeriod(r.sp.P)}, ${spokenVelocity(r.sp.R)}`;
  } else {
    text = `${spokenRadius(R)}, ${spokenPeriod(P)}, ${spokenVelocity(R)}`;
  }
  slider.setAttribute('aria-valuetext', text);
  slider.setAttribute('aria-valuemin', '0');
  slider.setAttribute('aria-valuemax', '600');
  // Visible companion readout for sighted keyboard users.
  const rr = r.sp ? r.sp.R : R;
  const pp = r.sp ? r.sp.P : P;
  sliderReadout.textContent = `${r.sp ? r.sp.name + ' — ' : ''}R = ${fmtRadius(rr)}, P = ${fmtPeriod(pp)}, V = ${fmtVelocity(rr)}`;
}

// Keep the slider position in sync when the mouse drives the readout.
function syncSliderToCurve(r) {
  if (r.feature === 'curve' || r.feature) {
    const lx = r.sp ? r.sp.lx : Math.round(r.cx);
    slider.value = String(lx);
    updateSliderAria(r, lx);
  }
}

// Announce meaningful changes (feature enter/exit) on the live region, with units.
function maybeAnnounce(r) {
  const key = r.sp ? r.sp.key : r.feature; // special key | 'curve' | null
  if (key === state.activeFeature) return;
  state.activeFeature = key;
  if (!key) { liveRegion.textContent = ''; return; }
  if (r.sp) {
    liveRegion.textContent = `${r.sp.name}. ${spokenRadius(r.sp.R)}, ${spokenPeriod(r.sp.P)}, ${spokenVelocity(r.sp.R)}.`;
  } else {
    liveRegion.textContent = `On the curve. ${spokenRadius(r.cR)}, ${spokenPeriod(r.cP)}, ${spokenVelocity(r.cR)}.`;
  }
}

/* Jump-to-feature buttons: land exactly on a special point. */
function buildJumpButtons() {
  const host = document.getElementById('eop-jump-buttons');
  for (const s of state.specials) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'eop-jump-btn';
    btn.textContent = s.name;
    btn.addEventListener('click', () => {
      slider.value = String(s.lx);
      slider.focus();
      onSliderInput();
    });
    host.appendChild(btn);
  }
}

/* -------------------------------------------------------------------------- */
/* Animation loop -- ON-DEMAND rAF. It runs only while a fade is still in       */
/* progress, then stops, so the page goes idle when nothing is moving.          */
/* -------------------------------------------------------------------------- */
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

let _running = false;

// Apply current opacities + overlay positions for time `now`. Returns true if
// any easer has not yet reached its target time (i.e. still animating).
function render(now) {
  let active = false;

  const ra = clamp01(state.readoutEaser.getValue(now));
  readoutEl.style.opacity = ra.toString();
  if (ra > 0.01) {
    positionCallout(readoutEl, OX + state.readout.lx, OY + state.readout.ly);
    cursorDot.hidden = false;
    cursorDot.style.left = (OX + state.readout.lx) + 'px';
    cursorDot.style.top = (OY + state.readout.ly) + 'px';
  }
  if (now < state.readoutEaser.targetTime) active = true;

  let anySpecial = false;
  for (const s of state.specials) {
    const a = clamp01(s.easer.getValue(now));
    s.el.style.opacity = a.toString();
    if (a > 0.01) {
      anySpecial = true;
      positionCallout(s.el, s.sx, s.sy);
      cursorDot.hidden = false;
      cursorDot.style.left = s.sx + 'px';
      cursorDot.style.top = s.sy + 'px';
    }
    if (now < s.easer.targetTime) active = true;
  }

  if (ra <= 0.01 && !anySpecial) cursorDot.hidden = true;
  return active;
}

function tick() {
  const active = render(performance.now());
  if (active) requestAnimationFrame(tick);
  else _running = false;
}

// Called after any input changes easer targets; starts the loop if idle.
function requestTick() {
  if (!_running) { _running = true; requestAnimationFrame(tick); }
}

/* -------------------------------------------------------------------------- */
/* Responsive scaling of the stage                                             */
/* -------------------------------------------------------------------------- */
function updateScale() {
  const w = viewport.clientWidth;
  const s = w / STAGE_W;
  stageEl.style.setProperty('--eop-scale', s.toString());
}

/* -------------------------------------------------------------------------- */
/* Reset (masthead "sim-reset" event) -> clear the readout back to initial.    */
/* -------------------------------------------------------------------------- */
function resetSim() {
  const now = performance.now();
  for (const s of state.specials) s.easer.setTarget(now, 0, now + 0.0001, 0);
  state.readoutEaser.setTarget(now, 0, now + 0.0001, 0);
  state.activeFeature = null;
  liveRegion.textContent = '';
  slider.value = '0';
  updateSliderAria({ sp: null, feature: null, cR: MIN_R, cP: period(MIN_R) }, 0);
  cursorDot.hidden = true;
  requestTick();
}

/* -------------------------------------------------------------------------- */
/* Equations via the foundation MathJax helper                                 */
/* -------------------------------------------------------------------------- */
window.klunlInitEqn = function () {
  klunlShowEquation(
    ['eqn-kepler', '\\[ P^{2} = \\dfrac{4\\pi^{2}}{G M_{E}}\\, R^{3} \\]'],
    ['sr-eqn-kepler', "Kepler's third law: P squared equals four pi squared divided by G times M sub E, all multiplied by R cubed."]
  );
  klunlShowEquation(
    ['eqn-velocity', '\\[ V = \\sqrt{\\dfrac{G M_{E}}{R}} \\]'],
    ['sr-eqn-velocity', 'Orbital velocity: V equals the square root of G times M sub E divided by R.']
  );
};

/* -------------------------------------------------------------------------- */
/* Init                                                                         */
/* -------------------------------------------------------------------------- */
function init() {
  setupCanvasBacking();
  buildSpecials();
  buildTickLabels();
  buildJumpButtons();
  drawStatic();
  updateScale();

  // Initial slider announcement (radius at x = 0, i.e. Newton's Cannon radius).
  updateSliderAria({ sp: null, feature: null, cR: MIN_R, cP: period(MIN_R) }, 0);

  // Pointer input (mouse + touch). Listen on the whole stage so hovering the
  // overlay/callouts still tracks, mirroring the original stage MOUSE_MOVE.
  stageEl.addEventListener('pointermove', onPointerMove);
  stageEl.addEventListener('pointerdown', (ev) => { onPointerMove(ev); });

  slider.addEventListener('input', onSliderInput);

  window.addEventListener('resize', updateScale);
  if (window.ResizeObserver) new ResizeObserver(updateScale).observe(viewport);

  document.addEventListener('sim-reset', resetSim);

  // React to a live change in the reduced-motion preference.
  window.matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener('change', (e) => { state.reducedMotion = e.matches; });

  // Typeset equations once MathJax is ready (also auto-typesets tick labels).
  if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
    window.MathJax.startup.promise.then(() => window.klunlInitEqn());
  } else {
    window.addEventListener('load', () => window.klunlInitEqn());
  }

  render(performance.now());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
