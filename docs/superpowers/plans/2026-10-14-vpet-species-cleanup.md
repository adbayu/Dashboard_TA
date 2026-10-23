# V-Pet Species Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict V-Pet pets and character art to Ikan Nila and Ikan Gurame, removing other V-Pet records and assets.

**Architecture:** Define one supported-species allowlist in V-Pet data/model code. Normalize persisted pet collections and quest recipient IDs against the surviving pet IDs while preserving Nila/Gurame records and EXP. Derive user/admin selectors from the reduced seed catalog, reject unsupported configuration, and make the asset validator reject art for other species.

**Tech Stack:** Existing React/Vite app, Node tests, Python asset validator, localStorage migration.

**Spec:** User request in this conversation.

## Global Constraints

- The only supported V-Pet species are exactly `Ikan Nila` and `Ikan Gurame`.
- Preserve all Nila/Gurame pet records, levels, EXP, care state, names, and valid locations.
- Remove persisted pet records for other species on the next normal load; retain quest-completion keys for idempotency while removing deleted pet IDs from recipient lists.
- Do not add, transform, crop, or re-encode artwork. Keep supplied Nila GIF bytes unchanged; Gurame stays on the existing plain placeholder until supplied art exists.
- Do not change pond/farm records outside V-Pet (including non-V-Pet area data), sensor thresholds, quest rules, points, or IoT logic.
- Do not commit or push.

## Review Focus

- Legacy stored Lele/Mas/Udang pets disappear without resetting Nila/Gurame progress.
- Selection falls back to a surviving pet if the selected record is removed.
- Completion period/idempotency data remains intact, with only valid recipient IDs retained.
- User/admin add and configure flows cannot create unsupported species.
- All remaining character assets belong to Nila or Gurame; sensor SVGs remain untouched.

---

### Task 1: Test species filtering and preservation

**Files:**
- Modify: `tests/v-pet/pet-model.test.mjs`
- Modify: `tests/v-pet/pet-character-levels.test.mjs`

- [x] Add a failing test that mixes saved Nila/Gurame progress with unsupported pet records and verifies only Nila/Gurame survive, allowed EXP is preserved, and selection falls back safely.
- [x] Add a failing test that filters deleted pet IDs from quest-completion recipients without deleting completion identity/period keys.
- [x] Run `npm run test:vpet` and confirm the new assertions fail for the expected existing behavior.

### Task 2: Restrict catalog and stored V-Pet data

**Files:**
- Modify: `src/v-pet/data/seed.js`
- Modify: `src/v-pet/model/petModel.js`
- Modify: `src/shared/store/SmartStore.jsx`
- Modify: `src/v-pet/pages/VPet.jsx`
- Modify: `src/kelola-virtual-pet/pages/AdminVPet.jsx`
- Modify: `tests/v-pet/pet-model.test.mjs`
- Modify: `tests/gamifikasi/pond-activity-state.test.mjs`

- [x] Add the Nila/Gurame allowlist; remove Lele/Mas/Udang from active seeds and non-migration fixtures, retaining old species only in migration tests.
- [x] Filter unsupported saved pets during normalization while preserving allowed records; normalize selected pet and compatibility alias to a surviving record.
- [x] Filter removed pet IDs from stored quest-completion recipient lists without dropping completion keys.
- [x] Reject unsupported species in store configuration actions; user/admin selector options must remain Nila/Gurame only.
- [x] Update V-Pet placeholder examples and tests to use Gurame where a second supported species is needed.

### Task 3: Remove non-allowed art and lock validator/docs

**Files:**
- Delete: `src/v-pet/assets/karakter-level/lele/*.gif`
- Modify: `src/v-pet/components/PetKarakter.jsx`
- Modify: `scripts/v-pet/cek-aset.py`
- Modify: `src/v-pet/assets/README.md`
- Modify: `src/v-pet/assets/karakter-level/README.md`
- Modify: `src/v-pet/README.md`
- Modify: `tests/v-pet/pet-character-levels.test.mjs`

- [x] Remove only non-allowed character files; preserve all Nila GIFs and sensor icons.
- [x] Restrict character-name mappings and condition-background metadata to Nila/Gurame; keep Gurame art as placeholder.
- [x] Update asset validation to reject species keys outside `nila` and `gurame`.
- [x] Remove Lele from artwork/selector fixtures and docs; retain Lele/Mas/Udang only as legacy migration-test inputs.

### Task 4: Verify migration, assets, UI, and build

- [x] Run V-Pet/gamification tests and the asset validator.
- [x] Browser-test old stored data containing Nila/Gurame plus Lele/Mas/Udang: only Nila/Gurame remain; their progress survives; selected pet falls back; quest recipient IDs are filtered.
- [x] Verify user/admin species options contain only Nila and Gurame and Gurame without supplied art uses the placeholder.
- [x] Run Oxlint, production build, and `git diff --check`; verify no non-allowed GIF remains and Nila GIF files are unchanged.
- [x] Do not modify non-V-Pet farm/pond records.
