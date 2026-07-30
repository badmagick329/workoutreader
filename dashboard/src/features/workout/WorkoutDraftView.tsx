import { useEffect, useState } from "react";
import {
  clearWorkoutDraft,
  fetchWorkoutDraft,
  fetchWorkouts,
  finishWorkoutDraft,
  saveWorkoutDraft,
  type Workout,
} from "@/services/exerciseApi";

const today = () => new Date().toISOString().slice(2, 10).replaceAll("-", "");
const inputDate = (date: string) => `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4, 6)}`;
const logDate = (date: string) => date.replaceAll("-", "").slice(2);

export function WorkoutDraftView({ onFinished }: { onFinished: () => void }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [draft, setDraft] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [nextWorkouts, nextDraft] = await Promise.all([fetchWorkouts(), fetchWorkoutDraft()]);
      setWorkouts(nextWorkouts);
      setDraft(nextDraft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workout data could not be loaded.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const start = (workout?: Workout) => {
    setDraft({ date: today(), lines: workout?.lines ?? [] });
    setConflict(false);
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true); setError(null);
    try { await saveWorkoutDraft(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : "Workout draft could not be saved."); }
    finally { setSaving(false); }
  };
  const finish = async (choice?: "merge" | "overwrite") => {
    setSaving(true); setError(null);
    try {
      const result = await finishWorkoutDraft(choice);
      if (result.conflict) { setConflict(true); return; }
      setDraft(null); setConflict(false); onFinished(); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Workout could not be finished."); }
    finally { setSaving(false); }
  };
  const discard = async () => {
    if (!window.confirm("Discard the current workout draft?")) return;
    await clearWorkoutDraft(); setDraft(null); setConflict(false);
  };

  if (loading) return <main className="page-content">Loading workout…</main>;
  if (!draft) return <main className="page-content workout-picker">
    <div className="page-intro"><div><p className="eyebrow">New workout</p><h1>Start from a previous session</h1><p className="intro-copy">Choose a past workout to copy its exercises, or begin empty.</p></div></div>
    {error && <p className="input-editor-error" role="alert">{error}</p>}
    <button className="input-save-button" type="button" onClick={() => start()}>Start empty workout</button>
    <div className="workout-template-list">
      {workouts.map((workout, index) => <button type="button" className="workout-template" key={`${workout.date}-${index}`} onClick={() => start(workout)}>
        <strong>{inputDate(workout.date)}</strong><span>{workout.lines.join(" · ") || "No exercises"}</span>
      </button>)}
    </div>
  </main>;

  return <main className="page-content input-editor-page">
    <div className="page-intro"><div><p className="eyebrow">Current workout</p><h1>Train, then finish</h1><p className="intro-copy">Save keeps this as a draft. Finish adds it to your completed log.</p></div></div>
    {error && <p className="input-editor-error" role="alert">{error}</p>}
    <label className="workout-date-label">Date <input type="date" value={inputDate(draft.date)} onChange={(event) => setDraft({ ...draft, date: logDate(event.target.value) })} disabled={saving} /></label>
    <textarea className="workout-input" value={draft.lines.join("\n")} onChange={(event) => setDraft({ ...draft, lines: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) })} disabled={saving} aria-label="Current workout exercises" spellCheck={false} />
    {conflict && <div className="input-editor-error">A completed workout already exists for this date. <button type="button" onClick={() => void finish("merge")}>Merge</button> <button type="button" onClick={() => void finish("overwrite")}>Overwrite</button></div>}
    <div className="input-editor-actions"><button type="button" className="back-button" onClick={() => void discard()} disabled={saving}>Discard draft</button><div><button type="button" className="archive-button" onClick={() => void save()} disabled={saving}>Save draft</button> <button type="button" className="input-save-button" onClick={() => void finish()} disabled={saving}>{saving ? "Saving…" : "Finish workout"}</button></div></div>
  </main>;
}
