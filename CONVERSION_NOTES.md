# Conversion Notes — Earth Orbit Plot

## Behaviour model (one paragraph)

Earth Orbit Plot draws a single curve of **orbital period P versus orbital radius
R** for circular orbits of Earth, using Kepler's third law
`P = 2π·√(R³/GM)` with `GM = 398378100000000`. The x-axis (orbital radius, km) is
**logarithmic** and the y-axis (orbital period, days) is **linear** — the original
exposes "x is log"/"y is log" checkboxes but hides them (`visible = false` in
`frame1()`), so the shipped applet is fixed in this mode and we reproduce exactly
that. Five **special points** are marked with red dots (Newton's Cannon 6378000 m,
ISS 6730000 m, GPS 26600000 m, Geostationary 42164000 m, Moon 384000000 m). As the
mouse moves, the app finds the nearest point on the curve; if the mouse is within
100 px of the curve it shows a small **readout** callout (R, P, V) at that point,
and if that curve point is within ~14 px of a special point it instead fades in
that point's labelled **callout** (title + R + P + V, plus a photo for ISS and the
Moon). All fades use a cubic-spline easer over 200 ms. There is no other state.

## Source → target mapping

| ActionScript (AS3) | HTML5 port |
|---|---|
| `EarthOrbitPlot` sprite, `_plotWidth=600`, `_plotHeight=400` | stage coords; plot origin at stage (110, 450) |
| `GM`, `minR`, `maxR`, `_yMargin` | `GM`, `MIN_R`, `MAX_R`, `Y_MARGIN` in `simulation.js` (verbatim) |
| `set xIsLog` / `set yIsLog` scale math | `X_SCALE`, `Y_SCALE`, `MIN_P` computed identically |
| `update()` curve draw (moveTo/lineTo, 1 px steps) | `drawStatic()` samples `lx = 0..600` on canvas |
| red `drawCircle(...,3)` special dots | canvas `arc(...,4)` + dark ring (shape cue) |
| `addXTickmark` / `addYTickmark` (label text) | canvas tick lines + HTML/MathJax tick labels |
| `onMouseMove` nearest-curve + nearest-special logic, thresholds `10000` / `200` | `computeHover()` — 1:1 port |
| `CubicEaser` natural cubic spline tween | `class CubicEaser` — 1:1 port |
| `getTimer()` (ms), `Timer(30)` fade loop | `performance.now()` + single `requestAnimationFrame` |
| `Readout`, `NewtonsCannon`, `ISS`, `GPS`, `Geosynch`, `Moon` symbols + `radiusField/periodField/velocityField` | HTML callout `<div>`s; values via `fmtRadius/Period/Velocity` |
| `toPrecision(3)` + `parseFloat` + `/1000` string formatting | reproduced verbatim in `fmt*()` (ECMAScript semantics identical) |
| `titlebar` (`NAAPTitleBar`, title "Earth Orbit Plot") | `<kl-unl-masthead sim-id="earthorbitplot">` |

## Number formatting (verified against the source math)

| Feature | R | P | V |
|---|---|---|---|
| Newton's Cannon | 6380 km | 84.5 minutes | 7.9 km/s |
| International Space Station | 6730 km | 91.6 minutes | 7.69 km/s |
| GPS Satellites | 26600 km | 12 hours | 3.87 km/s |
| Geostationary Satellites | 42200 km | 23.9 hours | 3.07 km/s |
| The Moon | 384000 km | 27.4 days | 1.02 km/s |

(These are computed at runtime, exactly as in the original; the placeholder text
baked into the Flash symbols — e.g. "384000 km / 95 minutes / 11.2 km/s" — was
FLA authoring filler and is correctly *replaced* by the computed values.)

## Assets reused as-is (not redrawn)

* `assets/img/iss.jpg` — from `images/33.jpg` (ISS photo, used in the ISS callout).
* `assets/img/moon.jpg` — from `images/24.jpg` (Moon photo, used in the Moon callout).

## contents.json entry

No edit was required: `foundation/contents.json` already contains an
`"earthorbitplot"` entry (title "Earth Orbit Plot", version 2.0, with Help and
About text). The file was copied in unchanged and the sim uses
`sim-id="earthorbitplot"`.

## Deviations (and why)

* **Axis toggles not exposed.** The log/linear checkboxes are `visible = false` in
  the source, so the delivered applet is fixed at x-log / y-linear. We reproduce
  that exact behaviour and do not surface non-functional controls.
* **Curve colour remapped** from `0x3299FF` to KL-UNL french blue `#005a9c` for
  ≥3:1 contrast on white (accessibility outranks visual fidelity — Goal B > C).
  See ACCESSIBILITY.md.
* **Special-marker red** remapped from `0xFF0000` to KL-UNL `#ea351f` and given a
  dark ring so the marker is distinguishable by shape, not colour alone.
* **Keyboard/AT path added** (a slider that rides the curve + "Jump to a feature"
  buttons) so the hover-only original is fully operable without a mouse. This adds
  controls the original lacked but changes no physics.
* **Newton's Cannon globe/cannon artwork omitted** from its callout. That art is
  code-/vector-drawn inside the FLA and was not cleanly exportable as a single
  reusable asset; the callout still shows the title and the correct R/P/V. (Goal C
  is a soft priority; the omission is cosmetic.)
* **Callout tail geometry approximated.** The original callouts have per-symbol
  tail directions and pixel offsets. We point each callout at its dot with a
  uniform tail and edge-clamping so nothing runs off-stage; this is a visual
  approximation within the KL-UNL shell, not a behavioural change.
* **MathJax vendored locally** (`assets/tex-svg.js`). The foundation's `kl-unl.js`
  expects `window.MathJax` but no MathJax file ships in `foundation/` and runtime
  CDNs are disallowed, so MathJax 3.2.2 (SVG output — self-contained, no external
  font files) is bundled under `assets/` and loaded from `index.html`.
