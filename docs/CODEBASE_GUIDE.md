# WorkoutReader codebase guide

WorkoutReader keeps a plain-text training log and serves a Bun/React dashboard for logging sets at the gym and reviewing progress.

## Training flow

- The app opens on Workout (`/`). Navigation is Workout, Sessions (`/sessions`) and Progress (`/progress`); lifts live at `/lifts/<id>` and the raw log editor at `/log`, linked from Sessions.
- Start an empty workout, or Repeat one of the last five sessions (all on request) to copy its lines into a new workout dated today. Nothing reaches the log until Finish.
- A workout in progress stays open across visits and is marked in the navigation. Edit it as text; it autosaves after a short pause. Unsaved edits are isolated per browser tab and survive refresh while the tab remains open.
- While editing, each line is previewed as parsed next to the previous session of that lift (`dashboard/src/features/workout/line-preview.ts`), so typos show before Finish. Finish stays pinned to the bottom of the screen.
- Finish adds the workout to the log. It is refused while the lines are identical to an already logged session, so an unedited copy cannot be logged twice. Cancel workout discards it without touching the log.
- The app is installable from the browser (web manifest and icons in `dashboard/src`). Archiving a lift is done from its detail page.
- Edit session changes one date, with a preview and an undo option; Delete session removes it. Edit full log replaces the whole log after confirmation.
- Data-loading failures leave navigation and the log editor available for repair. A missing input file starts with an empty log.

## Input format

Each date is YYMMDD, followed by exercise lines:

```text
260912
squat 30b 6 6
row 25w 10 8
pull up 8 7
```

`b` means plates plus the 20 kg bar; `w` means the stated weight in kg. No weight token means bodyweight. Explicit weights, including 1w, remain loaded sets. Repeated dates combine into one session. Invalid dates and unexpected tokens are rejected. Incomplete exercise names or weights produce no completed sets, so they can stay in a workout in progress as reminders.

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

Run one server per data directory. `DATA_DIR` holds `input.txt`, `current-workout.json` and `exercise-settings.json`. Writes retain the previous file as `.bak`. Mutations require the revision returned when reading; stale edits return 412 and must be resolved explicitly.

Finishing first writes `finish-journal.json`, then updates the log and clears the draft. An interrupted finish is replayed before another operation. The client retains its finish request ID for safe retries. Back up the whole data directory, including the journal. No data migration is required.

Local browser recovery is not a server backup. The app does not provide a fully offline first launch. Existing local edits can be recovered when a loaded page loses connectivity.

## Checks

Run `bun test` from the root. Run `bun run build` from `dashboard`. Tests cover parser regressions, independent load types, stale edits, session changes, duplicate-date finish choices, duplicate-copy rejection, session deletion and finish recovery.
