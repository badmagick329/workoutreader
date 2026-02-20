# WorkoutReader Codebase Guide (for future agents)

## 1) What this repo is

- Root project = parser/analysis pipeline for workout logs in plain text.
- Dashboard project (`dashboard/`) = Bun server + React UI that reads the same raw data and renders analytics.
- Runtime/package manager = **bun**.

## 2) High-level flow

1. Source data is in `data/input.txt`.
2. Parser splits file into workout-day chunks by date (`YYMMDD`).
3. Each exercise line is tokenized into one or more sets.
4. Sets become `Exercise` objects.
5. Root app can export parsed rows to CSV (`data/output.csv`).
6. Dashboard server exposes parsed data at `/api/exercises`.
7. React dashboard fetches `/api/exercises` and computes selector-based analytics.

## 3) Key files

### Root parser + export

- `src/index.ts`
  - Reads `./data/input.txt`.
  - Calls `splitLinesByDate`.
  - Uses `Exercise.fromLine(...)` to parse sets.
  - Writes CSV via `writeExercisesToCsv(..., "./data/output.csv")`.
- `src/parser.ts`
  - `splitLinesByDate(text)` groups lines under `YYMMDD` keys.
  - Token parsers:
    - reps: `^\d+$`
    - weight: `^((?:\d{1,4})(?:(?:\.)(?:\d{1,4}))?)[b|w]$`
      - suffix `b` => barbell, `w` => weight stack/dumbbell.
- `src/exercise-set.ts`
  - `ExerciseSetBuilder` consumes tokens left-to-right.
  - Builds when name+weight+reps+isBarbell are all present.
  - Repeated reps after one weight produce multiple sets.
- `src/exercise.ts`
  - Domain entity.
  - Adds 20kg automatically when `isBarbell=true`.
- `src/analysis.ts`
  - Shared analysis functions (legacy progression/PR helpers + 42d rotation-quality helpers).
- `src/csv-writer.ts`
  - Robust CSV escaping + optional Excel hardening.

### Dashboard server + app

- `dashboard/src/index.tsx`
  - Bun server routes.
  - `/api/exercises` reparses source text and returns JSON array of `Exercise`.
  - Uses root parser/domain modules via relative imports (`../../src/...`).
- `dashboard/src/services/exerciseApi.ts`
  - Frontend fetch wrapper (`fetch('/api/exercises')`).
- `dashboard/src/hooks/useExercises.ts`
  - Loads exercise data once and manages loading state.
- `dashboard/src/App.tsx`
  - Tab shell: Overview / Explorer / Records.
- `dashboard/src/shared/workout-analysis.ts`
  - Re-export of root `src/analysis.ts` (single analytics source of truth).

## 4) Input file format (`data/input.txt`)

Expected structure:

- Date line: exactly 6 digits (`YYMMDD`), e.g. `251203`.
- Then exercise lines until next date.
- Tokens in exercise lines are space-separated.

Token semantics:

- Name token = anything not matching reps or weight token.
- Weight token examples:
  - `30b` => 30kg plates/load + barbell adjustment (+20) in `Exercise`.
  - `36w` => 36kg external/machine load.
- Reps token examples: `6`, `10`, `25`.

Examples:

- `bench press 30b 6 6 5`
  - one name + one weight + three rep tokens => 3 sets.
- `lateral raise 14w 6 12w 8 10`
  - first set at 14w x6, then weight changes to 12w for next reps.
- `tricep dip 6 5 5`
  - no explicit weight token; parser defaults to weight=1 and isBarbell=false once reps parsed.

## 5) Analytics behavior used by UI

- Epley estimate: `1RM = weight * (1 + reps/30)` (`src/analysis.ts`).
- Overview now uses 42d-vs-prior-42d rotation-aware analysis from `getRotationQualityMetrics(...)`.
- Window anchor = latest workout date in dataset (not system date).
- Overview metrics (`dashboard/src/features/overview/selectors/getOverviewMetrics.ts`):
  - `totalVolume`: all-time sum of `weight * reps`.
  - `qualityScore`: composite score in range 0..100.
  - `progressionScore`: exercise-level performance change score (0..100).
  - `consistencyScore`: session frequency score from current 42-day block (0..100).
  - `balanceScore`: distribution evenness across active lifts (0..100).
  - `activeExercisesCount`: unique exercises in current 42-day block.
  - `improvingCount` / `stableCount` / `decliningCount`.
  - `emergingCount`: in current block but not prior block.
  - `phasedOutCount`: in prior block but not current block.
  - `currentSessions`, `previousSessions`, `sessionsPerWeek`.
  - `currentBlockVolume`, `previousBlockVolume`, `blockVolumeDelta`.
  - `favoriteLift`: most frequent exercise in current block.
- Overview cards currently display:
  - Total Tonnage (all-time)
  - Quality Score
  - Block Momentum = `improvingCount - decliningCount`
  - Active Lifts
