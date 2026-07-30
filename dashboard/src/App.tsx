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
import "./index.css";

type View = "progress" | "sessions" | "workout" | "input";
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

  return {
    view: params.get("view") === "sessions" ? "sessions" : params.get("view") === "workout" ? "workout" : params.get("view") === "input" ? "input" : "progress",
    lift: params.get("lift"),
    progress: {
      sort: sort === "recent" || sort === "name" ? sort : "signal",
      archiveFilter: archiveFilter === "archived" ? "archived" : "active",
      query: params.get("q") ?? "",
    },
  };
}

export function App() {
  const { exercises, loading, error, reload } = useExercises();
  const archive = useExerciseArchive();
  const [location, setLocation] = useState<LocationState>(() => readLocationState());
  const [searchOpen, setSearchOpen] = useState(false);
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
    if (next.view !== "progress") params.set("view", next.view);
    if (next.lift) params.set("lift", next.lift);
    if (next.progress.sort !== "signal") params.set("sort", next.progress.sort);
    if (next.progress.archiveFilter !== "active") {
      params.set("status", next.progress.archiveFilter);
    }
    if (next.progress.query) params.set("q", next.progress.query);

    const query = params.toString();
    const url = query ? `?${query}` : window.location.pathname;
    if (historyMode === "replace") {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
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

  if (loading || archive.loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (archive.error) return <ErrorState message={archive.error} />;

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => navigate({ ...location, view: "progress", lift: null })}
        >
          <span>WORKOUT</span><strong>REVIEW</strong>
        </button>
        <nav aria-label="Primary navigation">
          <button
            type="button"
            className={location.view === "progress" && !location.lift ? "active" : ""}
            onClick={() => navigate({ ...location, view: "progress", lift: null })}
          >
            Progress
          </button>
          <button
            type="button"
            className={location.view === "sessions" && !location.lift ? "active" : ""}
            onClick={() => navigate({ ...location, view: "sessions", lift: null })}
          >
            Sessions
          </button>
          <button type="button" className={location.view === "workout" && !location.lift ? "active" : ""} onClick={() => navigate({ ...location, view: "workout", lift: null })}>Workout</button>
          <button
            type="button"
            className={location.view === "input" && !location.lift ? "active" : ""}
            onClick={() => navigate({ ...location, view: "input", lift: null })}
          >
            Edit log
          </button>
        </nav>
        <button className="header-search" type="button" onClick={() => setSearchOpen(true)}>
          Search <kbd>⌘ K</kbd>
        </button>
      </header>

      {location.lift ? (
        <LiftDetail
          exercises={exercises}
          name={location.lift}
          isArchived={archive.archivedExerciseNames.includes(location.lift)}
          onSetArchived={archive.setArchived}
          onBack={() => navigate({ ...location, lift: null })}
        />
      ) : location.view === "workout" ? (
        <WorkoutDraftView onFinished={() => void reload()} />
      ) : location.view === "input" ? (
        <WorkoutInputView onSaved={() => void reload()} />
      ) : location.view === "progress" ? (
        <ProgressView
          exercises={exercises}
          archivedExerciseNames={archive.archivedExerciseNames}
          sortMode={location.progress.sort}
          archiveFilter={location.progress.archiveFilter}
          query={location.progress.query}
          onOpenLift={openLift}
          onSetArchived={archive.setArchived}
          onChangeSort={(sort) => updateProgressLocation({ sort })}
          onChangeArchiveFilter={(archiveFilter) =>
            updateProgressLocation({ archiveFilter })
          }
          onChangeQuery={(query) => updateProgressLocation({ query })}
        />
      ) : (
        <SessionsView
          exercises={exercises}
          archivedExerciseNames={archive.archivedExerciseNames}
          onOpenLift={openLift}
        />
      )}

      <CommandPalette open={searchOpen} lifts={lifts} onClose={() => setSearchOpen(false)} onOpenLift={openLift} />
    </div>
  );
}

function LoadingState() {
  return <div className="app-state"><span className="loading-mark" />Loading training log…</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="app-state error-state">{message}</div>;
}

export default App;
