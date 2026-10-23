# Dark Mode Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dark mode calmer, more legible, and visually consistent across shared cards, controls, and V-Pet progression.

**Architecture:** Keep the existing forest-green identity and light theme. Strengthen the dark surface hierarchy in shared CSS, replace primary-button glow with a matte green fill and clear edge, and improve shared progress bars. Give the V-Pet EXP meter its own inset surface so the level progression reads as a distinct component.

**Tech Stack:** Existing React/Tailwind shared UI, CSS variables, browser verification.

**Spec:** User-provided dark-mode screenshots and request in this conversation.

## Global Constraints

- Preserve the forest-green brand and all light-mode styles.
- Remove bright glow only in dark mode; keep clear button affordance, hover, focus, and disabled states.
- Maintain readable text and non-text contrast; verify the changed pairings rather than relying on appearance alone.
- Keep pH/temperature/TDS values, thresholds, sensor reactions, and point/EXP logic unchanged.
- Do not change data, add dependencies, or commit/push.

## Review Focus

- Primary button text stays readable and the button remains visually distinct without a neon halo.
- Cards, panels, and inputs form clear but restrained dark-surface layers.
- V-Pet EXP fill contrasts with its track and is separated from surrounding content.
- Other status bars, badges, focus states, and light mode remain usable.
- Layout still fits the screenshot's desktop view and narrow screens.

---

### Task 1: Shared dark surfaces and controls

**Files:**
- Modify: `src/app/styles/index.css`
- Modify: `src/shared/components/ui.jsx`

- [x] Make dark cards/panels more opaque with stronger neutral borders and restrained black shadows; remove green hover halos in dark mode.
- [x] Make dark inputs distinct from cards without adding bright glow.
- [x] Style dark primary buttons with a calm green fill, visible edge, and no emerald glow; soften neon-green soft buttons/badges.
- [x] Improve shared progress tracks/fills for dark mode without changing semantic warning/error colors or light styles.

### Task 2: V-Pet EXP hierarchy

**Files:**
- Modify: `src/v-pet/pages/VPet.jsx`

- [x] Place the EXP label, value, progress bar, and reward explanation in a distinct inset panel.
- [x] Preserve existing level math and quest rewards.

### Task 3: Verify appearance and regressions

- [x] Browser-check the actual AreaDetail and V-Pet screens in dark mode; confirm no primary-button bloom and clear EXP-card/bar separation.
- [x] Check light mode and viewport widths 375, 750, and 1262; confirm no new overflow.
- [x] Measure selected text/control contrast pairings with the contrast checker.
- [x] Run `npm run test:vpet`, Oxlint, production build, and `git diff --check`.
- [x] Inspect final screenshots and remove temporary harness files.

## Verification Notes

- At 1903, 1414, 1262, and 750 px, AreaDetail and V-Pet had no horizontal overflow across 8 route/width checks. At 375 px, the V-Pet detail modal stayed within the 360 px content viewport (left 16, right 344); the EXP row wrapped without clipping.
- Existing 375 px content overflow remains in both themes outside the EXP modal: AreaDetail summary values and V-Pet collection cards extend beyond the visible content column. The same elements overflow in light mode; this dark-mode pass did not change their layout.
- Contrast checks: white on primary action #327F5B = 4.86:1; primary fill vs card #212824 = 3.10:1; EXP mint #95D4B3 vs track #0C100E = 11.26:1; primary text #E9EEE9 vs card = 12.83:1; secondary text #B8C4BA vs card = 8.35:1; focus mint #95D4B3 vs input #1A201C = 9.74:1.
- Light-mode primary button/card/input styles stayed unchanged; light progress track remains 8 px and the EXP panel remains unboxed.
