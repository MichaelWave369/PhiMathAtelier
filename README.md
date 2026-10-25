# ΦMath Atelier

**A Living Equation Studio**, v1.0.0.

A self-contained, completely offline mathematical art engine using JavaScript, WebGL 1.0, GLSL fragment shaders, and an automatic Canvas2D fallback. No frameworks, third-party dependencies, textures, photos, online APIs, or build steps. `index.html`, `chromatic-warp.js`, `vj-lab.js`, `deck-mixer.js`, `geometry-lab.js`, `performance-cues.js`, `performance-timeline.js`, and `scene-dissolve.js` must be present in the same folder.

## Launch

Open `index.html` in Chrome, Edge, or Firefox. WebGL is preferred for GPU rendering; a Canvas2D fallback is included if hardware acceleration is unavailable. You can also serve the folder using `python -m http.server 8000` and visit `http://localhost:8000`.

## Hosted demo (after the first merge)

The intended GitHub Pages URL is **https://michaelwave369.github.io/PhiMathAtelier/**.

After merging the first pull request, open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. The `.github/workflows/pages.yml` workflow then deploys the static app whenever `main` changes. The URL is only live after Pages is enabled and a deploy succeeds.

No npm install or build step is needed.

## Verify the source

Run `node tests/smoke.mjs`, `node tests/vj-lab.mjs`, and `node tests/deck-mixer.mjs` with Node.js 22 or later to validate the standalone JavaScript, expected UI controls, five modes, six palettes and export features. The workflow also runs on pull requests.

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

## VJ LAB · Live mathematical visual synthesizer (new in v0.3.0)

VJ LAB analyzes audio locally and uses the levels to modulate any of the five existing mathematical worlds. **Base artwork parameters are not overwritten.** The default demo is idle until Start input is pressed, so existing artwork initially renders unchanged.

### Try it

1. Open the live GitHub Pages site over HTTPS and scroll to **VJ LAB** in the left sidebar.
2. Choose a signal source and click **Start input**.
3. Adjust the **Jungle Reactor**, **Ambient Drift**, or **Kick & Glow** preset and the wet/bass/mid/high depth controls.
4. Click **Fullscreen stage** to send the output to a fullscreen browser/projector. Irregular-surface projection calibration remains future work.

| Source | What it does |
| --- | --- |
| Demo beat | Synthetic beat and spectral bands; no permissions |
| Manual bands | Three live energy sliders and manual Inject beat button |
| Microphone / interface | Browser getUserMedia, analyzed without speaker monitor/feedback |
| Local music file | Local audio element connected to Web Audio analyser and speakers; no upload |
| Browser-tab capture | getDisplayMedia tab/screen picker; enable tab audio when prompted; availability varies |
| External adapter | Versioned normalized-band frames from BackSpin96 or another trusted sender |

FFT analysis splits bins into bass (~35–180 Hz), mids (~180–2300 Hz), and highs (~2300–11000 Hz). Bass drives deformation and zoom, mids drive harmonic/spiral frequency, highs drive glow and Chromatic Warp bands, while transients briefly boost brightness. Input gain is customizable, and the original artwork slider values remain intact.

**MIDI:** In supported HTTPS browsers, Connect MIDI, select a target, click Learn next MIDI CC, and turn a controller knob. Mappings are local to the page session. Sysex is not requested.

**Output:** The existing PNG and 8-second WebM recorder capture visuals. WebM recording does **not** include the analyzed music audio. The fullscreen stage works for displays and basic projector output.

### BackSpin96 bridge contract

The external source is opt-in. Use 0–1 finite numerical bass, mid, and high values, plus a boolean or 0/1 beat:

**Same page:**

    window.PhiVJLab.pushFrame({bass:0.8,mid:0.4,high:0.6,beat:true});

**Same-origin pages/tabs (BroadcastChannel):**

    const channel = new BroadcastChannel('phimath-vj-v1');
    channel.postMessage({type:'phimath:vj:frame',version:1,frame:{bass:0.8,mid:0.4,high:0.6,beat:true}});

