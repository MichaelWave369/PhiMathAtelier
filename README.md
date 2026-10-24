# ΦMath Atelier

**A Living Equation Studio**, v0.2.0.

A self-contained, completely offline mathematical art engine using JavaScript, WebGL 1.0, GLSL fragment shaders, and an automatic Canvas2D fallback. No frameworks, third-party dependencies, textures, photos, online APIs, or build steps. Both `index.html` and `chromatic-warp.js` must be present in the same folder.

## Launch

Open `index.html` in Chrome, Edge, or Firefox. WebGL is preferred for GPU rendering; a Canvas2D fallback is included if hardware acceleration is unavailable. You can also serve the folder using `python -m http.server 8000` and visit `http://localhost:8000`.

## Hosted demo (after the first merge)

The intended GitHub Pages URL is **https://michaelwave369.github.io/PhiMathAtelier/**.

After merging the first pull request, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. The `.github/workflows/pages.yml` workflow then deploys the static app whenever `main` changes. The URL is only live after Pages is enabled and a deploy succeeds.

No npm install or build step is needed.

## Verify the source

Run `node tests/smoke.mjs` with Node.js 22 or later to validate the standalone JavaScript, expected UI controls, five modes, six palettes and export features. The workflow also runs on pull requests.

## Controls

- **Five worlds**: Galaxy Cluster (synthetic spiral galaxies), Nested Foam (signed-distance bubbles and warped grids), Resonance Field (complex-wave interference), Golden Bloom (golden-angle phyllotaxis), and Chromatic Warp (static mathematical fields animated with a cycling color palette).
- **Six color palettes**, adjustable structure density, spiral frequency, deformation, luminosity, scale, time flow.
- **Interactive gravity lens**: Move the mouse over the image to deform nearby geometry.
- **New universe**: Resample the deterministic seed.
- **Pause, record an 8-second WebM animation**, save high-resolution PNG, export/import reproducible JSON recipes, share URL-encoded state.
- **Shortcuts**: Space to pause/resume, R new universe, 1-5 world mode, S PNG.

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

### Chromatic Warp · inspired by AcidWarp (new in v0.2.0)

The 1992 program AcidWarp animated mathematical patterns by cycling their VGA color palette. This mode is an **original implementation of that general technique**, not a port of AcidWarp or a reproduction of its source formulas.

Six new mathematical scenes are available: **Liquid Rings**, **Solar Spokes**, **Twin Wells**, **Woven Grid**, **Liquid Moiré**, and **Kaleido Flower**.

For each point, the formulas create a stationary scalar index field:

`I(x,y) = clamp(0.5 + 0.26 sin(f(x,y)) + 0.24 cos(g(x,y)), 0, 1)`.

The shader quantizes this to 256 indices. During animation it shifts the indexed lookup into a periodic palette:

`C(x,y,t) = palette( floor(B * fract(floor(256 I)/256 + cycleRate*t)) / B )`.

- Use **Mathematical scene** to switch formulas or **Next mathematical scene** to cycle manually.
- **Color bands** adjusts the discrete palette size, from 4 to 48.
- **Cycle colors** pauses/resumes palette rotation without changing the underlying pattern.
- **Auto-change scene** selects a different original equation every 20 seconds of active playback (real seconds, independent of Time flow).
- **Time flow** sets the palette rotation rate. **VGA Spectrum** is the new vivid rainbow palette; the other five palettes also work.
- Seed, palette, mode, pattern, band count and toggles are preserved by the JSON recipe and share-link state. Older v0.1.0 recipes remain importable.
- The CPU Canvas2D fallback caches an indexed field and recolors it using a lightweight palette table; it intentionally renders at lower pixel density to maintain interactivity.

The motion is a visual illusion from palette shifts, not a physically modeled flow or scientific simulation.

## Developer notes

- Core GLSL is in `<script id="fragmentShader">` inside `index.html`. Chromatic Warp's shaders and Canvas fallback live in `chromatic-warp.js` and are injected into the existing shader at initialization.
- Rendering is internally capped to ~1.55 MP for interactive smoothness and ~6.4 MP for export.
- WebGL context and driver performance varies, especially for the galaxy and bloom modes. If WebGL is unavailable the app switches automatically to a more illustrative Canvas2D renderer; the two backends use related formulas but do not produce pixel-identical artwork.
- Tested in an automated headless browser using the Canvas2D fallback. GPU shader rendering could not be validated in that restricted environment.
- Each JSON recipe can reproduce the same **static** composition with the same engine version and settings. Animated output depends on elapsed time and device frame timing.
- All computation is local. The app does not transmit artwork, recipes, or usage data.
- Designed to be hosted on GitHub Pages with `index.html` and `chromatic-warp.js` at repository root. The Pages workflow deploys both files.

## Research distinction

The nested-bubble visual aesthetic is inspired by the NBG / DCF conceptual vocabulary, **not a validation, solver, or scientific numerical implementation of those systems**. In a later release, research-driven visualization should ingest independently specified experiment datasets with provenance and replay checks.