# WorkoutReader codebase guide

WorkoutReader keeps a plain-text training log and serves a Bun/React dashboard for logging sets at the gym and reviewing progress.

## Training flow

- Start an empty workout or copy a completed session into targets.
- Confirm a target with Done, or enter a completed set using the numeric weight/reps fields.
- Undo moves a completed set back to targets. Finish records completed sets only.
- The current workout autosaves after a short pause. Unsaved edits are isolated per browser tab and survive navigation and refresh while the tab remains open; Save now retries a failed save. Closing a tab with unsaved edits shows a warning.
- Edit log replaces the full log after confirmation. Edit session changes one date, with a preview and an undo option.
- Data-loading failures leave navigation and Edit log available for repair. A missing input file starts with an empty log.

## Input format

Each date is YYMMDD, followed by exercise lines:

```text
260912
squat 30b 6 6
row 25w 10 8
pull up 8 7
```

`b` means plates plus the 20 kg bar; `w` means the stated weight in kg. No weight token means bodyweight. Explicit weights, including 1w, remain loaded sets. Repeated dates combine into one session. Invalid dates and unexpected tokens are rejected. Incomplete exercise names or weights produce no completed sets and can be used as draft targets.

## Source of truth

- `src/workout-log.ts`: parsing, workout validation and serialization shared by server and UI previews.
- `src/parser.ts`, `src/exercise.ts`, `src/exercise-set.ts`: token rules and completed set construction.
- `dashboard/src/server/api.ts`: HTTP boundary and revision checks.
- `dashboard/src/server/store.ts`: serialized file operations, atomic replacement, previous-version backups and finish recovery.
- `dashboard/src/hooks/useSavedEditor.ts`: local recovery, revision-aware saves and draft autosaving.
- `dashboard/src/features/training/training-analysis.ts`: dashboard metrics. The older `src/analysis.ts` is not used by the dashboard.

## Progress

Compare exact exercise names and load types separately. Loaded sets use estimated 1RM; bodyweight sets use reps. A trend needs six sessions and compares the median of the last three against the previous three, with a 2.5% threshold. The detail view shows date ranges and the rep change at the latest top-set weight. Summary counts include unarchived lifts trained in the last 42 days; older lifts remain in the list.

## Persistence

Run one server per data directory. `DATA_DIR` holds `input.txt`, `current-workout.json`, `next-workout.json` and `exercise-settings.json`. Writes retain the previous file as `.bak`. Mutations require the revision returned when reading; stale edits return 412 and must be resolved explicitly.

Finishing first writes `finish-journal.json`, then updates the log and clears the draft. An interrupted finish is replayed before another operation. The client retains its finish request ID for safe retries. Back up the whole data directory, including the journal. No data migration is required.

Local browser recovery is not a server backup. The app does not provide a fully offline first launch. Existing local edits can be recovered when a loaded page loses connectivity.

## Checks

Run `bun test` from the root. Run `bun run build` from `dashboard`. Tests cover parser regressions, independent load types, stale edits, session changes, duplicate-date finish choices and finish recovery.
