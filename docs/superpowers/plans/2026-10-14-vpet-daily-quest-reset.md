# V-Pet Daily Quest Midnight Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh daily quest status at each local midnight even when the V-Pet screen remains open.

**Architecture:** Keep completion records keyed by local date and preserve them as history. Add a pure shared helper for time remaining to the next local midnight; the V-Pet page schedules one timeout at that boundary and refreshes its active date key. EXP and levels remain cumulative and are never reset.

**Tech Stack:** React 19, Node test runner, existing local date utilities.

**Spec:** `docs/superpowers/specs/2026-10-13-pond-activity-gamification-design.md`.

## Global Constraints

- Use the browser's local calendar date, matching `localDateKey()` and the current quest keys.
- At local midnight, yesterday's rows become unchecked for the new date while old completion records remain stored.
- A new daily claim can award +10 EXP per assigned pet once for the new date; level and EXP balances remain cumulative.
- The monthly quest remains keyed to local calendar month and can refresh on the same midnight rerender.
- Do not reset localStorage, delete quest history, change account points, or modify IoT telemetry/thresholds.

## Review Focus

- A page left open across midnight updates the checkboxes without requiring navigation or an online sensor.
- A completion from yesterday remains visible in history but does not mark today's quest done.
- A new-day claim awards EXP once; repeated claims on that date remain idempotent.
- Local midnight scheduling remains correct for variable day lengths such as daylight-saving transitions.

---

### Task 1: Tests for date boundary and checklist rollover

**Files:**
- Modify: `tests/v-pet/pet-quests.test.mjs`

- [x] Test the next-local-midnight delay just before midnight and midday.
- [x] Test that a yesterday completion remains stored but the same quest appears unchecked for today's local date.
- [x] Run focused tests and confirm failure is due to the missing midnight-delay helper.

### Task 2: Shared local-time helper and V-Pet refresh

**Files:**
- Modify: `src/shared/model/localDate.js`
- Modify: `src/v-pet/pages/VPet.jsx`

- [x] Add `millisecondsUntilNextLocalMidnight(date)` using local `Date.setHours(24, 0, 0, 0)` so DST-length days are handled.
- [x] Schedule a timeout in V-Pet that updates the active daily quest date at local midnight and reschedules itself; clean up the timer on unmount.
- [x] Use the active date key in `dailyQuestChecklist`; leave stored completions and EXP untouched.
- [x] Clarify UI copy that quests reset daily while EXP/levels accumulate.
- [x] Run focused tests and verify they pass.

### Task 3: End-to-end and project verification

**Files:**
- Temporary only: `tests/v-pet/daily-reset-preview.html`, `tests/v-pet/daily-reset-preview.jsx`

- [x] Use a browser harness with a controlled local clock to complete a quest just before midnight, advance past midnight, and verify the checkbox resets while the old completion remains in storage.
- [x] Claim that quest again on the next local date and confirm EXP increases once more, with farm points unchanged.
- [x] Run `npm run test:vpet`, Oxlint, and the Vite production build.
- [x] Remove the temporary harness and verify none remains.
