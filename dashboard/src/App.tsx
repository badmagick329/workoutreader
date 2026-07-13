import { useEffect, useMemo, useState } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { LiftDetail } from "@/features/lifts/LiftDetail";
import { ProgressView } from "@/features/progress/ProgressView";
import { SessionsView } from "@/features/sessions/SessionsView";
import { getProgressReport } from "@/features/training/training-analysis";
import { useExercises } from "@/hooks/useExercises";
import "./index.css";

type View = "progress" | "sessions";
type LocationState = { view: View; lift: string | null };

function readLocationState(): LocationState {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get("view") === "sessions" ? "sessions" : "progress",
    lift: params.get("lift"),
  };
}

export function App() {
  const { exercises, loading, error } = useExercises();
  const [location, setLocation] = useState<LocationState>(() => readLocationState());
  const [searchOpen, setSearchOpen] = useState(false);
  const lifts = useMemo(() => getProgressReport(exercises).lifts, [exercises]);

  const navigate = (next: LocationState) => {
    const params = new URLSearchParams();
    if (next.view !== "progress") params.set("view", next.view);
    if (next.lift) params.set("lift", next.lift);
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    setLocation(next);
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

  const openLift = (name: string) => navigate({ view: location.view, lift: name });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="wordmark" type="button" onClick={() => navigate({ view: "progress", lift: null })}>
          <span>WORKOUT</span><strong>REVIEW</strong>
        </button>
        <nav aria-label="Primary navigation">
          <button
            type="button"
            className={location.view === "progress" && !location.lift ? "active" : ""}
            onClick={() => navigate({ view: "progress", lift: null })}
          >
            Progress
          </button>
          <button
            type="button"
            className={location.view === "sessions" && !location.lift ? "active" : ""}
            onClick={() => navigate({ view: "sessions", lift: null })}
          >
            Sessions
          </button>
        </nav>
        <button className="header-search" type="button" onClick={() => setSearchOpen(true)}>
          Search <kbd>⌘ K</kbd>
        </button>
      </header>

      {location.lift ? (
        <LiftDetail exercises={exercises} name={location.lift} onBack={() => navigate({ view: location.view, lift: null })} />
      ) : location.view === "progress" ? (
        <ProgressView exercises={exercises} onOpenLift={openLift} />
      ) : (
        <SessionsView exercises={exercises} onOpenLift={openLift} />
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
