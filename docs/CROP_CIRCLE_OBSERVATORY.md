# Φ Crop Circle Observatory · Research Lab r0.3

A **local-only** browser research lab within [ΦMath Atelier](../index.html).
After merging and publishing the branch, open [Crop Circle Observatory](../crop-circles.html); the hosted route is `/PhiMathAtelier/crop-circles.html`.
No installations, remote model APIs, or third-party scripts.

## Implemented research pipelines

### 1. Angular interpretation (r0.1, unchanged)

- Parse 2–50 angular intervals, select one of five declared angular units, and round angles to integer digits.
- Compare a resulting ten-digit sequence with predefined mathematical constants; insert a decimal separator after the first digit by convention.
- Show per-angle residuals and fit RMSE.
- Trace boundary-ray angles manually on a user-loaded photograph.
- A fixed-seed, 1,000-trial **toy** control samples uniformly random 5°-quantized angles. This is **not** a calibrated p-value for a crop-circle hypothesis.
- Export a JSON receipt; image pixels are not exported.

The Barbury Castle 2008 teaching fixture (`105, 35, 145, 35, 180, 325, 70, 215, 180, 145`) was previously reported in an existing π interpretation. The reproducible output `3.141592654` validates that arithmetic, not independent discovery or authorship. No new aerial measurement is included.

### 2. On-device classical image analysis (r0.2)

- Load an aerial photograph from the local filesystem (never uploaded).
- Click **Find circular edges** to resample to at most 380 px on the longest side and compute luminance and Sobel gradient strength and direction.
- Search candidate centers and radii for image edges whose gradients align radially. Search may start automatically or use a manually selected center.
- Score support across 64 radial directions, requiring spatial coverage over at least three of four quadrants; deduplicate radii and report up to eight candidates.
- Overlay dashed candidate rings and estimated center on the original photograph.
- Switch sensitivity between conservative, balanced and exploratory. Provide normalized radial signatures, which assist future cross-image matching but are **not perspective invariant**.
- Export detection metadata and declared settings as part of the v0.2 JSON receipt, while excluding source image pixels.

**Important distinction:** This is a deterministic *classical computer-vision heuristic*, not an AI semantic decoder, validated field measurement system, proof of circles in crops, or a model trained on crop-circle photographs. Detection quality is currently established only with synthetic circle and empty-image unit fixtures. Background texture, shadows, elliptical perspective, image scaling, and an operator-chosen center can produce false matches or suppress real ones. Candidate scores are **edge-support scores, not probabilities**. The automatic rings **do not provide angular message decoding**. Measuring isolated radial boundaries and verifying physical formations require separate methods.

## 3. Fingerprint Atlas (r0.3)

The [Fingerprint Atlas](../crop-compare.html) provides a separate, offline comparative laboratory.

- Enter 2–12 **distinct concentric-ring radii** from the same observation using one unit. A minimum of **three** rings is required to treat a comparison as exploratory; two rings are flagged `insufficient-structure`.
- Import r0.2 Observatory JSON receipts containing measured rings, or import/export a bounded JSON fingerprint collection (max 100 records).
- Each fingerprint is normalized by its *outermost* radius to compare radial proportions without absolute scale.
- Pairwise matching uses **ordered dynamic-programming alignment** of normalized rings, with an explicit penalty for missing rings and absolute-ratio differences. The 0–100 score is a **descriptive similarity metric only**.
- See candidate rankings, generated radial diagrams, numeric edit distances, and unverified source lineage.
- Run a deterministic **toy null** (1,000 randomly generated ring profiles, same ring count) to see whether accidental high scores are common under an intentionally oversimplified baseline.
- Export the pairwise comparison and optional toy-null receipt independently of the library JSON.

The Atlas **does not** use artificial intelligence to infer messages. It cannot yet recognize arbitrary noncircular shapes, correct perspective, establish if records were independently sourced, or determine if a similarity has any symbolic meaning. The null does not model the actual prevalence of human-made geometry or selection of interesting formations, so its frequency must never be reported as a calibrated p-value or probability of communication.

**Synthetic fixtures:** The five built-in demo profiles are fictional and labeled synthetic. The scaled copy matches its reference at exactly 100/100 by construction. This is a software correctness check, *not* a crop-circle finding.

**Source lineage:** Observatory v0.2 detection records retain capture dimensions and analysis settings where present, but no original image hash is yet available. Source names, links and labels are user-supplied and unverified. A copied photo, traced version or derivative drawing must not be counted as independent corroboration.

### Fingerprint similarity method

Given sorted positive distinct radii `r`, normalize each by `max(r)`. Align two sequences in order using the minimum of: pair the radii at cost `min(0.44, 1.7 × |a − b|)`, or skip a radius with gap penalty `0.22`. Divide the total edit cost by the longer sequence length; report `max(0, 100 × (1 − normalized_cost/0.22))`. This score has **no empirical calibration**. Unlike the raw visual ring detector it also cannot account for ring edge support or uncertainty, and the score should not be used for automatic scientific claim promotion.

## Published reference material and provenance

- Angular table and interpretation: <https://www.cropcirclearchives.co.uk/archives/2008/barbury/barburyRC2008a.html>
- Related archived report: <https://www.cropcirclearchives.co.uk/archives/2008/barbury/pi%20at%20barbury%20castle.html>
- FEEDIT contains later vector reconstructions: <https://www.feedit.info/>. Such interpretations may already incorporate a π-based reconstruction. Do **not** use them as an independent blind discovery sample.
- Aerial photographs carry their own copyright and permissions; none are bundled.

## Experimental safeguards

1. Do not equate numerical patterns with intent or nonhuman authorship.
2. Record original image license/source, formation date, capture angle, image transformations, uncertainty, reading order and observer choices.
3. Pre-register analyses before sampling unfamiliar designs, then compare against known human-made and synthetic patterns.
4. Hold out blind test images and correct for look-elsewhere effects from arbitrary choices of maps, centers, rotations, scales, thresholds or symbols.
5. For map and star-chart claims, predeclare target catalog, epoch, projection, tolerance and null model; publish failures as well as matches.
6. Separate automatic image-derived geometry from manually traced measurements and published reconstructions in any downstream scientific evidence scoring.

## Future, **not implemented in r0.3**

- Automated ray-boundary extraction and independent photograph validation sets.
- Repeat measurements with geometric uncertainty and viewpoint correction.
- FEEDIT CC BY-SA 4.0 source adapter with explicit attribution and derivative lineage.
- Independent image-level validation and uncertainty-weighted fingerprint comparisons against known human-made control samples.
- PhiDiscovery evidence-bundle bridge with uncertainty-aware skeptical triage.
- Optional PhiStream model reviewers for *hypothesis generation only*.
- Genuine map/celestial hypothesis workbench with stringent statistical testing.

## Verify locally

```bash
node tests/crop-circles.mjs
node tests/crop-circle-vision.mjs
node tests/crop-circle-compare.mjs
node tests/pages-assets.mjs
```

GitHub Actions runs all three Observatory tests on changes to relevant files. Pages deployment verifies all local HTML and JS links before uploading.
