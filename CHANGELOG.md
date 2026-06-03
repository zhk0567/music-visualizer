# Changelog

All notable changes to this project are documented here.  
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-06-03

### Added — Wrap-up Round 3 (release)

- **GitHub Pages**: [`deploy-pages.yml`](.github/workflows/deploy-pages.yml), Vite `base` via `BASE_PATH`, SPA `404.html` fallback
- **OG / Twitter meta** in [`index.html`](index.html) for link previews
- **Final acceptance checklist** and live demo URL in [`README.md`](README.md)

### Added — Wrap-up Round 2 (quality)

- **Beat sensitivity persistence**: `beatSensitivity` in settings, localStorage, URL (`beat`), and named presets
- **Vitest expansion**: tests for `freqMapping`, `modeProfiles`, `presets`, and beat settings clamp/URL parse
- **Dynamic reduced motion**: Renderer listens for `prefers-reduced-motion` changes at runtime

### Added — Wrap-up Round 1 (docs)

- [`CHANGELOG.md`](CHANGELOG.md), MIT [`LICENSE`](LICENSE), streamlined [`README.md`](README.md) with project structure
- [`package.json`](package.json) metadata: description, repository, keywords, engines

### Added — Round 9

- **`MOTION_PROFILES`** in [`src/render/modeProfiles.ts`](src/render/modeProfiles.ts): unified attack/release/audioGain/beatGain per visualizer mode
- Shared **`smoothToward()`** helper for spectrum and polar bar smoothing
- Stronger spectrum dynamics: wider bars, audioGain 7.5, bass-weighted freq mapping (log exponent 0.48)
- Stronger polar dynamics: audioGain 7, enhanced hub/ripple beat feedback, polar camera beatZoom 0.04
- Particle **beat burst**: radial kick + size/brightness spike when beat > 0.5; idle opacity ~12%

### Changed — Round 8 hotfix (included in 1.0.0)

- **Mode differentiation**: only spectrum keeps floor/inner/base rings; waveform is shader lines + thin inner ring; particles are pure point cloud; polar is radial petals + hub + ripple only
- **Async mode switch**: `visualizerGeneration` token in Renderer prevents stale visualizer instances when rapidly pressing `1–4`
- **Themes & materials**: brighter palette, gradient background, fog removed; Phong bar materials via [`visualMaterials.ts`](src/render/visualizers/visualMaterials.ts)
- **Renderer idle fix**: empty FFT when not playing so visualizers show idle animation instead of flat silence
- **Waveform / particle amplitude**: balanced radial motion (waveform reduced, particles increased)

### Changed — Round 8 (initial)

- Spectrum: wider bars, attack/release smoothing, reduced Additive overexposure, slow ring rotation
- Polar: thicker radial petals, center hub + ripple ring, oblique camera, beat-driven rotation
- Particles: rewritten from random noise to **orbital band layout** (later replaced by pure point cloud in hotfix above)
- Quality: lower particle counts and Bloom strength for clearer bars

## [0.7.0] - 2026-06-03 — Round 7

- Visual unification: waveform additive double-line + glow rings; particle brighten + center/floor glow + idle drift
- [`modeProfiles.ts`](src/render/modeProfiles.ts): per-mode fog, Bloom, and camera presets
- **Polar mode** (`PolarSpectrum`): top-down polar spectrum with petal-shaped radial bars
- Shortcuts: `1–4` switch visualizer, `Shift+4/5/6` switch theme

## [0.6.0] - 2026-06-02 — Round 6

- Spectrum: cap highlights, log bass freq mapping, beat brightness pulse
- Controls: glass panel, max-width centering, empty-state spacing, recording indicator
- Product: `demo.wav` generation script, beat sensitivity slider, presets include loop/analyser
- Tests: Vitest coverage for `normalizeSettings` whitelist

## Earlier rounds (summary)

- **Round 5**: Control layout reorganization, spectrum visibility fixes
- **Round 4**: Video recording, PWA, named presets, performance polish
- **Round 3**: Bug fixes, URL params, help overlay, demo audio, quality depth
- **Round 2**: Bloom post-processing, BeatDetector, shader upgrades, screenshot/fullscreen
- **Round 1**: AudioEngine stability, settings persistence, themes, keyboard shortcuts
- **Initial**: Vite + TypeScript + Three.js MVP with spectrum, waveform, and particles
