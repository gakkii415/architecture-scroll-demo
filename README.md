# INWARD — Architectural scroll study

Short mobile-first scroll journey through three separately moving photographic planes.

## Experience

- Near doorway accelerates, expands, and passes outside the viewport.
- Inner portal moves at a different rate, covering and revealing typography.
- Courtyard slowly approaches as foreground architecture clears.
- Native scrolling, reversible motion, replay, and reduced-motion support.
- Approximately 2.6 screen-heights of scroll travel; no external runtime dependencies.

`dist/` is the self-contained site. GitHub Pages root `index.html` opens it. Images are bundled, not hotlinked. AI-generated imaginary architecture; no factual architectural claims.

## Validation

JavaScript syntax checked; deterministic progress checks cover 0%, 15%, 40%, 70%, 100%, reverse scrolling, reduced motion and replay. Asset paths and image decoding checked. Not tested on a physical iPhone or through live browser visual QA.

Created via `gakkii415/repository-creator`.
