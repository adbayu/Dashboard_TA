# Monthly Pond-Cleaning Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add one monthly V-Pet quest for manually recorded physical pond cleaning.

**Architecture:** Reuse the shared pond activity event and pet quest-completion records. The AreaDetail page records a real cleaning event; shared-state logic completes the quest once per pond and local calendar month and awards +10 EXP to every pet assigned to that pond. V-Pet detail shows a read-only monthly checklist beside the daily checklist.

**Tech Stack:** React 19, Vite 8, JavaScript ES modules, Node built-in test runner; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-pond-activity-gamification-design.md` plus the user's request to add monthly pond cleaning.

## Global Constraints

- Keep source in `src/v-pet/`, `src/gamifikasi/`, `src/shared/`, and `src/kelola-area/` only for the required manual cleaning form.
- The monthly quest is distinct from the pet's daily `Bersihkan` action; only a saved physical pond-cleaning record can complete it.
- Use the local calendar month key `YYYY-MM`; a quest completes once per `questId + areaId + monthKey`.
- A completion awards +10 EXP to every pet assigned to the accessible pond; monthly quest rewards do not grant account points.
- Preserve localStorage, points, pet XP/levels, and existing daily quest history; add no backend or database migration.
- Do not change sensor readings, thresholds, telemetry, simulator, or pet sensor reactions.
- Do not commit or push the pre-existing uncommitted workspace changes.

## Review Focus

- Duplicate cleaning records in one month must not grant duplicate EXP, while the next month may grant again.
- A cleaning event on another pond must not complete the current pond's monthly quest.
- A valid pond event awards all assigned pets, including pets owned by another user; an inaccessible or non-pond area awards none.
- The monthly event must not trigger a daily quest or account points.
- Existing daily quest rows/status must remain unchanged when monthly completions are persisted in the shared completion array.

---

### Task 1: Monthly quest/date model

**Files:**
- Modify: `src/shared/model/localDate.js`
- Modify: `src/v-pet/model/petQuests.js`
- Modify: `tests/v-pet/pet-quests.test.mjs`

**Interfaces:**
- `localMonthKey(date = new Date()) -> string`: local `YYYY-MM` key.
- `MONTHLY_POND_QUEST`: `{ id: 'monthly-pond-cleaning', title: 'Pembersihan area kolam ikan', activityCode: 'pond-cleaning', exp: 10, cadence: 'monthly' }`.
- `monthlyQuestChecklist(completions, areaId, monthKey) -> QuestRow[]`.
- `completeMonthlyQuest(completions, { areaId, monthKey, date, sourceEventId, petIds }) -> { completions, completed, completion }`; dedupe on quest ID, pond ID, and month key.

- [x] **Step 1: Write failing tests**
  - Monthly checklist starts unchecked and becomes checked from the matching month completion only.
  - One completion records all assigned pet IDs and grants `expPerPet: 10`.
  - Repeating in the same pond/month is idempotent; another pond or month can complete independently.
  - A daily completion with the same area/date does not affect monthly status.
  - `localMonthKey()` returns the local `YYYY-MM` key and rolls over at a new month.

- [x] **Step 2: Run focused tests and confirm they fail**
  - Run: `node --test tests/v-pet/pet-quests.test.mjs`

- [x] **Step 3: Implement the monthly quest model and local month helper**
  - Keep monthly completion records in `petQuestCompletions`; include `monthKey`, actual local completion `date`, `period: 'monthly'`, `petIds`, and `expPerPet`.

- [x] **Step 4: Run focused tests and confirm they pass**
  - Run: `node --test tests/v-pet/pet-quests.test.mjs`

### Task 2: Shared activity transition and state tests

**Files:**
- Modify: `src/shared/store/pondActivityState.js`
- Modify: `tests/gamifikasi/pond-activity-state.test.mjs`

**Interfaces:**
- `applyPondActivity(state, { activityCode: 'pond-cleaning', areaId, date, today, monthKey, sourceId, note })` records an activity event, completes the monthly quest if eligible, awards EXP once, and returns monthly completion/repeat IDs with the transition result.

- [x] **Step 1: Write failing transition tests**
  - A saved `pond-cleaning` event completes the monthly quest, stores the note/event, awards +10 EXP to all pets in that pond, and awards no account points.
  - A second cleaning event in the same month is saved but grants no additional EXP.
  - A different pond or next month can complete independently.
  - Unauthorized users and non-pond areas do not save reward events or EXP.
  - The event does not complete any daily quest.

- [x] **Step 2: Run the transition test and confirm it fails**
  - Run: `node --test tests/gamifikasi/pond-activity-state.test.mjs`

- [x] **Step 3: Implement monthly processing in `applyPondActivity`**
  - Preserve existing daily processing and event idempotency; use the monthly completion helper only for `pond-cleaning`.
  - Append the quest reward to each pet journal and carry monthly completion/repeat IDs in the event feedback.

- [x] **Step 4: Run focused tests and confirm they pass**
  - Run: `node --test tests/v-pet/pet-quests.test.mjs tests/gamifikasi/pond-activity-state.test.mjs`

### Task 3: Manual cleaning form and monthly checklist UI

**Files:**
- Modify: `src/shared/store/SmartStore.jsx`
- Modify: `src/kelola-area/pages/AreaDetail.jsx`
- Modify: `src/v-pet/pages/VPet.jsx`
- Modify: `src/shared/store/pondActivityState.js` (event label/note, if needed)
- Modify: `src/v-pet/README.md`
- Modify: `src/gamifikasi/README.md` only if its event model description needs updating

- [x] **Step 1: Add `catatPembersihanKolam(areaId, note)` to SmartStore**
  - Record the action through `applyPondActivity` with a unique source ID, current local date/month, user, area, and optional note.
  - Do not map this event to an account point rule.

- [x] **Step 2: Add the manual physical-cleaning record form to AreaDetail**
  - Show only for `kolam`; label it as a physical pond-cleaning log, distinct from pet care.
  - Display the current month's status and recent cleaning records; keep repeated records valid but reward only once monthly.

- [x] **Step 3: Render the read-only monthly checkbox in V-Pet detail**
  - Show “Pembersihan area kolam ikan”, “+10 EXP per pet”, and current-month checked status.
  - Extend toast feedback to say “selesai bulan ini” on a repeat; keep the daily checklist and its messages unchanged.

- [x] **Step 4: Update feature READMEs**

### Task 4: Verify tests, build, lint, and browser behavior

- [x] **Step 1: Run `npm run test:vpet`**
  - Expected: all existing daily-quest and new monthly-quest tests pass.

- [x] **Step 2: Run lint and production build**
  - Run: `npx --no-install oxlint src/v-pet src/gamifikasi src/shared src/kelola-area/pages/AreaDetail.jsx`
  - Run: `node node_modules/vite/bin/vite.js build`
  - Expected: no new lint errors/warnings and build exits 0.

- [x] **Step 3: Verify a real local browser flow in an isolated test harness**
  - Open a pet assigned to an accessible pond; confirm monthly row begins unchecked.
  - Save a physical pond-cleaning record; confirm the monthly row checks, +10 EXP reaches every pond pet, and no account points are added.
  - Save another cleaning record in the same month; confirm the row stays checked and no additional EXP is added.
  - Confirm a daily pet `Bersihkan` action does not complete this monthly quest.
  - Remove the temporary harness and leave the existing dev server running as it was.