**Cross-origin iframe/popup relationship:** In Atelier set the **exact trusted sender origin** in Allowed bridge origin; then from the related sender window:

    atelierWindow.postMessage({type:'phimath:vj:frame',version:1,frame:{bass:0.8,mid:0.4,high:0.6,beat:true}},'https://michaelwave369.github.io');

Atelier rejects postMessage from any origin other than the configured sender. Frames expire after 1.5 seconds and no raw audio is sent. This is an adapter contract, not a claim that BackSpin96 is already hooked up.

### Browser notes

WebGL is preferred, but the Canvas2D fallback accepts the same effective modulation. Audio capture and MIDI require explicit user permission and browser support, typically over HTTPS. All captured audio tracks are stopped on source change or Stop input; local file Object URLs are revoked.

## Dual-Deck Visual Mixer · v0.4.0

ΦMath Atelier now supports **two simultaneously rendered mathematical worlds** and live visual DJ transitions.

- **Deck A:** the existing world and its controls, unchanged.
- **Deck B:** an independent world, palette, seed, Chromatic Warp pattern, density, harmonics, deformation, luminosity, and zoom.
- **Three transitions:** Smooth Blend, Left-to-Right Wipe and Expanding Iris.
- **Performance controls:** visual A/B crossfader, Copy A → B, Random B, Swap A ↔ B; use `[` and `]` keys to nudge the visual mix by 5%.
- **MIDI integration:** VJ LAB's MIDI Learn dropdown includes **Deck A/B visual crossfader**; learn a controller CC to sweep the transition.
- **Audio reaction:** both procedural decks receive the same optional VJ LAB band modulation, so you can crossfade between two audio-responsive worlds.
- **Recipes:** save/import JSON and state URL now carry an independent `mixer` object with enabled flag, transition, fader position and Deck B settings. Importing older v0.1–0.3 recipes disables the mixer and retains the original single-deck experience.
- **Visual exports:** PNG and the existing 8-second silent WebM recorder capture the composited stage, including A/B transitions.

The dual-deck feature is **off by default**. Enable it in the new left-sidebar mixer section. The artist's original single-deck output remains untouched until the user enables mixing. WebGL renders both source scenes into independent framebuffer textures at reduced source resolution, then composites them to the stage. Canvas2D renders both to offscreen canvases and composites with clipping or alpha blending. The mix remains a visual effect; audio playback and audio crossfading belong to the DJ deck/source, not the visual mixer.

### First test after merging

1. Open the live GitHub Pages site and select **Chromatic Warp** for Deck A.
2. Scroll to **Dual-Deck Visual Mixer**, enable it, then set Deck B to **Nested Foam**.
3. Move the A/B crossfader and try Wipe and Iris transitions.
4. Start the VJ LAB demo beat (or load a local song) and watch both worlds react to the same signal.
5. Export a PNG, save a recipe, reload it, and confirm the A/B scene restores.

Two full-screen equation renders are more expensive than one. The mixer scales its offscreen sources to ~70% of display dimensions to keep interactive performance reasonable. WebGL output and projector behavior require additional real-browser verification; the automated CI suite validates source syntax, normalization, controls and renderer integration.

## Developer notes

- Core GLSL is in `<script id="fragmentShader">` inside `index.html`. Chromatic Warp's shaders and Canvas fallback live in `chromatic-warp.js` and are injected into the existing shader at initialization.
- Rendering is internally capped to ~1.55 MP for interactive smoothness and ~6.4 MP for export.
- WebGL context and driver performance varies, especially for the galaxy and bloom modes. If WebGL is unavailable the app switches automatically to a more illustrative Canvas2D renderer; the two backends use related formulas but do not produce pixel-identical artwork.
- Tested in an automated headless browser using the Canvas2D fallback. GPU shader rendering could not be validated in that restricted environment.
- Each JSON recipe can reproduce the same **static** composition with the same engine version and settings. Animated output depends on elapsed time and device frame timing.
- All computation is local. The app does not transmit artwork, recipes, or usage data.
- Designed to be hosted on GitHub Pages with `index.html` and `chromatic-warp.js` at repository root. The Pages workflow publishes the HTML and all four JavaScript modules.

## Research distinction

