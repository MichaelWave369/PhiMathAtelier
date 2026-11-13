# Φ Crop Circle Observatory · Research Lab r0.1

Standalone, **local-only** browser lab within PhiMathAtelier. Once the PR merges and Pages deploys, visit \`/PhiMathAtelier/crop-circles.html\`. Or open \`crop-circles.html\` from the repository beside \`crop-circle-engine.js\`.

## What is real in r0.1
- Parse and validate 2–50 user-entered angular intervals (in degrees).
- Deterministically decode angles by rounding angle / chosen angular unit; reject impossible digits >9.
- Compare decoded digits with four predefined mathematical constants. The decimal separator is **inserted by convention** after the first digit; a true physical decimal-point mark would require separate documentation.
- Compare angular residuals; scan a **small declared** family of units. The scan is exploratory, not hypothesis confirmation.
- Load a local image, click its approximate center, and click successive boundary rays to derive angular intervals. Nothing is uploaded. **No automatic image segmentation or AI vision in this first version**.
- Run a reproducible 1,000-trial *toy null simulation* based on independent uniformly random 5°-quantized angles. The simulation deliberately does not pretend to estimate the probability of extraterrestrial origin, nor does it adjust for the many alternative mappings one could invent.
- Export an auditable JSON receipt with numerical measurements, rule, provenance and results (not the source image).

## Barbury Castle teaching fixture

The numerical fixture \`105, 35, 145, 35, 180, 325, 70, 215, 180, 145\` is **a secondary publication's estimate**, not fresh measurements from an independent source image.

- Original analysis and angular table: <https://www.cropcirclearchives.co.uk/archives/2008/barbury/barburyRC2008a.html>
- Related archived report: <https://www.cropcirclearchives.co.uk/archives/2008/barbury/pi%20at%20barbury%20castle.html>
- FEEDIT reconstructs 11 crop formations as vector geometry, including Barbury 2008: <https://www.feedit.info/>. Those reconstructions may encode their interpreter's *a priori* assumptions; they are useful as **visual references or fixtures**, but should **not** be reused as independent evidence that the same interpretation was discovered.
- Original aerial photographs carry separate copyright and must be linked or licensed individually. This repository does not copy them.

For the published angles at a 36° grid, the deterministic decoder yields the rounded ten-digit sequence \`3.141592654\`. This validates the **arithmetic of a known interpretation**, not who made the formation or whether it communicates beyond artistic mathematical design.

## Scientific guardrails

1. A good numerical fit is different from intentional signaling, and **even intentional mathematical signaling does not establish nonhuman authorship**.
2. Record raw sources, photo permissions, date, camera perspective, image transformations, chosen center, tracing order and uncertainty before interpreting results.
3. Pre-register candidate encoding systems for future **blinded** samples.
4. Use comparable human-made designs and synthetic controls, and correct for searching across many alphabets, base angles, orientations, readings, geographic locations and dates.
5. Do not report a geographical or celestial map hit without predeclared coordinates, epoch, projection, rotation/scale constraints, and a null comparison.

## Roadmap (not yet built)

- r0.2: independent image measurements, radial edge discovery, multiple annotators and uncertainty envelopes.
- r0.3: FEEDIT JSON importer with CC BY-SA 4.0 attribution and explicit source lineage, plus independent-image comparisons.
- r0.4: blinded mathematical message search with family-wide randomized controls.
- r0.5: celestial/geospatial map-hypothesis workbench with projection, date, tolerance and look-elsewhere controls.
- Optional PhiDiscovery receipt adapter and PhiStream vision-agent review layer, which must remain separate from evidence scoring.

## Tests

\`\`\`bash
node tests/crop-circles.mjs
node tests/pages-assets.mjs
\`\`\`

No install, network requests, user account, third-party scripts, or external AI calls needed.
