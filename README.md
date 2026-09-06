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

## ORBIT — real 3D companion (v2)

Open `dist/orbit/` for a Three.js + GSAP ScrollTrigger journey. The existing INWARD route is unchanged.

Locally bundled Solar System Scope Earth day/night/cloud and Moon textures (CC BY 4.0), with credits at `dist/orbit/credits.html`. Original sources: https://www.solarsystemscope.com/textures/ . Textures converted to WebP; cinematic scale, not a scientific simulation.

The camera follows a curved 3D path past the Moon and around Earth. GLSL day/night lighting, a separate cloud shell and an atmospheric limb replace the previous flat image-plane technique. Text lies behind the alpha canvas so the actual geometry occludes it. Rendering is on demand; pixel ratio is capped at 1.5; reduced motion keeps the camera stationary.

Validation: vendor/module syntax and import check; all local asset references checked; 1,001 camera-path samples confirm the camera remains outside Earth and Moon. Live browser and physical-device testing not performed.