The nested-bubble visual aesthetic is inspired by the NBG / DCF conceptual vocabulary, **not a validation, solver, or scientific numerical implementation of those systems**. In a later release, research-driven visualization should ingest independently specified experiment datasets with provenance and replay checks.

## Sacred Geometry Laboratory · v0.5.0

A new **opt-in, entirely procedural sacred geometry workbench** is available near the top of the left sidebar. Choose **Enter Geometry Lab** to display an independent Canvas2D drawing surface over the normal shader stage. **Return to Atelier worlds** restores the existing five worlds, mixer and VJ LAB without modifying their settings.

This is a **mathematical construction and inspection tool**, not a reproduction of a historical ritual artifact or a claim that a symbol has physical or supernatural properties.

### Included construction presets

| Preset | Explicit mathematics |
| --- | --- |
| 13-circle Metatron construction | 13 centers on nested hexagons, 78 pairwise chords, 13 equal circles |
| Flower of Life | Equal-radius circles on a finite hexagonal lattice (1 / 7 / 19 / 37 centers for depth 0 / 1 / 2 / 3) |
| Interlaced star polygons | Regular n-gon vertices joined by modular step k, including disconnected cycles |
| Polar mandala | Polar rose r = R cos(nθ) layered with stars and concentric circles |
| Golden logarithmic spirals | r(θ) = R φ^((θ − 2πt)/(π/2)) with φ = (1+√5)/2, scaled by a factor φ every quarter-turn |

Each is a **live, editable layer**, not an image. The seven selectable formula families are: 13-point chords, flower circles, star polygons, regular polygons, polar roses, golden logarithmic spirals, and concentric circles. Layer controls edit count, step, flower depth, spiral turns, radius, rotation, opacity, color, visibility, and spin direction. Use the global rotation slider to animate; Pause freezes geometry. The selected layer's **actual parametric equation** is displayed beneath the editor.

**Click a visible stroke on the canvas** or choose a layer button to inspect it. Add up to 12 layers, remove layers, try three background treatments, enter fullscreen stage, and save a PNG or a versioned JSON geometry-only recipe. Recipes may be imported to reconstruct a static composition; preview motion uses the current time within the active session. The last edited recipe is also saved locally by the browser (when permitted).

**Important interface boundary:** geometry uses its **own** rendering canvas, PNG action, and JSON recipe actions. The original application's PNG/WebM and share-link buttons still refer to the five existing shader worlds. Existing Dual-Deck and VJ settings are preserved. As of v0.6.0, geometry can read VJ LAB's existing audio levels when opted in. It does not open a microphone itself and remains outside the WebGL deck compositor. No images, external services, copied esoteric artwork, unsafe evaluation of formulas, or external packages are required.

### Testing

Run:

    node tests/smoke.mjs
    node tests/vj-lab.mjs
    node tests/deck-mixer.mjs
    node tests/geometry-lab.mjs

GitHub Actions runs these checks on pull requests and pushes to main. The geometry checks verify hex-lattice counts, all Metatron pairwise chords, modular-star cycles, φ growth by one quarter-turn, finite normalized vertices, bounded recipe imports, and deterministic static paths. Real-browser testing is still required for pointer hit-testing, mobile controls, fullscreen, and PNG capture.

## Sacred Geometry Lab · VJ Reactor and SVG (v0.6.0)

**Start here:** Enter Geometry Lab, choose a geometric preset, enable **React to VJ LAB audio levels**, then choose **Demo beat** and **Start input** in the existing VJ LAB panel.

- Bass pulses the size; mids bend the rotation; highs and beats boost brightness and glow.
- Response intensity runs 0–100%. It is disabled by default and is only a **draw-time transformation**, never a mutation of the mathematical geometry or stored recipe.
- The existing VJ LAB handles audio input. The geometry panel simply reads the same normalized local meter for demo, manual controls, file, microphone, tab, or the approved external bridge. No new microphone permission, audio upload, or capture code.
- The mini meter reports bass, mids, highs and beat strength. Click-to-inspect follows the displayed reactive geometry, not its original unmodulated positions. Older geometry recipes import with the audio checkbox off.

### Editable SVG vectors

