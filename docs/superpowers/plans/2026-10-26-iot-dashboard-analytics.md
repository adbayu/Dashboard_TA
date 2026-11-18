# IoT Dashboard Analytics Implementation Plan

> **For agentic workers:** Follow the approved spec and use test-first implementation. Treat the browser visual reviews during implementation as required checkpoints.

**Goal:** Add a chart view of the existing 14-day simulated pH, water-temperature, and TDS history to the main JagoFarm dashboard, retain the history table, and visually align the existing Pilot line charts.

**Architecture:** A pure dashboard model turns area-scoped stored readings into chronological chart points with threshold status. A focused dashboard chart component renders one chart per metric, while the existing table stays intact. A shared Chart.js presentation component supplies common axis, grid, tooltip, and responsive behavior to the SmartDashboard and Pilot charts; the Pilot data and access path remain unchanged.

**Tech Stack:** React 19, Vite 8, Chart.js 4, react-chartjs-2, Tailwind CSS 3, Node.js `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-26-iot-dashboard-analytics-design.md`

## Global Constraints

- Main Dashboard `/` uses temporary local simulator readings, stored by area at 30-minute intervals; label them as simulated, not hardware telemetry.
- Show the latest 14 local calendar dates; do not invent missing readings or fill gaps with zero.
- Use `areasSaya` for area access and the existing `ambangUntuk` helper for thresholds.
- Keep history area-scoped; do not claim per-device attribution where several devices share a metric in one area.
- Preserve the current table and cards. Do not change the simulator, Pilot API, database schema, or device access controls.
- SmartDashboard charts must follow its light and dark theme. Pilot currently has a light-only theme; align its chart to the JagoFarm palette without adding a Pilot dark theme.
- Below 640px, use a 64px SmartDashboard icon rail and match the content offset; show compact visible labels and retain full accessible names. Keep existing full sidebar widths at 640px and above.
- Do not add sales, funnel, or unsupported business metrics.
- Do not commit or push feature code without the user's explicit instruction.

## Review Focus

- No accessible sensor areas: keep the existing empty state; never substitute seed data from another user's area.
- Missing readings: preserve null chart points as gaps, not zero; tooltip states that the reading is unavailable.
- Threshold boundaries: values equal to either inclusive bound are `dalam`; only values below/above are `bawah`/`atas`; absent thresholds produce no safe/unsafe claim.
- Time ordering and local dates: points remain chronological and labels use the source's local `at`/date-time values, including when stored rows arrive out of order.
- Area changes: when the user's accessible sensor areas change, the chart selection must remain valid and must not retain an inaccessible area ID.

---

### Task 1: Build the area-scoped sensor history transform

**Files:**
- Create: `src/dashboard/model/sensorHistoryChart.js`
- Test: `tests/dashboard/sensor-history-chart.test.mjs`

**Interfaces:**
- Produces `buildSensorPoints(readings, areaId, metricKey, dateKeys)`, returning chronological `{ at, value }` points. `value` is a finite number or `null`; threshold classification remains in the existing `nilaiTerhadapAmbang` helper.
- Accepts the 14 date keys from `historiArea(areaId, 14)` so legacy rows outside the visible period do not extend the graph.

- [ ] **Step 1: Write tests first**

