# Supersolid Dynamics Lab R0.1 — evidence-limited modeling

**Classification:** original **dimensionless two-envelope teaching model**. This is **not** a quantitative reproduction, validation, or device simulation of room-temperature supersolidity.

**Source:** M. Muszyński et al., "Observation of a supersolid phase in a spin-orbit coupled exciton-polariton Bose-Einstein condensate," *Science Advances* **12**, eaee4875 (16 Oct 2026), DOI: [10.1126/sciadv.aee4875](https://doi.org/10.1126/sciadv.aee4875).

The paper reports two degenerate dispersion minima at opposing wavevectors ±k₀, a stripe pattern controlled by spontaneously selected relative phase, disordered-sample behavior and quantum vortices. Its **full** numerical model uses a spinor Boltzmann–Gross–Pitaevskii approach, k-dependent Rashba–Dresselhaus coupling, energy relaxation, saturated gain, nonlinearity, reservoir, correlated disorder, noise and calibrated experimental parameters (Methods Eq. 9). This lab deliberately **does not** implement that full model.

## What is implemented

The standalone [supersolid.html](../supersolid.html) is offline-capable, framework-free and available through the regular PhiMath Atelier GitHub Pages deployment. It uses two complex, slowly varying field envelopes A₊(x,y,t) and A₋(x,y,t), with periodic boundaries on a square numerical grid. Their phenomenological evolution is

    ∂ₜ Aⱼ = (p − 0.3 − ρ)Aⱼ + (D + iβ)∇²Aⱼ
             − i(gρ + U(x,y))Aⱼ + κ(A_other − Aⱼ) + ξⱼ

where ρ = |A₊|² + |A₋|², p is a dimensionless pump parameter, D diffusion, β wave dispersion, g nonlinear phase shift, U a fixed smooth synthetic disorder potential, κ a **phenomenological** phase-locking control, and ξ seeded independent noise.

It uses an explicit forward-Euler update and five-point finite-difference Laplacian. This simple system is intended for **qualitative experiments and code verification**, not quantitative physical prediction. It does not conserve particle number because it has gain and loss, and it does not derive the band minima from a RDSOC Hamiltonian.

The displayed total complex field is

    Ψ(x,y) = A₊(x,y) exp(i k₀ x) + A₋(x,y) exp(−i k₀ x)

with k₀ = 2π cycles/grid-width. The displayed intensity is |Ψ|². Interference of the two opposing carriers produces modulation at 2k₀, echoing the interference explanation in the source paper (especially Eqs. 6–7). This is **not** a claim that Ψ is a calibrated exciton-polariton wavefunction.

## Measurements (what they do and do not mean)

- **Mean intensity:** arithmetic average of the numerical |Ψ|² field, arbitrary units.
- **Stripe contrast:** normalized Fourier amplitude at 2k₀ of the row-averaged intensity. Can exceed 1 under strongly inhomogeneous toy states; not a measured optical visibility.
- **Stripe phase:** argument of the Fourier coefficient at 2k₀; undefined when contrast is too small, including the single-mode control.
- **A₊ vortices:** integer phase winding over interior 2D plaquettes, using wrapped phase differences. The vortex preset explicitly *imprints* a +1 phase winding in A₊ at initialization. This validates the detection pipeline, not spontaneous vortex formation.
- **Phase-resultant statistic:** across independently seeded shots, the length of the mean unit phase vector. Values near 0 indicate spread phases; near 1 clustering. This is a finite-sample toy statistic, not experimentally measured coherence.

## Controlled tests

The Compare button runs eight separate initial seeds for three scenarios, each on a 32×32 grid for 90 time steps. All other model inputs are matched.

1. **Two opposing modes:** both wave envelopes seeded with independent global phases, with no locking term.
2. **Single-mode baseline:** sets A₋ = 0 permanently; no two-carrier interference.
3. **Synthetic phase-lock control:** uses a dissipative κ(A_other − Aⱼ) term to encourage co-phasing. This is a **phenomenological control**, not an electrical-voltage model of the actual cavity.

The separate **Vortex** preset initializes one winding. It is not part of the three-scenario comparison and is not described as spontaneous nucleation.

The experiment is intentionally restricted to small finite grids, bounded parameter ranges, deterministic pseudorandom sequences and an explicit step limit. No external data fetch, upload, credential, browser camera, microphone, backend API, GPU driver or quantum hardware is required.

## No claims beyond the model

This lab **does not** establish:
- A new state of matter, numerical proof of supersolidity, superfluid flow or a real exciton condensate.
- Quantitative agreement with the Warsaw experiment, its measured voltage response, band geometry, pump threshold or vortex frequency.
- A photonic computer, a physical processor speedup, improved inference, light-based cryptography or a LightBridge hardware upgrade.
- Physical interpretations of arbitrary model units as micrometers, volts, kelvin or picoseconds.

In the underlying publication, empirical stripes and vortices are observations in fabricated optical microcavities; a browser simulation is categorically different evidence.

## Reproducibility and next scientific rung

The exported JSON contains the model version, parameters, seed, step count, measured metrics and control-shot outputs. The exact field can be replayed by resetting to the specified seed, parameters and evolving the same number of steps under the same implementation. PNG export is only a visualization.

For R0.2, before claiming any match, reproduce at least one published **dimensionless or calibrated** plot from the paper, implement the linear 2×2 RDSOC Hamiltonian and proper spinor evolution with a documented numerical solver, preregister comparison targets, compare with off-resonance and fixed-phase baselines, and quantify numerical convergence (grid, step size, and solver error). The present model is a useful *first laboratory*, not a final physics solver.

Run:

    node tests/supersolid.mjs
    node tests/pages-assets.mjs

Both should pass in CI. Host deployment includes all top-level HTML/JS assets through the existing Pages workflow.