- Trend chart (`dashboard/src/features/overview/selectors/getStrengthScoreSeries.ts`):
  - For each workout date, computes `getRotationQualityMetrics(exercises, 42, date)`.
  - Plots `qualityScore` over time.
  - Title now reads “Quality Score Trend (42d vs prior 42d)”.
- Explorer metrics (`dashboard/src/features/explorer/selectors/getExplorerData.ts`):
  - Non-bodyweight: 1RM / max weight / volume.
  - Bodyweight: max reps / total reps (volume interpreted as reps).
- Records tab (`dashboard/src/features/records/selectors/getSortedRecords.ts`):
  - Sorted by latest PR date or exercise name.

## 6) Useful commands

From repo root:

```bash
bun install
bun run src/index.ts
```

From `dashboard/`:

```bash
bun install
bun run dev
bun run build
bun run start
```

## 7) Important implementation details / gotchas

- Date strings are compared lexicographically in many places; because format is `YYMMDD`, ordering works within same century assumptions.
- New window slicing in `src/analysis.ts` converts YYMMDD to UTC dates to avoid local timezone drift while stepping day ranges.
- Barbell sets are normalized by adding 20kg centrally in `Exercise` constructor.
- Dashboard API reparses raw text each request (no persistence/cache layer).
- Shared types in dashboard alias root class type: `ExerciseData = Exercise`.
- Input quality is permissive; blank lines are removed, and partial exercise lines may produce zero sets.
- Bodyweight exercise detection remains: max historical weight <= 1.
- In progression comparison, bodyweight lifts use max reps; loaded lifts use best estimated 1RM.
- Progress classification thresholds:
  - improving if change ratio > 1%
  - declining if change ratio < -1%
  - otherwise stable

## 8) If you need to extend this safely

- Keep parser/token semantics stable unless intentionally changing data contract.
- Prefer adding logic in root `src/analysis.ts`; dashboard should consume shared analysis to avoid divergence.
- If adding new fields to `Exercise`, update both:
  - CSV export (`src/csv-writer.ts`)
  - dashboard consumers/selectors expecting shape from `/api/exercises`.
- For feature work in dashboard, put computations in selectors first; keep components mostly presentational.

## 9) What changed in this implementation pass

- Removed hardcoded “big 3” dependency from Overview scoring.
- Added shared 42-day comparison primitives in `src/analysis.ts`:
  - `getLatestWorkoutDate(...)`
  - `getExercisesInDateWindow(...)`
  - `getWindowComparison(...)`
  - `getRotationQualityMetrics(...)`
- Added shared type export `RotationQualityMetrics`.
- Updated dashboard re-exports in `dashboard/src/shared/workout-analysis.ts`.
- Replaced Overview selector internals:
  - `dashboard/src/features/overview/selectors/getOverviewMetrics.ts`
  - `dashboard/src/features/overview/selectors/getStrengthScoreSeries.ts`
- Updated Overview UI labels and values in:
  - `dashboard/src/features/overview/OverviewTab.tsx`
  - `dashboard/src/features/overview/components/StrengthScoreChart.tsx`

## 10) Quality score math (exact)

Current implementation in `src/analysis.ts`:

- Define windows:
  - current window = `[anchor - 41 days, anchor]`
  - previous window = immediately preceding 42 days
- Anchor date:
  - `anchor = latest workout date` unless explicitly passed
- Per-exercise comparison metric:
  - bodyweight exercise => best reps in window
  - non-bodyweight exercise => best estimated 1RM in window
- Progression sample:
  - `changeRatio = (currentMetric - previousMetric) / previousMetric`
  - clamped to `[-1, 1]` before averaging
- Progression score:
  - `progressionScore = round(clamp(50 + avgChangeRatio * 50, 0, 100))`
- Consistency score:
  - `sessionsPerWeek = currentSessions / 6` (42 days = 6 weeks)
  - `consistencyScore = round(clamp((sessionsPerWeek / 4) * 100, 0, 100))`
  - 4 sessions/week maps to 100
- Balance score:
  - entropy over set-distribution across active lifts in current window
  - normalized by max entropy `log(activeExerciseCount)`
  - if only 1 active exercise => 100
- Final composite:
  - `qualityScore = round(clamp(progression*0.45 + consistency*0.35 + balance*0.2, 0, 100))`

## 11) Open questions worth clarifying with repo owner

- Should `YYMMDD` eventually migrate to `YYYYMMDD` for long-term ordering safety?
- Should bodyweight default (`weight=1`) be explicit in docs/UI labels?
- Should `/api/exercises` return cached/precomputed data for larger logs?
- Should quality score weights (45/35/20) and thresholds (+/-1%) be configurable?
- Should consistency target (4 sessions/week = 100) be personalized per user?
- Should Explorer/Records adopt same 42-day comparison model in next phase?
