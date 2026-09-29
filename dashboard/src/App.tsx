import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { LiftDetail } from "@/features/lifts/LiftDetail";
import {
  ProgressView,
  type ProgressArchiveFilter,
  type ProgressSortMode,
} from "@/features/progress/ProgressView";
import { SessionsView } from "@/features/sessions/SessionsView";
import { WorkoutInputView } from "@/features/input/WorkoutInputView";
import { WorkoutDraftView } from "@/features/workout/WorkoutDraftView";
import { getProgressReport } from "@/features/training/training-analysis";
import { useExerciseArchive } from "@/hooks/useExerciseArchive";
import { useExercises } from "@/hooks/useExercises";
import { warnBeforeClosingEdits } from "@/lib/saved-edits";
import { request } from "@/services/exerciseApi";
import "./index.css";

type View = "workout" | "sessions" | "progress" | "log";
const views: View[] = ["workout", "sessions", "progress", "log"];
type ProgressLocationState = {
  sort: ProgressSortMode;
  archiveFilter: ProgressArchiveFilter;
  query: string;
};
type LocationState = {
  view: View;
  lift: string | null;
  progress: ProgressLocationState;
};

function readLocationState(): LocationState {
  const params = new URLSearchParams(window.location.search);
  const sort = params.get("sort");
  const archiveFilter = params.get("status");
  const [section, lift] = window.location.pathname.split("/").filter(Boolean);

  return {
    view: section === "lifts" ? "progress" : views.find((view) => view === section) ?? "workout",
    lift: section === "lifts" && lift ? decodeURIComponent(lift) : null,
    progress: {
      sort: sort === "recent" || sort === "name" ? sort : "signal",
      archiveFilter: archiveFilter === "archived" ? "archived" : "active",
      query: params.get("q") ?? "",
    },
  };
}

export function App() {
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => warnBeforeClosingEdits(event);
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const { exercises, loading, error, reload } = useExercises();
  const archive = useExerciseArchive();
  const [location, setLocation] = useState<LocationState>(() => readLocationState());
  const [searchOpen, setSearchOpen] = useState(false);
  const [workoutActive, setWorkoutActive] = useState(false);
  useEffect(() => {
    void request<{ value: unknown }>("workout-draft").then((draft) => setWorkoutActive(draft.value !== null)).catch(() => {});
  }, []);
  const lifts = useMemo(
    () =>
      getProgressReport(exercises).lifts.filter(
        (lift) => !archive.archivedExerciseNames.includes(lift.name),
      ),
    [archive.archivedExerciseNames, exercises],
  );

  const navigate = (
    next: LocationState,
    historyMode: "push" | "replace" = "push",
  ) => {
    const params = new URLSearchParams();
    if (next.progress.sort !== "signal") params.set("sort", next.progress.sort);
    if (next.progress.archiveFilter !== "active") {
      params.set("status", next.progress.archiveFilter);
    }
    if (next.progress.query) params.set("q", next.progress.query);

    const path = next.lift ? `/lifts/${encodeURIComponent(next.lift)}` : next.view === "workout" ? "/" : `/${next.view}`;
    const query = next.view === "progress" && !next.lift ? params.toString() : "";
    const url = query ? `${path}?${query}` : path;
    if (historyMode === "replace") {
      window.history.replaceState({ app: true }, "", url);
    } else {
      window.history.pushState({ app: true }, "", url);
    }
    setLocation(next);
  };

  const updateProgressLocation = (update: Partial<ProgressLocationState>) => {
    navigate(
      { ...location, progress: { ...location.progress, ...update } },
      "replace",
    );
  };

  useEffect(() => {
    const onPopState = () => setLocation(readLocationState());
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const openLift = (name: string) => navigate({ ...location, lift: name });
  const selectView = (view: View) => {
    navigate({ ...location, view, lift: null });
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => selectView("workout")}
        >
          <span>WORKOUT</span><strong>REVIEW</strong>
        </button>
        <Navigation location={location} workoutActive={workoutActive} onSelect={selectView} />
        <button className="header-search" type="button" onClick={() => setSearchOpen(true)}>
          Search <kbd>⌘ K</kbd>
        </button>
      </header>

      {archive.error && <p className="input-editor-error" role="alert">{archive.error} <button className="archive-button" onClick={() => void archive.reload()}>Retry archive settings</button></p>}
      {location.view !== "log" && location.view !== "workout" && (loading || archive.loading) ? <LoadingState /> :
      location.view !== "log" && location.view !== "workout" && error ? <main className="page-content"><p role="alert">{error}</p><button className="input-save-button" onClick={() => selectView("log")}>Repair log</button> <button className="archive-button" onClick={() => void reload()}>Retry</button></main> :
      location.lift ? (
        <LiftDetail
          exercises={exercises}
          name={location.lift}
          isArchived={archive.archivedExerciseNames.includes(location.lift.split("::")[0]!)}
          onSetArchived={archive.setArchived}
          onBack={() => window.history.state?.app ? window.history.back() : navigate({ ...location, lift: null })}
        />
      ) : location.view === "workout" ? (
        <WorkoutDraftView exercises={exercises} onFinished={() => void reload()} onDraftChange={setWorkoutActive} />
      ) : location.view === "log" ? (
        <WorkoutInputView onSaved={() => void reload()} onBack={() => selectView("sessions")} />
      ) : location.view === "progress" ? (
        <ProgressView
          exercises={exercises}
          archivedExerciseNames={archive.archivedExerciseNames}
          sortMode={location.progress.sort}
          archiveFilter={location.progress.archiveFilter}
          query={location.progress.query}
          onOpenLift={openLift}
          onChangeSort={(sort) => updateProgressLocation({ sort })}
          onChangeArchiveFilter={(archiveFilter) =>
            updateProgressLocation({ archiveFilter })
          }
          onChangeQuery={(query) => updateProgressLocation({ query })}
        />
      ) : (
        <SessionsView
          onSaved={() => void reload()}
          exercises={exercises}
          archivedExerciseNames={archive.archivedExerciseNames}
          onOpenLift={openLift}
          onEditLog={() => selectView("log")}
        />
      )}

      <CommandPalette open={searchOpen} lifts={lifts} onClose={() => setSearchOpen(false)} onOpenLift={openLift} />
    </div>
  );
}

function Navigation({
  location,
  workoutActive,
  onSelect,
}: {
  location: LocationState;
  workoutActive: boolean;
  onSelect: (view: View) => void;
}) {
  const current = location.view === "log" ? "sessions" : location.view;
  return <nav className="primary-nav" aria-label="Primary navigation">
    {(["workout", "sessions", "progress"] as const).map((view) => (
      <button key={view} type="button" className={current === view && !location.lift ? "active" : ""} onClick={() => onSelect(view)}>
        {`${view[0].toUpperCase()}${view.slice(1)}`}
        {view === "workout" && workoutActive && <span className="nav-live-dot" aria-label="in progress" />}
      </button>
    ))}
  </nav>;
}

function LoadingState() {
  return <div className="app-state"><span className="loading-mark" />Loading training log…</div>;
}

export default App;
