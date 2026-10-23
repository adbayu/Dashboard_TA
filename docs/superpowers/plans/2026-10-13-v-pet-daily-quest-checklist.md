# V-Pet Daily Quest Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn pond care and manual pond records into visible daily V-Pet quests whose one-time completion awards +10 EXP, with an automatically checked checklist.

**Architecture:** Keep quest definitions and pet level math in `src/v-pet/model/`; keep point activity mapping in `src/gamifikasi/model/`; use `src/shared/store/SmartStore.jsx` only to validate and atomically persist activity, points, quest completion, and pet XP. The V-Pet detail modal renders read-only checklist controls whose state derives from persisted quest completions.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, Node built-in test runner; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-pond-activity-gamification-design.md`

## Global Constraints

- Source must stay in the user-organized feature folders: `src/v-pet/`, `src/gamifikasi/`, and `src/shared/store/`; touch `src/kelola-area/AreaDetail.jsx` only to make the harvest date default use the same local-day key as the daily quests.
- Tests belong in `tests/v-pet/`, `tests/gamifikasi/`, and `tests/kelola-area/` only when area integration changes.
- A daily quest completes once per `questId + areaId + local date`; it grants +10 EXP to every pet assigned to that pond when it completes.
- Points are separate from quest EXP and obey active point rules and per-user/per-rule daily limits.
- Automatic IoT telemetry must not complete quests or grant points/EXP; do not change sensor values, thresholds, simulator, or reactions.
- Preserve existing localStorage data, point balances, pet levels/XP, and user-edited point rules; migration is additive and non-destructive.
- Do not stage or commit pre-existing user reorganization changes; do not push.

## Review Focus

- Replaying the same source event or editing the same daily mortality row must not award duplicate points or quest EXP.
- A quest on another pond or a new local date must have independent progress.
- A daily point cap or inactive point rule must not block valid quest EXP; it only blocks account points.
- Pets without an accessible pond must not earn quest EXP; growbeds/tanks are not eligible.
- A manual monitoring record needs at least two pH/temperature/TDS fields for the water-check quest; background IoT readings never count.

---

### Task 1: Pure quest and level progression model

**Files:**
- Create: `src/v-pet/model/petQuests.js`
- Modify: `src/v-pet/model/petProgress.js`
- Create: `tests/v-pet/pet-quests.test.mjs`
- Modify: `tests/v-pet/pet-progression.test.mjs`
- Modify: `package.json` test script to include the new test

**Interfaces:**
- `PET_DAILY_QUESTS`: immutable quest definitions for `feed`, `clean`, `heal`, and manual `water-check`; event quests `mortality`/`harvest` are added only when a real event exists.
- `questIdsForActivity(activity) -> string[]`: maps actual recorded action types to quest IDs; `monitoring` only maps to `water-check` when at least two manual parameters are present; telemetry maps to no quest.
- `dailyQuestChecklist(completions, areaId, date, activityEvents) -> QuestRow[]`: returns stable quest rows with `id`, `title`, `done`, `exp`, and source-event metadata.
- `completeDailyQuest(completions, { questId, areaId, date, sourceEventId, petIds }) -> { completions, completed, completion }`: deduplicates by quest/area/date; completion holds `petIds` and `expPerPet: 10`.
- `applyPetExperience(pet, amount = 10) -> updatedPet`: advances level/stage/threshold and keeps XP remainder.
- `applyPetCare(pet, careUpdates) -> updatedPet`: changes care stats without awarding XP.

- [ ] **Step 1: Write failing quest tests**
  - `daily-quest checklist starts unchecked for the current pond/date`.
  - `completing the same quest twice for one pond/date grants only one completion`.
  - `the same quest can complete independently on another pond and on the next local date`.
  - `water-check requires at least two manual parameters and ignores telemetry`.
  - `mortality corrections share the same daily event and do not duplicate completion`.
  - `event quests appear only after an actual mortality/harvest record`.
  - `quest XP applies +10 and preserves overflow across multiple level thresholds`.
  - `care-stat updates no longer change XP directly`.

- [ ] **Step 2: Run the focused tests and confirm they fail**
  - Run: `node --test tests/v-pet/pet-quests.test.mjs tests/v-pet/pet-progression.test.mjs`
  - Expected: missing quest model/API and old care-based XP assertions fail.

- [ ] **Step 3: Implement the pure quest model and separate care-stat updates from quest XP**
  - Add exact stable quest IDs: `feed`, `clean`, `heal`, `water-check`, `mortality`, `harvest`.
  - Use local date keys and completion key `questId|areaId|date`.

- [ ] **Step 4: Run focused tests and confirm they pass**
  - Run: `node --test tests/v-pet/pet-quests.test.mjs tests/v-pet/pet-progression.test.mjs`
  - Expected: all quest, dedupe, local-date, and level-up cases pass.

### Task 2: Point rules and activity reward model

**Files:**
- Create: `src/gamifikasi/model/pondActivityRewards.js`
- Modify: `src/gamifikasi/data/seed.js`
- Create: `tests/gamifikasi/pond-activity-rewards.test.mjs`
- Modify: `package.json` test script to include the new test

**Interfaces:**
- `POINT_ACTIVITY_RULES`: maps manual activity types to stable rule IDs `R-2` (monitoring), `R-4` (care), `R-6` (harvest), and `R-7` (mortality).
- `evaluateActivityReward({ pointRules, events, userId, activityCode, date, sourceId }) -> { points, ruleId, duplicate, capped }`.
- `recordActivityEvent(events, event) -> nextEvents`: idempotent by user/source event ID.

- [ ] **Step 1: Write failing tests**
  - Existing seed rule values/caps remain unchanged for R-2/R-4/R-6.
  - R-7 defaults to 5 points and one award per user/day.
  - R-4 care actions share one daily cap across feed/clean/heal and all ponds.
  - Inactive/missing rules and exhausted caps grant no account points.
  - Duplicate source IDs never grant a second award.
  - HPP, chatbot, sensor telemetry, and play have no automatic activity-rule mapping.

- [ ] **Step 2: Run the focused tests and confirm they fail**
  - Run: `node --test tests/gamifikasi/pond-activity-rewards.test.mjs`

- [ ] **Step 3: Implement the pure rule mapping and cap/idempotency helpers**
  - Map by stable rule ID, not editable display label.
  - Count daily awards from persistent activity records, never from the 60-row display ledger.

- [ ] **Step 4: Run focused tests and confirm they pass**
  - Run: `node --test tests/gamifikasi/pond-activity-rewards.test.mjs`

### Task 3: Persist activities and apply rewards atomically in the shared store

**Files:**
- Create: `src/shared/store/pondActivityState.js`
- Modify: `src/shared/store/SmartStore.jsx`
- Modify: `src/gamifikasi/data/seed.js`
- Create: `tests/gamifikasi/pond-activity-state.test.mjs`

**Interfaces:**
- Add state fields `pondActivityEvents` and `petQuestCompletions`, defaulting to empty arrays and migrating old localStorage state without deleting saved data.
- Add R-7 only if absent; preserve existing point values, caps, and active flags.
- `applyPondActivity(state, event) -> { state, pointsAwarded, xpAwarded, completedQuestIds, duplicate }`: validate a pre-authorized pond event, record it idempotently, apply point caps, complete a quest once per pond/date, and award +10 EXP to assigned pets.
- Store actions `addMonitoring`, `catatKematian`, `addHarvest`, `feedPet`, `cleanPet`, and `healPet` call the transition in the same state update as their source record/care change.

- [ ] **Step 1: Write failing transition tests**
  - Manual monitoring with two parameters records one event, points under R-2 cap, and one water-check completion.
  - One parameter does not complete water-check.
  - Care actions use shared R-4 cap; point cap reached still permits quest EXP.
  - Same source ID and same-day mortality correction do not award again.
  - Different users' event IDs remain distinct, while the quest completion remains once per pond/date.
  - Legacy localStorage preserves balances, pet XP, and custom point-rule values; R-7 is added once and not re-added if an admin later removes it.
  - Today's harvest completes its optional quest; backdated harvest remains history-only.
  - All pets assigned to the pond, regardless of pet owner, receive +10 EXP; another pond remains unchanged.
  - Inactive/missing/inaccessible/non-pond activity does not grant automated points or EXP.

- [ ] **Step 2: Run transition tests and confirm they fail for the missing helper**
  - Run: `node --test tests/gamifikasi/pond-activity-state.test.mjs`
  - Expected: module/function missing or expected reward state absent.

- [ ] **Step 3: Implement the pure state transition and wire SmartStore actions**
  - Keep permission checks at the store boundary and sensor telemetry entirely outside the transition.
  - Add an additive localStorage migration for both arrays and the new rule.
  - Remove direct care-condition XP and play points; retain care-stat changes.
  - Make Gamifikasi mission state event-derived, with no manual mission point award.

- [ ] **Step 4: Run transition and project tests**
  - Run: `node --test tests/gamifikasi/pond-activity-state.test.mjs tests/gamifikasi/pond-activity-rewards.test.mjs tests/v-pet/pet-quests.test.mjs`
  - Run: `npm run test:vpet`
  - Expected: all focused and existing tests pass.

### Task 4: Render the daily checklist and activity-derived Gamification status

**Files:**
- Modify: `src/v-pet/pages/VPet.jsx`
- Modify: `src/gamifikasi/pages/Gamifikasi.jsx`
- Modify: `src/gamifikasi/data/seed.js`
- Modify: `src/kelola-area/pages/AreaDetail.jsx` (local harvest-date default)
- Modify: `src/v-pet/README.md`
- Modify: `src/gamifikasi/README.md`

- [ ] **Step 1: Render V-Pet checklist from the pure quest model**
  - Add the checklist inside the active pet detail, adjacent to care actions.
  - Use read-only checkbox indicators; do not let a checkbox click claim a quest.
  - Show routine quests every day; show mortality/harvest event quests only when real records exist.
  - Show completion toast and pet log update on first completion; show “reward hari ini sudah diterima” on a repeat.
  - With no accessible pond/pet, show a clear no-quest state.

- [ ] **Step 2: Align the harvest form default with the local quest date**
  - Use the shared local date key for the initial harvest date and for the post-submit reset.
  - Keep a user-selected backdated harvest as history only.

- [ ] **Step 3: Replace manual Gamifikasi mission toggles with event-derived status**
  - Keep points, badges, leaderboard, and activity ledger intact.
  - Remove HPP/chatbot as automatic reward missions; do not add a second mission bonus.

- [ ] **Step 4: Update feature READMEs to list new model and quest UI files**

### Task 5: Run complete verification and browser click-through

**Files:**
- Verify: `src/v-pet/`, `src/gamifikasi/`, `src/shared/store/SmartStore.jsx`, `tests/`

- [ ] **Step 1: Run tests**
  - Run: `npm run test:vpet`
  - Expected: all existing and new tests pass.

- [ ] **Step 2: Run lint and production build**
  - Run: `npx --no-install oxlint src/v-pet src/gamifikasi src/shared/store/SmartStore.jsx`
  - Run: `node node_modules/vite/bin/vite.js build`
  - Expected: no new lint errors; build exits 0.

- [ ] **Step 3: Verify the running V-Pet flow in an isolated browser profile**
  - Log in with the UI-provided demo card; open `/v-pet` and a pet assigned to a permitted pond.
  - Click “Bersihkan”; verify the corresponding checkbox immediately checks, EXP grows exactly +10 from the quest, and the toast names the quest.
  - Click “Bersihkan” again the same day; verify no extra quest EXP and a clear already-completed message.
  - Verify pH/suhu/TDS automatic updates do not check the water quest; create a manual monitoring record with two parameters and verify it does.
  - Verify the harvest date input defaults to the local date and a backdated harvest does not complete today's quest.
  - Verify no visual changes to sensor readings/threshold logic and no runtime errors.

**Execution note:** The working tree contains substantial pre-existing uncommitted folder reorganization. Keep all unrelated changes untouched; do not stage or commit the whole tree.