Click **Vector SVG** inside the geometry panel to export a script-free, static **1600 × 1600 SVG snapshot** of the current frame. SVG contains real individually editable geometric paths with the current color, visibility, rotation, opacity and beat-responsive transformation.

SVG is not an animation or a replacement for JSON recipes. Use **Recipe JSON** to recover editable numeric parameters in the Atelier and **Geometry PNG** to save raster art. The SVG output intentionally prioritizes sharp vector paths over Canvas2D's blurred glows.

Geometry inputs, colors, SVG dimensions and parameters are validated/bounded. The generator does not accept or emit scripts, remote media, event handlers or arbitrary user formulas.

### Quality boundary

The geometry lab is still an **independent Canvas2D stage**. Its active output does not become an A/B deck source and is not included in the original five-world WebM recorder. GitHub Actions validates constructors, audio bypass and reaction, recipe immutability/backward compatibility, SVG paths, and hostile-input handling. Browser verification remains necessary for SVG export, input selection, mobile controls and real-time playback.

## Sacred Geometry as a real A/B deck source · v0.7.0

The **Dual-Deck Visual Mixer** now offers **Sacred Geometry Lab** as the **sixth visual-world choice on Deck B**, in addition to the original five shader worlds. This is an actual mixer source in the **Blend, Wipe, Iris, MIDI CC, PNG and 8-second silent WebM** visual output, not a foreground overlay.

### Try it

1. Choose **Chromatic Warp** for the main stage/Deck A, then open **Dual-Deck Visual Mixer**.
2. Check **Enable A/B deck mixing** and set the **Deck B World** to **Sacred Geometry Lab**.
3. Under **Geometry construction**, choose **Flower of Life**, **13-point chords**, **Interlaced stars**, **Polar mandala**, **Golden spirals**, or **My Geometry Lab composition**.
4. Slide the fader from A to B (keyboard **[** and **]**, or existing VJ LAB MIDI learn). Try **Blend**, **Wipe**, and **Iris** transitions.
5. Start a VJ LAB demo beat or permitted music source. The five built-in geometric presets respond to levels automatically. **My Geometry Lab composition** uses the existing editor's saved layers, colors, background, rotation and audio-response preferences.
6. Click **Open Geometry Lab editor** to edit your composition. Return to the main shader stage using **Return to Atelier worlds** and watch the live composition in Deck B.
7. Save a PNG or record a silent WebM with the existing **studio** buttons to capture the A/B composite. Export JSON and reimport it to restore the Deck B preset. The geometry editor's SVG and JSON buttons continue to serve the geometry workbench independently.

### Rendering details

On **WebGL**, shader Deck A is drawn into framebuffer texture A, while Deck B's 2D geometric construction is rendered on an offscreen canvas and uploaded into framebuffer texture B with appropriate Y orientation. The existing GLSL mixer composites both using the normal fader transitions. On **Canvas2D fallback**, the source is drawn directly onto offscreen Deck B, then composited by the existing 2D fader. Both paths are covered by the dependency-free mock renderer tests.

Performance stays bounded: geometry source resolution follows the existing lower-resolution deck target (70% GPU or 68% Canvas2D), mathematical paths are cached, and the base layers and imported recipes are strictly normalized.

**Current intentional boundary:** Deck A remains one of the five original shader worlds; choosing geometry for Deck B disables **Swap A ↔ B** to avoid placing an unsupported geometry mode into Deck A's GLSL shader. Choose a normal shader world for Deck B to enable Swap again. The existing dedicated Geometry Lab editor still overlays the stage while editing, but returning to the stage restores the live A/B output. No extra microphone permissions, server processing, assets, or dependencies are introduced.

### Tests

Run the four existing test suites and the new `node tests/geometry-deck.mjs` suite. CI checks the CPU geometry branch, GPU texture upload and Y flip restoration, preserved old shader mixing, safe swap behavior, exported preset recipes, and correctness of the CPU Chromatic Warp deck target. A browser GPU and mobile smoke check is still needed after merge.


## Live Performance Cue Bank · v0.8.0

PhiMath Atelier now includes a **four-slot visual cue bank** between the Dual-Deck Mixer and VJ LAB. It works entirely client-side without accounts, external services or a build step. It does not alter the five source shader worlds or the Sacred Geometry engine.