Add test cases for area isolation, chronological ordering, the 14-date window, and null/missing metric values. Include boundary tests for the existing `nilaiTerhadapAmbang` helper: lower and upper bounds are `dalam`, a value below is `bawah`, a value above is `atas`, and a missing threshold returns `null`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --import tsx --test tests/dashboard/sensor-history-chart.test.mjs`
Expected: FAIL because the transform module is not implemented.

- [ ] **Step 3: Implement `buildSensorPoints`**

Read `at` when valid, otherwise compose the existing `tanggal` and `jam` fields. Filter by area and selected dates, sort chronologically, and retain `null`, empty, or non-finite values as `null`; leave threshold classification to `nilaiTerhadapAmbang` in the chart tooltip.

- [ ] **Step 4: Re-run the focused test**

Run: `node --import tsx --test tests/dashboard/sensor-history-chart.test.mjs`
Expected: PASS for all cases.

### Task 2: Add the SmartDashboard chart/table experience

**Files:**
- Create: `src/shared/components/TelemetryLineChart.jsx`
- Create: `src/dashboard/components/SensorHistoryCharts.jsx`
- Create: `src/dashboard/components/SensorHistorySection.jsx`
- Modify: `src/dashboard/pages/Dashboard.jsx`
- Modify: `src/app/SmartApp.jsx`
- Modify: `src/app/layout/SmartSidebar.jsx`
- Test: `tests/dashboard/sensor-history-chart.test.mjs` (extend only for pure chart-data behavior)

**Interfaces:**
- `TelemetryLineChart` accepts `ariaLabel`, `labels`, `datasets`, `palette`, `height`, `yAxisLabel`, `tooltipTitle`, and `tooltipLabel`; it owns Chart.js registration and shared axis/grid/tooltip defaults. Dashboard callers provide palette values from JagoFarm theme tokens; Pilot callers use the existing light-theme palette.
- `SensorHistoryCharts` accepts the selected area, raw readings, devices, categories, and 14-day summary; it renders pH, suhu air, and TDS panels using `buildSensorPoints`.
- `SensorHistorySection` owns the Grafik/Tabel toggle and accessible-area selection; it is rendered before the Dashboard summary cards.

- [ ] **Step 1: Implement the shared line-chart presentation**

Register the Chart.js category/linear scales, point/line elements, tooltip, and legend in one shared component. Use responsive sizing, disabled animation, readable date ticks, and theme-derived text/grid colors.

- [ ] **Step 2: Implement the three metric panels**

Use `METRIC_KEYS`, `METRIC_META`, `ambangUntuk`, `nilaiTerhadapAmbang`, and `buildSensorPoints`. Draw each available lower/upper threshold as a dashed reference line, use separate unit axes, expose the timestamp, value, unit, and threshold status in the tooltip, and show an empty state for a metric with no history.

- [ ] **Step 3: Wire the controls into Dashboard**

Add an accessible `Grafik`/`Tabel` toggle with Grafik selected initially. In chart mode, show an area selector only when more than one sensor-enabled accessible area exists. Apply area selection to charts only; preserve the current table's all-accessible-area summary. Keep current cards and empty states unchanged. Add the temporary-simulator label above the charts. At widths below 640px, collapse the SmartSidebar to a 64px icon rail and set the matching main offset; keep labels available to assistive technology and expose each label as a tooltip title.

- [ ] **Step 4: Inspect the first browser visual checkpoint**

Run the local Vite app and inspect `/` in light and dark themes at desktop and narrow widths. Check chart contrast, tooltip readability, toggle behavior, area filtering, and whether the 14-day data looks chronological. Correct any visual mismatch before moving to Pilot styling.

### Task 3: Align the existing Pilot chart appearance

**Files:**
- Modify: `src/pilot/PilotApp.jsx`
- Modify: `src/pilot/styles/pilot.css`
- Reuse: `src/shared/components/TelemetryLineChart.jsx`

**Interfaces:**
- Pilot chart continues to receive the same per-device history rows and sensor unit from its existing API response.
- Shared chart styling changes presentation only; no API call, pagination, tenant/access filter, or database behavior changes.

- [ ] **Step 1: Replace the Pilot page's direct Line rendering with the shared chart component**

Preserve the same per-device series and full measurement timestamps in the tooltip/table. Use compact day-month labels on the x-axis; keep the Pilot surface light-only and align its line, grid, axis, tooltip, and typography with the main dashboard.

- [ ] **Step 2: Adjust Pilot chart container CSS**

Keep the existing responsive sensor grid and 220px chart height unless browser inspection shows a concrete layout problem; do not change unrelated Pilot styles.

- [ ] **Step 3: Inspect the second browser visual checkpoint**

Verify the Pilot chart on an available authorized local session. If no authorized session is available, do not bypass authentication or seed a database; verify the build and report the browser-verification limitation.

### Task 4: Run regression and responsive verification

**Files:**
- No additional source files unless a failing verification exposes a specific defect.

- [ ] **Step 1: Run focused model tests**

Run: `node --import tsx --test tests/dashboard/sensor-history-chart.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run project checks**

Run: `npm run typecheck`
Run: `npm run test:vpet`
Run: `npm run cek:aset`
Run: `npx --no-install oxlint src server tests`
Run: `node node_modules/vite/bin/vite.js build`
Expected: exit code 0 for each command; report existing warnings without hiding them.

- [ ] **Step 3: Verify Dashboard behavior in a real browser**

At `/`, confirm chart/table toggle, area filtering, simulator label, tooltips, null gaps, and threshold status. Test 375px, 768px, and 1262px widths in light and dark themes; after horizontal scroll attempt, `window.scrollX` must remain 0.

- [ ] **Step 4: Verify changed routes and runtime errors**

Check `/` and, when an authorized session is available, `/pilot` for runtime errors and horizontal overflow. Confirm the table remains available and unchanged in data scope.

---

## Review Checkpoint

Review this plan before implementation and choose an execution method. Native is recommended: the chart data model, Dashboard UI, and Pilot chart presentation share one visual feedback loop, so one implementation pass will be easier to verify. Subagent-driven execution is also possible, with a fresh implementer and reviewer for each task. Keep the user updated at the two visual checkpoints. Do not commit or push implementation files without explicit instruction.
