import { useEffect, useMemo, useRef, useState } from "react";
import type { LiftSummary } from "@/features/training/training-analysis";
import { formatShortWorkoutDate } from "@/shared/date";

export function CommandPalette({
  open,
  lifts,
  onClose,
  onOpenLift,
}: {
  open: boolean;
  lifts: LiftSummary[];
  onClose: () => void;
  onOpenLift: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return lifts
      .filter((lift) => lift.name.toLowerCase().includes(term))
      .slice(0, 9);
  }, [lifts, query]);

  if (!open) return null;

  const choose = (name: string) => {
    onOpenLift(name);
    onClose();
  };

  return (
    <div className="command-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Find a lift"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter" && matches[0]) choose(matches[0].name);
          }}
          placeholder="Search every lift…"
          aria-label="Search every lift"
        />
        <div className="command-results">
          {matches.map((lift) => (
            <button type="button" key={lift.name} onClick={() => choose(lift.name)}>
              <span>{lift.name}</span>
              <small>{lift.trend === "baseline" ? "building baseline" : `${lift.trend} · ${formatShortWorkoutDate(lift.latest.date)}`}</small>
            </button>
          ))}
          {matches.length === 0 && <p className="empty-state">No matching lifts.</p>}
        </div>
        <footer><kbd>Enter</kbd> open first result <kbd>Esc</kbd> close</footer>
      </section>
    </div>
  );
}