### Store and recall a scene

1. Configure the primary shader artwork (Deck A) and the independent Deck B world (including a geometry preset or **My Geometry Lab composition**).
2. Enable the A/B mixer and select your Blend/Wipe/Iris transition and crossfader position.
3. In **Performance Cue Bank**, type a short name and click **Save** for any of the four slots.
4. Change the worlds and fader, then choose **Recall** to restore both Deck A parameters and Deck B settings, transition style, enabled state and crossfade position. Keyboard shortcuts **Shift+1–4** recall the corresponding cue when focus is not inside a text field or slider.
5. You can rename a saved cue; names are rendered as plain text, never interpreted as HTML.

A cue stores the primary artwork's shader parameters (mode, seed, palette, warp, zoom, density, speed, pointer, chromatic pattern/cycle/auto controls) and the full sanitized **mixer state** (Deck B parameters/preset, crossfader, enabled state and transition). Global pause/play state and elapsed animation time intentionally are **not** restored, allowing musical timing to continue uninterrupted.

**My Geometry Lab composition** remains a reference to your current local editor composition. Cue recall restores that source selection, not a frozen copy of the geometry editor's separate layer recipe. For a self-contained geometry-layer transfer, also export its Geometry JSON recipe.

### Time your transitions

Choose a **0.5 / 1 / 2 / 4 / 8 / 16 second** fade with either smooth S-curve or linear interpolation. **Fade to A** and **Fade to B** animate the current visual crossfader to its corresponding endpoint. You must first enable A/B mixing. **Stop fade** cancels without resetting the current fader position.

**Manual takeover always wins:** dragging the crossfader, using [ and ] or touching an assigned MIDI CC cancels an in-progress fade when the resulting fader position changes. The automation writes quiet fader updates; the existing 30-FPS render loop performs the drawing. These are **visual** fades only; music playback, BPM detection, beat quantization, and audio crossfading are not changed.

### Save and restore your show

- The four cue slots and fade preferences are stored in this browser's **localStorage**, if allowed.
- Click **Cue JSON** to export the four-slot cue bank; **Import cues** restores it after validating and bounding the inputs. Imported cue files are capped at 160 KB.
- The regular Atelier **Equation recipe JSON** and copied state link now also include a sanitized **cueBank** object, so a complete scene set can be shared. Importing older v0.1–v0.7 recipes **does not erase** your locally stored cue slots.
- **Clear bank** empties all four slots without changing the current A/B stage.

### Quality and compatibility

Run:

    node tests/performance-cues.mjs

The continuous-integration workflow includes this suite alongside the original shader/Chromatic Warp, VJ LAB, dual-deck, geometry and geometry-deck tests. Automated coverage checks safe imports, snapshot recall, mute/default behavior, predictable fades, manual override, saved cue names, local persistence and deployment asset presence. Manual browser QA should cover the crossfader while recording WebM, MIDI interruption, keyboard focus, mobile controls, exported JSON and GitHub Pages deployment.

## Performance Timeline · v0.9.0

The **Performance Timeline** panel below Cue Bank creates an offline 1–16-step visual show from the four previously saved cues. Audio transport remains untouched.

### Make a show

1. Save your favorite A/B combinations in **Cue 1–4** in Performance Cue Bank. Reuse a cue in multiple timeline steps.
2. Select a slot and **Add step**. For each step, set **Hold** (0.5–60 s), **Fade** (0/0.5/1/2/4/8/16 s), **Fade fader to** (Deck A, Center, Deck B), and **Easing** (Smooth/Linear).
3. Rearrange steps with **↑/↓**, remove unwanted steps, and press **Play**, **Pause/Resume**, **Next**, **Stop**, or enable **Loop whole show**.
4. Use **Timeline JSON** to export/import the sequence on its own. Standard Atelier recipe JSON and copied state links now include a timeline object alongside Cue Bank. Older recipes without timeline leave locally saved sequences untouched.

**Crucial transition distinction:** Cue recall changes the shader and geometry worlds instantly, a **scene cut**. The step then holds the new cue and animates **its own A/B fader** from the recalled position to the target. This is *not* a complete cross-dissolve between arbitrary consecutive scene snapshots. If a recalled cue has the mixer disabled, its A/B fade is skipped; the saved single-deck scene is respected.

