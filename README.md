# ΦMath Atelier

**A Living Equation Studio**, v0.1.0.

A self-contained, completely offline mathematical art engine using JavaScript, WebGL 1.0, GLSL fragment shaders, and an automatic Canvas2D fallback. No frameworks, third-party dependencies, textures, photos, online APIs, or build steps.

## Launch

Open `index.html` in Chrome, Edge, or Firefox. WebGL must be enabled. You can also serve the folder using `python -m http.server 8000` and visit `http://localhost:8000`.

## Controls

- **Four worlds**: Galaxy Cluster (synthetic spiral galaxies), Nested Foam (signed-distance bubbles and warped grids), Resonance Field (complex-wave interference), Golden Bloom (golden-angle phyllotaxis).
- **Five color palettes**, adjustable structure density, spiral frequency, deformation, luminosity, scale, time flow.
- **Interactive gravity lens**: Move the mouse over the image to deform nearby geometry.
- **New universe**: Resample the deterministic seed.
- **Pause, record an 8-second WebM animation**, save high-resolution PNG, export/import reproducible JSON recipes, share URL-encoded state.
- **Shortcuts**: Space to pause/resume, R new universe, 1-4 world mode, S PNG.

## How it works

The fragment shader evaluates mathematical functions per output pixel. These are *original formulas and combinations*, not transcriptions of Hamid Naderi Yeganeh's artwork or an astrophysical simulation.

### Galaxy Cluster

The intensity of each synthetic galaxy is a radial exponential envelope modulated by peaks of an angular phase:

`L_i ∝ exp(-alpha*r_i) * [c + cos(k*theta_i - beta*log(r_i+eps) + phi_i)^p]`

The seed picks location, radius, rotation, tilt, color, and arm count.

### Nested Foam

Each bubble is a deformed signed-distance field, `d_i = length(p-c_i) - R_i - A*sin(k*theta_i+omega*t)`, and the membrane glows with `exp(-(d_i/sigma)^2)`. A warped rectangular grid glows inside the bubble boundaries.

### Resonance Field

For emitters `i`, `Psi(p,t) = Σ_i A_i exp(j*(k*length(p-c_i) - omega_i*t + phi_i))`. The fragment shader sums real and imaginary components and takes the squared normalized magnitude. This is **visual wave interference**, not a demonstration of quantum phenomena or a semantic database.

### Golden Bloom

Points follow a phyllotaxis-inspired placement, `theta_n = n*pi*(3-sqrt(5))`, `r_n = c*sqrt(n)`, with radial and angular harmonics.

## Developer notes

- Core GLSL is in `<script id="fragmentShader">` inside `index.html`.
- Rendering is internally capped to ~1.55 MP for interactive smoothness and ~6.4 MP for export.
- WebGL context and driver performance varies, especially for the galaxy and bloom modes. If WebGL is unavailable the app switches automatically to a more illustrative Canvas2D renderer; the two backends use related formulas but do not produce pixel-identical artwork.
- Tested in an automated headless browser using the Canvas2D fallback. GPU shader rendering could not be validated in that restricted environment.
- Each JSON recipe can reproduce the same **static** composition with the same engine version and settings. Animated output depends on elapsed time and device frame timing.
- All computation is local. The app does not transmit artwork, recipes, or usage data.
- Designed to be hosted on GitHub Pages with `index.html` at repository root.

## Research distinction

The nested-bubble visual aesthetic is inspired by the NBG / DCF conceptual vocabulary, **not a validation, solver, or scientific numerical implementation of those systems**. In a later release, research-driven visualization should ingest independently specified experiment datasets with provenance and replay checks.