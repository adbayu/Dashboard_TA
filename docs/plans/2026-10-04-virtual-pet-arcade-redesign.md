# V-Pet Arcade Character Redesign Implementation Plan

> **For Hermes:** Use subagent-driven-development to implement the asset task, then integrate and verify each task.

**Goal:** Redraw five original arcade-inspired virtual pets in editable per-species folders and show clear continuous swimming animation without crop or detached facial overlays.

**Architecture:** Add independent SVG layers under `src/assets/v-pet/karakter-arcade/<species>/`. Extend the existing V-Pet layer loader to render those layers, keep expressions/accessories aligned against a documented shared canvas, and separate swimming path transforms from pose transforms. Keep the old asset tree available until the new art is browser-verified.

**Tech Stack:** React 19, Vite 8, SVG, CSS; no new package dependencies.

---

### Task 1: Create the five original modular character asset sets

**Objective:** Draw distinct, polished, complete silhouettes for nila, mas, lele, gurame, and udang as editable SVG parts.

**Files:**
- Create: `src/assets/v-pet/karakter-arcade/{nila,mas,lele,gurame,udang}/{tail,fins,body,details}.svg`
- Test: `scripts/cek-aset.py`
- Reference: approved `docs/superpowers/specs/2026-10-04-virtual-pet-arcade-redesign.md` and supplied user screenshot

**Steps:**
1. Add asset checker coverage for nested `karakter-arcade/<species>` folders and required layer files; run `npm run cek:aset` and confirm it fails because new files are absent.
2. Draw independent 240x160 SVG body/tail/fins/details for each species, with a confident readable silhouette, bright species-specific palette, dark coherent outline, light/shadow shapes and original features. Keep eyes/mouth expressions compatible with an explicit per-species face anchor; udang gets shrimp anatomy instead of a fish silhouette.
3. Run `npm run cek:aset`; expected: all nested SVG XML parses, all required layers exist, each has the declared viewBox.

### Task 2: Load and compose the new art in the V-Pet stage

**Objective:** Switch species render to the new folder while preserving existing data keys and behaviors.

**Files:** `src/components/PetKarakter.jsx`, `scripts/cek-aset.py`

**Steps:**
1. Add nested glob mapping for `karakter-arcade/<species>/<part>.svg`; do not merge these with the old `karakter/` fallback map.
2. Render tail, rear fins, body, front fins/details in explicit z-order; add a dedicated face layer or correctly anchored existing expressions. Keep accessory attached to the head and retain graceful fallback.
3. Make the default stage composition use a bounded, responsive whole-character canvas with enough open water for a horizontal swim path; do not clip the character at the lower edge.
4. Exercise each species key and check that all layers load and the expression/accessory bounds overlap the intended body area.

### Task 3: Implement visible swim path and face motion

**Objective:** Make motion unmistakable under normal settings while preserving accessible reduced-motion behavior.

**Files:** `src/components/PetKarakter.jsx`, `src/pet.css`

**Steps:**
1. Add separate wrapper elements/classes for path movement, pose movement, and independently animated tail/fins; do not stack conflicting transform animations on the same node.
2. Animate the complete pet across the stage and reverse its facing at the turn; account for character width so neither direction clips. Add broad tail/fins beats, a slow bob, and occasional blink using an isolated eyelid/eye detail layer.
3. Keep health/sikap motion subtle and avoid covering the character with the speech bubble, level badge, or accessory.
4. Verify computed animation names and changed transforms across samples with `prefers-reduced-motion: no-preference`; verify all motion stops and the pet remains fully visible with `reduce`.

### Task 4: Document, run checks, and verify real browser output

**Objective:** Ensure the files are easy to edit in Antigravity and the actual V-Pet page matches acceptance criteria.

**Files:** `src/assets/v-pet/README.md`, `scripts/cek-aset.py`, affected component/styles

**Steps:**
1. Document the distinct `karakter-arcade` folder, layer names, canvas dimensions, face anchors, and animation controls.
2. Run `npm run cek:aset`, `node node_modules/vite/bin/vite.js build`, and `npx --no-install oxlint src`.
3. Verify `/v-pet` in browser at desktop and narrow viewport, for all five species, with normal and reduced motion. Confirm all images load, characters remain in stage, anchors align, navigation/data remain intact, and runtime errors are absent.
4. Keep Docker services untouched and do not push to remote.
