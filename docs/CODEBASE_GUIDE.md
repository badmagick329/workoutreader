# WorkoutReader Codebase Guide

## Purpose

WorkoutReader parses plain-text workout logs into structured sets and serves analytics in a Bun dashboard.

- Root app: parser + shared analytics utilities.
- Dashboard app: API + Overview / Explorer / Records UI.
- Core contract: `/api/exercises` returns raw parsed `Exercise[]`; derived metrics stay in selectors/shared analysis.

## Current flow

1. Read `data/input.txt`.
2. Parse date blocks (`YYMMDD`) + exercise tokens.
3. Build `Exercise` entries (including barbell adjustment rules in domain layer).
4. Expose parsed data via dashboard API `/api/exercises`.
5. Compute all UI metrics in selector/shared-analysis layer.

## Key files

### Root

- `src/index.ts`: parse entrypoint.
- `src/parser.ts`: date chunking + token parsing.
- `src/exercise.ts` / `src/exercise-set.ts`: exercise + set creation rules.
- `src/analysis.ts`: rotation-aware analytics (42d vs prior 42d), progression, PR helpers.

### Dashboard

- `dashboard/src/index.tsx`: Bun server + `/api/exercises` route.
- `dashboard/src/hooks/useExercises.ts`: data loading.
- `dashboard/src/features/overview`: quality trend + consistency/readiness summary.
- `dashboard/src/features/explorer`: searchable exercise workspace + progression/block comparison.
- `dashboard/src/features/records`: records grid with block-status badges.
- `dashboard/src/shared/workout-analysis.ts`: re-export bridge to root analysis.
- `dashboard/src/shared/status-style.ts`, `dashboard/src/shared/chart-style.ts`, `dashboard/src/shared/icon-style.ts`: visual consistency tokens/helpers.

## Input format (`data/input.txt`)

- Date line: exactly 6 digits, e.g. `251203`.
- Following lines until next date are exercise lines.
- Token rules:
  - Name: free text.
  - Weight: `<number>b` or `<number>w`.
  - Reps: integer tokens.

## Analytics model (used by UI)

Source: `getRotationQualityMetrics(...)` in `src/analysis.ts`.

- Comparison window: current 42 days vs prior 42 days.
- Per-exercise metric:
  - bodyweight: best reps
  - loaded: best estimated 1RM (Epley)
- Progress status thresholds:
  - improving: `changeRatio > 0.01`
  - declining: `changeRatio < -0.01`
  - else stable
- Quality score components: progression, consistency, balance.
- Default composite weights: progression `0.45`, consistency `0.35`, balance `0.20`.
- Consistency target mode supports fixed or adaptive.

## UI behavior (current)

- Overview: quality score cards, trend chart, recent PR list, consistency/readiness card.
- Explorer: search + filter (`All/Push/Pull/Legs/Custom`), recent/pinned exercises, keyboard selection flow, progression chart + block summary stats.
- Records: sortable record cards with semantic block-status badges.

## Commands

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

## Guardrails

- Keep parser/token semantics stable unless contract change is intentional.
- Keep `/api/exercises` response shape unchanged (`Exercise[]`).
- Keep analytics logic in `src/analysis.ts` + selectors, not UI components.
- Use shared dashboard style helpers for status/chart/icon consistency.
