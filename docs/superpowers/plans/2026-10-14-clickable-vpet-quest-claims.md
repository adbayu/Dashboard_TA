# Clickable V-Pet Quest Claims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users claim an unchecked daily or monthly V-Pet quest by clicking its checkbox, granting +10 EXP once per pond and period.

**Architecture:** Add a pure claim transition in `pondActivityState.js` that records `sourceType: 'manual-checkbox'` in the existing quest-completion array and awards EXP through `applyPetExperience`. The checkbox calls one SmartStore action; this manual claim adds no farm points and does not fabricate a pond-activity event. Existing valid activity completion remains idempotent against a manual claim.

**Tech Stack:** React 19, Vite, Node test runner, existing localStorage SmartStore.

**Spec:** `docs/superpowers/specs/2026-10-13-pond-activity-gamification-design.md` (user-requested amendment: unchecked quest boxes claim EXP when clicked).

## Global Constraints

- Daily completion key: quest ID + pond ID + local date.
- Monthly completion key: quest ID + pond ID + local `YYYY-MM` key.
- Reward: +10 EXP per pet currently assigned to the selected pond, once per quest period.
- Manual checkbox claims add no account points and no fake `pondActivityEvents`.
- Preserve existing activity-based completion, EXP totals, level thresholds, and localStorage data.
- Do not change pH/temperature/TDS telemetry, thresholds, or automatic sensor handling.
- Work only in the relevant V-Pet, shared-store, and quest documentation files; do not commit or push.

## Review Focus

- Repeated clicks and activity events must not award duplicate EXP in the same period.
- A user cannot claim a quest for an inaccessible or non-pond area.
- Manual claims must not create account points or make Gamifikasi activity missions appear completed.
- Daily claims reset on the next local date; monthly claims reset on the next local calendar month.
- EXP must pass through existing progression logic, including level-up carryover.

---

### Task 1: Write failing claim tests

**Files:**
- Modify: `tests/gamifikasi/pond-activity-state.test.mjs`
- Modify: `tests/v-pet/pet-quests.test.mjs`

- [x] Test an unchecked daily quest claim awards +10 EXP to every assigned pond pet, records `sourceType: 'manual-checkbox'`, and leaves account points/activity events unchanged.
- [x] Test monthly claims once per pond/month, same-period repeat gives zero EXP, and a new period can be claimed.
- [x] Test inaccessible, non-pond, invalid-period, and backdated claims do not mutate state.
- [x] Test a manual claim and an activity completion cannot both award the same quest/period.
- [x] Run focused tests and confirm failure is caused by the missing claim transition/source metadata.

### Task 2: Implement the pure claim transition

**Files:**
- Modify: `src/v-pet/model/petQuests.js`
- Modify: `src/shared/store/pondActivityState.js`

**Interface:** `applyPetQuestClaim(state, { userId, areaId, questId, period, date, today, monthKey, sourceEventId, at }) -> { state, completed, reason, xpAwarded, completion }`.

- [x] Add optional completion `sourceType` to daily/monthly completion helpers, defaulting existing activity calls to `activity`.
- [x] Implement `applyPetQuestClaim`; validate access, pond type, current local period, quest definition, and pet recipients.
- [x] Award `completion.expPerPet` to each recorded recipient and add a pet journal entry; preserve unrelated state and points.
- [x] Run focused tests and confirm they pass.

### Task 3: Wire checkbox clicks to SmartStore

**Files:**
- Modify: `src/shared/store/SmartStore.jsx`
- Modify: `src/v-pet/pages/VPet.jsx`
- Modify: `src/kelola-area/pages/AreaDetail.jsx`

- [x] Add `claimPetQuest(questId, areaId, period)` using local date/month and an actor-specific source ID.
- [x] Make unchecked daily/monthly checkbox inputs clickable; checked rows remain disabled and cannot be reversed.
- [x] Clarify in the UI that clicking an unchecked box claims +10 EXP; clicking does not add farm points.
- [x] Clarify the AreaDetail physical-cleaning form remains an activity/history record and shares the same once-per-month reward guard.

### Task 4: Update specification and verify

**Files:**
- Modify: `docs/superpowers/specs/2026-10-13-pond-activity-gamification-design.md`
- Modify: `src/v-pet/README.md`

- [x] Document manual checkbox claims and the `manual-checkbox` completion source.
- [x] Run focused tests and `npm run test:vpet`.
- [x] Run Oxlint and Vite production build.
- [x] Browser-test daily and monthly checkbox click, immediate EXP change, disabled checked state, same-period idempotency, and no point/activity-event increase.
- [x] Remove temporary browser harness files and confirm none remain.
