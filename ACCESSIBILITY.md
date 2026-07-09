# Accessibility Notes — Earth Orbit Plot

Target: WCAG 2.1 AA (AAA where reasonable). Human screen-reader QA on real NVDA
(Windows) and VoiceOver (macOS/iOS) is still required before sign-off.

## Structure & landmarks
* Masthead renders the page `<h1>` (the sim title); panels use `<h2>` — no skipped
  levels. `<main>` wraps the layout; each panel is a `<section>` with an
  `aria-labelledby` heading. `<html lang="en">`.

## The canvas is not the accessibility layer
* The `<canvas>` (axes, curve, red markers) is `aria-hidden="true"` — purely visual.
* All text and math live in an HTML overlay that scales with the plot, so it zooms
  and is exposed to assistive tech.

## Keyboard operability (original was hover-only)
The Flash sim responded only to mouse movement. Two keyboard paths were added, both
mutating the same state as the pointer path:

* **Cursor slider** (`<input type="range">`, "Cursor position along the curve"):
  Left/Down decrement, Right/Up increment, PageUp/PageDown large step, Home/End
  min/max — all free from a native range input. The cursor rides the curve at the
  chosen orbital radius; the readout updates live.
* **"Jump to a feature" buttons** (Newton's Cannon, ISS, GPS, Geostationary, Moon):
  land exactly on a special point and reveal its callout.

Visible focus rings come from the foundation `:focus-visible` rule; Tab order is
logical; no keyboard traps (the masthead dialog manages its own focus).

## Units are always spoken (supervisor requirement)
Every value is announced with its quantity name **and** full unit word, never a
bare number:
* Slider `aria-valuetext`, e.g. *"Global Positioning System (GPS) Satellites.
  orbital radius 26600 kilometers, orbital period 12 hours, orbital velocity 3.87
  kilometers per second."*
* Live region (`aria-live="polite"`) announces feature enter/exit with the same
  units-complete wording. Announcements fire on change (feature transitions), not
  on every tick, to avoid flooding.
* A visible companion readout under the slider mirrors the spoken value for sighted
  keyboard users.

## Equations & math
* Both equations (`P² = 4π²/(G M_E)·R³` and `V = √(G M_E / R)`) are rendered with
  MathJax via the foundation helper `klunlShowEquation`, paired with a spoken
  screen-reader description (`#sr-eqn-kepler`, `#sr-eqn-velocity`).
* Axis tick numbers are MathJax-typeset (`\( … \)`). Right-clicking any equation or
  tick opens the MathJax menu ("Show Math As → TeX / MathML"); the MathJax context
  menu is **not** disabled or overridden. MathJax uses SVG output so no math is
  painted on the canvas.
* Math is intentionally kept **out of the Tab order** (MathJax
  `menuOptions.settings.inTabOrder: false`), so Tab does not stop on every equation
  and tick label; the right-click context menu is unaffected. Spoken content still
  reaches AT via the paired `.sr-only` equation descriptions and assistive MathML.
* The callout R/P/V readouts (e.g. "26600 km") are plain HTML text — they are
  numeric readouts with unit abbreviations, not mathematical notation, and are
  decorative duplicates (the callouts are `aria-hidden`); the authoritative,
  units-complete value reaches AT through the slider `aria-valuetext` and the live
  region.

## Colour & contrast (no colour-only signalling)
* Curve remapped `0x3299FF → #005a9c` (KL-UNL french blue) for ≥3:1 on white.
* Special markers remapped `0xFF0000 → #ea351f` (KL-UNL alert red) **and** given a
  dark ring so they are distinguishable by shape, not colour alone; each is also
  labelled by name + numeric values in its callout and via the buttons.
* Body/foreground text uses the foundation palette (≥4.5:1).

## Text size / zoom / reflow
* Body copy ≥1.125rem, sized in rem/em; headings scale up. Layout uses relative
  units and reflows without clipping at 200% zoom.
* Canvas keeps the original internal coordinate system and is CSS-scaled with a
  preserved aspect ratio; the text overlay scales with it (and remains real,
  zoomable text — not baked into the canvas).

## Motion
* The only motion is the ≤200 ms callout fade (well under the 5 s / 3-per-second
  limits). `prefers-reduced-motion: reduce` resolves fades instantly to their end
  state; a live change of the preference is honoured.
* No Pause control is needed (no long-running animation). Reset is provided by the
  masthead `sim-reset` event and clears the readout to the initial state.

## Touch
* Pointer Events unify mouse and touch; the stage uses drag-free hover tracking.
  Interactive targets (slider, buttons) meet the ≥44 px minimum from the foundation
  styles. No hover-only affordances — all information is reachable via the slider
  and buttons.

## Known items for human QA
* Verify VoiceOver + NVDA read the slider name, value and units clearly and do not
  double-read the callouts (they are `aria-hidden`).
* Confirm the MathJax context menu opens on the equations and tick labels in
  Chrome, Edge, Firefox and Safari.