Manual keyboard, mouse, MIDI, or separate cue recall takes priority and stops playback. Starting a timeline first stops a competing standalone Cue Bank fader automation. Editing steps stops a running sequence. Playback is intentionally **not restored on reload**.

### Offline safety and scope

- Timeline steps are cue *references*, not full copies of the four scenes. Export the Cue Bank separately when transferring a show to a different browser.
- A missing referenced cue blocks playback and is identified in the status message.
- Timing parameters and cue indices are bounded, inputs are sanitized, JSON imports capped to **64 KB**, and cue names use textContent, not interpreted HTML.
- LocalStorage saves the arrangement when browser storage is available. No remote APIs, downloads of outside media, or microphone permissions are added.
- Browser-frame timing is not sample accurate. Beat-grid quantization, audio fades, and arbitrary scene-to-scene framebuffer dissolves are not included.

### Verification

The CI suite now includes **node tests/performance-timeline.mjs**, covering sequence timing, cue cuts, fader motion, looping, pause, skip, disabled mixer, invalid imports, manual overrides, backward-compatible recipes and Pages asset inclusion. Live browser QA should also verify WebGL/Canvas2D playback and recording.

## Mathematical Performance Studio · v1.0.0

**Scene-to-scene dissolves are now rendered inside the actual art canvas**, rather than being cuts or a CSS overlay. The dedicated `scene-dissolve.js` compositor captures a single **frozen frame** of the outgoing scene just before recalling the next cue, then blends that frame over the **live incoming shader or A/B geometry output**. It renders through WebGL alpha blending or the Canvas2D fallback. Normal high-resolution PNG and silent WebM capture the composited image; no new audio permissions or remote assets are introduced.

### Arrange a show visually

- The Performance Timeline now has a **proportional cue ruler**. Blocks indicate the relative duration of each step, name the cue, highlight the current step and jump to the editable step when clicked.
- Each step adds **Scene dissolve** (0 / 0.5 / 1 / 2 / 4 / 8 seconds) to the existing Hold (0.5–60 seconds) and **Fade fader** (0 / 0.5 / 1 / 2 / 4 / 8 / 16 seconds).
- The order of a step is: **snapshot dissolve from previous scene → hold the new scene → fade its own A/B controls → next cue**. Scene changes no longer need to be hard cuts; set Scene dissolve to **0** for a cut.
- The scene dissolve uses the step's existing **Smooth or Linear** easing. Fade progress and time are included in the visual ruler's duration.
- Existing v0.9 timelines lacking the `enter` field use **0 seconds**, preserving legacy cut behavior. Newly added steps default to a 1-second scene dissolve.

### Technical honesty

This is a **frozen outgoing frame / live incoming frame** dissolve. It does not independently re-render two continuously animated, live scenes at once. The outgoing scene is intentionally captured only once for much lower GPU cost. Its image blends over whatever the incoming shader, Geometry Lab, or A/B deck outputs. The compositor lives *after* the ordinary GPU/Canvas2D draw call; therefore the visual change is present in normal PNG screenshots and silent WebM recorded from the canvas. It is not audible and does not edit any original equation, layer, or saved cue.

Pausing the timeline pauses the transition's clock. Manual fader/MIDI changes, manual cue-bank fade, deleting a referenced cue, or stopping the timeline cancel the compositor and restore unmodified live rendering. WebGL blend modes, snapshot upload orientation, and viewport are restored after drawing to avoid interfering with the next frame.

### Verification

GitHub Actions includes `node tests/scene-dissolve.mjs` alongside all seven existing test suites, covering snapshot capture, WebGL texture flip/upload reuse, alpha-over output, CPU path, easing, pause/cancel and Pages deployment. Browser QA remains required for real hardware GPU behavior, accurate timing under throttling, mobile timeline layout, high-resolution PNG and recorded WebM.

**Still future scope:** Two simultaneously live scene renderers, beat-grid sync, BackSpin96/ParaCut bridges, and multitrack video editing are *not* claimed here.
