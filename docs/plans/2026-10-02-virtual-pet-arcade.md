# Virtual Pet Arcade Redesign Implementation Plan

> Execute the approved redesign in the existing Dashboard_TA V-Pet module only.

**Goal:** Replace the five pet illustrations with editable, individually layered 2D arcade-style fish/animal assets and animate swimming and reactions.

**Architecture:** Keep the existing React asset discovery and stage. Place SVG parts in per-species directories and render each selected species using one composed SVG image assembled from its parts or a minimal per-species layer map. Add CSS motion for tail/fins and body, with reduced-motion support. Preserve status reactions, face anchors, accessories and saved species names.

**Tech Stack:** Vite 8, React 19, SVG, CSS; no new dependencies.

---

### Task 1: Define and validate modular character assets

**Files:** `src/assets/v-pet/karakter/<species>/*.svg`, `scripts/cek-aset.py`

- Inspect the asset validator's assumptions, then extend only as needed to permit per-species SVG folders and validate required layers for all five species.
- Create independent SVG parts per animal: body, tail, fins/limbs, eyes/face details as applicable. Keep an original arcade-cartoon style, 240x160 composition coordinates, clean outlines and accessible forms.
- Run `npm run cek:aset`; correct XML, naming, sizing, and missing layers before integration.

### Task 2: Compose species-specific layers in the existing pet stage

**Files:** `src/components/PetKarakter.jsx`, optional `src/components/pet/` helpers

- Adapt glob discovery to nested folders without changing existing expression/accessory/latar lookup.
- Compose all five known species with species-to-layer metadata; keep `kunciKarakter` output stable.
- Keep face anchors valid. Existing accessory and expression overlay rendering remains intact.
- Verify each species selection and missing-asset fallback.

### Task 3: Add swimming and reaction motion

**Files:** `src/pet.css`, relevant SVG parts

- Animate tail and fin layers with small species-appropriate motion plus gentle body drift.
- Retain existing sikap classes; coordinate their animation with the new layer motion to avoid transform conflicts.
- Keep motion bounded within the stage and disable all decorative motion under `prefers-reduced-motion: reduce`.

### Task 4: Document assets and verify integration

**Files:** `src/assets/v-pet/README.md`

- Document the per-species folder and layer naming conventions so individual SVG parts can be edited in Antigravity.
- Run `npm run cek:aset`, Vite build via `node node_modules/vite/bin/vite.js build`, and targeted `npx --no-install oxlint src`.
- Browser-check all five species, expression/accessory alignment, animation, reduced-motion, and runtime console errors.
- Do not push to remote.
