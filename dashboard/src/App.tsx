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
  const [menuOpen, setMenuOpen] = useState(false);
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
  const selectView = (view: View) => {
    navigate({ ...location, view, lift: null });
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => selectView("progress")}
        >
          <span>WORKOUT</span><strong>REVIEW</strong>
        </button>
        <Navigation location={location} onSelect={selectView} className="desktop-nav" />
        <button className="mobile-menu-button" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen((open) => !open)}>
          Menu
        </button>
        {menuOpen && <>
          <button className="mobile-menu-backdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <Navigation id="mobile-menu" location={location} onSelect={selectView} className="mobile-nav" />
        </>}
        <button className="header-search" type="button" onClick={() => setSearchOpen(true)}>
          Search <kbd>⌘ K</kbd>
        </button>
      </header>

      {archive.error && <p className="input-editor-error" role="alert">{archive.error}</p>}
      {location.view !== "input" && location.view !== "workout" && (loading || archive.loading) ? <LoadingState /> :
      location.view !== "input" && location.view !== "workout" && error ? <main className="page-content"><p role="alert">{error}</p><button className="input-save-button" onClick={() => selectView("input")}>Repair log</button> <button className="archive-button" onClick={() => void reload()}>Retry</button></main> :
      location.lift ? (
        <LiftDetail
          exercises={exercises}
          name={location.lift}
          isArchived={archive.archivedExerciseNames.includes(location.lift.split("::")[0]!)}
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
          onSaved={() => void reload()}
          exercises={exercises}
          archivedExerciseNames={archive.archivedExerciseNames}
          onOpenLift={openLift}
        />
      )}

      <CommandPalette open={searchOpen} lifts={lifts} onClose={() => setSearchOpen(false)} onOpenLift={openLift} />
    </div>
  );
}

function Navigation({
  className,
  id,
  location,
  onSelect,
}: {
  className: string;
  id?: string;
  location: LocationState;
  onSelect: (view: View) => void;
}) {
  return <nav id={id} className={className} aria-label="Primary navigation">
    {(["progress", "sessions", "workout", "input"] as const).map((view) => (
      <button key={view} type="button" className={location.view === view && !location.lift ? "active" : ""} onClick={() => onSelect(view)}>
        {view === "input" ? "Edit log" : `${view[0].toUpperCase()}${view.slice(1)}`}
      </button>
    ))}
  </nav>;
}

function LoadingState() {
  return <div className="app-state"><span className="loading-mark" />Loading training log…</div>;
}

export default App;
