import { useEffect, useRef, useState } from "react";
import { ApiError, request, type Snapshot, type Workout } from "@/services/exerciseApi";
import { useSavedEditor } from "@/hooks/useSavedEditor";
import { formatWorkoutDate, parseYYMMDD } from "@/shared/date";
import { sameExercises } from "../../../../src/workout-log";

const today = () => {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
};
const inputDate = (date: string) => `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4)}`;
const logDate = (date: string) => date.replaceAll("-", "").slice(2);
const workoutLines = (workout: Workout) => [...workout.lines, ...(workout.targets ?? [])];
const splitLines = (text: string) => text.split("\n").map(line => line.trim()).filter(Boolean);
const daysAgo = (date: string) => {
  const days = Math.round((parseYYMMDD(today()).getTime() - parseYYMMDD(date).getTime()) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

export function WorkoutDraftView({ onFinished, onDraftChange }: { onFinished: () => void; onDraftChange: (active: boolean) => void }) {
  const editor = useSavedEditor<Workout | null>("workout-draft", null, true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [finishAttempt, setFinishAttempt] = useState<{ id: string; revision: string; logRevision: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem("workoutreview:finish") ?? "null"); } catch { return null; }
  });
  const syncDraftText = useRef(true);
  const draft = editor.value;

  useEffect(() => {
    if (!editor.ready || !syncDraftText.current) return;
    setDraftText(draft ? workoutLines(draft).join("\n") : "");
    syncDraftText.current = false;
  }, [draft, editor.ready]);
  useEffect(() => { if (editor.ready) onDraftChange(!!draft); }, [draft, editor.ready]);

  const loadHistory = async () => setWorkouts((await request<Snapshot<Workout[]>>("workouts")).value);
  useEffect(() => { void loadHistory().catch(cause => setError((cause as Error).message)); }, []);

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const editedDraft = (): Workout => ({ ...draft!, lines: splitLines(draftText), targets: undefined });
  const start = (source?: Workout) => act(async () => {
    const nextDraft: Workout = { date: today(), lines: source ? workoutLines(source) : [], source: source?.date };
    editor.edit(nextDraft);
    setDraftText(nextDraft.lines.join("\n"));
    await editor.save();
    setConflict(false);
  });
  const finish = async (choice?: "merge" | "overwrite") => act(async () => {
    if (!draft && !finishAttempt) return;
    let attempt = finishAttempt;
    if (!attempt) {
      editor.edit(editedDraft());
      const saved = await editor.save();
      const history = await request<Snapshot<Workout[]>>("workouts");
      attempt = {
        id: Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join("-"),
        revision: saved.revision,
        logRevision: history.revision,
      };
      setFinishAttempt(attempt);
      localStorage.setItem("workoutreview:finish", JSON.stringify(attempt));
    }
    let result: { conflict: boolean };
    try {
      result = await request<{ conflict: boolean }>(
        "workout-draft/finish",
        "POST",
        { id: attempt.id, logRevision: attempt.logRevision, conflict: choice },
        attempt.revision,
      );
    } catch (cause) {
      if (cause instanceof ApiError && [400, 404, 409, 412].includes(cause.status)) {
        setFinishAttempt(null);
        localStorage.removeItem("workoutreview:finish");
        setConflict(false);
        if (cause.status === 412) { syncDraftText.current = true; await editor.load(); }
      }
      throw cause;
    }
    if (result.conflict) { setConflict(true); return; }
    setFinishAttempt(null);
    localStorage.removeItem("workoutreview:finish");
    setConflict(false);
    setDraftText("");
    await editor.load(true);
    onFinished();
    await loadHistory();
  });
  const cancel = () => act(async () => {
    if (!window.confirm("Cancel this workout? Nothing will be added to your log.")) return;
    await request("workout-draft", "DELETE", undefined, editor.revision());
    setDraftText("");
    setConflict(false);
    syncDraftText.current = true;
    await editor.load(true);
  });
  const warning = <>
    {(error || editor.error) && <p className="input-editor-error" role="alert">{error || editor.error}</p>}
    {editor.conflict && <button className="archive-button" onClick={() => {
      if (window.confirm("Replace this device's edits with the saved version? Copy any changes you need first.")) {
        syncDraftText.current = true;
        void editor.load(true);
      }
    }}>Load saved version</button>}
  </>;

  if (!editor.ready) return <main className="page-content">{warning}<p>Loading workout…</p><button className="archive-button" onClick={() => void editor.load()}>Retry</button></main>;

  const last = workouts[0];
  if (!draft) return <main className="page-content workout-picker">
    <div className="page-intro"><div>
      <p className="eyebrow">Workout</p>
      <h1>Log a workout</h1>
      <p className="intro-copy">{last ? <>Last logged: <strong>{formatWorkoutDate(last.date)}</strong> · {daysAgo(last.date)}</> : "Nothing logged yet."}</p>
    </div></div>
    {warning}
    {finishAttempt && <button className="input-save-button" disabled={busy} onClick={() => void finish()}>Check previous finish</button>}
    <button className="input-save-button" disabled={busy || !!finishAttempt} onClick={() => void start()}>Start empty workout</button>
    {workouts.length > 0 && <section aria-labelledby="repeat-heading">
      <h2 id="repeat-heading" className="workout-section-heading">Or repeat a past workout</h2>
      <p className="workout-section-copy">Copies its exercises into a new workout for today. Nothing is logged until you finish.</p>
      <div className="workout-template-list">
        {workouts.map((workout, index) => <div className="workout-template-row" key={`${workout.date}-${index}`}>
          <div className="workout-template"><strong>{formatWorkoutDate(workout.date)}</strong><span>{workoutLines(workout).join(" · ") || "No exercises"}</span></div>
          <button className="archive-button" disabled={busy || !!finishAttempt} onClick={() => void start(workout)}>Repeat</button>
        </div>)}
      </div>
    </section>}
  </main>;

  const lines = splitLines(draftText);
  const duplicate = workouts.find(workout => sameExercises(workout.lines, lines));
  const locked = busy || !!finishAttempt;
  return <main className="page-content input-editor-page">
    <div className="page-intro"><div>
      <p className="eyebrow">Workout in progress</p>
      <h1>Log your sets</h1>
      <p className="intro-copy">
        {draft.source ? <>Copied from {formatWorkoutDate(draft.source)}. Edit it to match what you do today. </> : null}
        Nothing is added to your log until you finish.
      </p>
    </div></div>
    {warning}
    <label className="workout-date-label">Date <input type="date" value={inputDate(draft.date)} onChange={event => editor.edit({ ...editedDraft(), date: logDate(event.target.value) })} disabled={locked} /></label>
    <textarea className="workout-input" value={draftText} onChange={event => {
      setDraftText(event.target.value);
      editor.edit({ ...draft, lines: splitLines(event.target.value), targets: undefined });
    }} disabled={locked} aria-label="Current workout exercises" spellCheck={false} placeholder={"squat 30b 6 6\npull up 8 7"} />
    {duplicate && <p className="workout-notice" role="status">Identical to the workout logged on {formatWorkoutDate(duplicate.date)}. Change your sets before finishing.</p>}
    {conflict && <div className="input-editor-error">A workout is already logged on this date. <button type="button" onClick={() => void finish("merge")}>Add to it</button> <button type="button" onClick={() => void finish("overwrite")}>Replace it</button></div>}
    {finishAttempt && <p>Finish is awaiting confirmation. Retry to check it safely.</p>}
    <div className="input-editor-actions">
      <span>{editor.saving ? "Saving draft…" : editor.dirty ? "Unsaved changes" : "Draft saved"}</span>
      <div>
        <button type="button" className="archive-button" onClick={() => void cancel()} disabled={locked || editor.saving}>Cancel workout</button>
        <button type="button" className="input-save-button" onClick={() => void finish()} disabled={busy || (!finishAttempt && (!!duplicate || !lines.length))}>{busy ? "Saving…" : finishAttempt ? "Retry finish" : "Finish · add to log"}</button>
      </div>
    </div>
  </main>;
}
