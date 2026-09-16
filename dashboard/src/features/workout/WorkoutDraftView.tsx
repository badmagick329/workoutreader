import { useEffect, useRef, useState } from "react";
import { ApiError, request, type Snapshot, type Workout } from "@/services/exerciseApi";
import { useSavedEditor } from "@/hooks/useSavedEditor";

const today = () => {
  const now = new Date();
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
};
const inputDate = (date: string) => `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4)}`;
const logDate = (date: string) => date.replaceAll("-", "").slice(2);
const workoutLines = (workout: Workout) => [...workout.lines, ...(workout.targets ?? [])];

export function WorkoutDraftView({ onFinished }: { onFinished: () => void }) {
  const editor = useSavedEditor<Workout | null>("workout-draft", null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [next, setNext] = useState<Snapshot<Workout | null> | null>(null);
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

  const loadTemplates = async () => {
    const [history, savedNext] = await Promise.all([
      request<Snapshot<Workout[]>>("workouts"),
      request<Snapshot<Workout | null>>("next-workout"),
    ]);
    setWorkouts(history.value);
    setNext(savedNext);
  };
  useEffect(() => { void loadTemplates().catch(cause => setError((cause as Error).message)); }, []);

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const editedDraft = () => ({
    date: draft!.date,
    lines: draftText.split("\n").map(line => line.trim()).filter(Boolean),
  });
  const start = (workout?: Workout, clearNext = false) => act(async () => {
    const nextDraft = { date: today(), lines: workout ? workoutLines(workout) : [] };
    editor.edit(nextDraft);
    setDraftText(nextDraft.lines.join("\n"));
    await editor.save();
    if (clearNext && next) setNext(await request("next-workout", "PUT", null, next.revision));
    setConflict(false);
  });
  const save = () => act(async () => {
    if (!draft) return;
    editor.edit(editedDraft());
    await editor.save();
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
      if (cause instanceof ApiError && [400, 404, 412].includes(cause.status)) {
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
    await loadTemplates();
  });
  const discard = () => act(async () => {
    if (!window.confirm("Discard the current workout draft?")) return;
    if (editor.saving) return;
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
  if (!draft) return <main className="page-content workout-picker">
    <div className="page-intro"><div><p className="eyebrow">New workout</p><h1>Start from a previous session</h1><p className="intro-copy">Choose a past workout to copy its exercises, or begin empty.</p></div></div>
    {warning}
    {finishAttempt && <button className="input-save-button" disabled={busy} onClick={() => void finish()}>Check previous finish</button>}
    {next?.value && <button className="input-save-button" disabled={busy || !!finishAttempt} onClick={() => void start(next.value!, true)}>Start next workout: {workoutLines(next.value)[0] ?? "saved template"}</button>}
    <button className="archive-button" disabled={busy || !!finishAttempt} onClick={() => void start()}>Start empty workout</button>
    <div className="workout-template-list">
      {workouts.map((workout, index) => <div className="workout-template-row" key={`${workout.date}-${index}`}>
        <button className="workout-template" disabled={busy || !!finishAttempt} onClick={() => void start(workout)}><strong>{inputDate(workout.date)}</strong><span>{workoutLines(workout).join(" · ") || "No exercises"}</span></button>
        <button className="archive-button" disabled={busy || !next || !!finishAttempt} onClick={() => void act(async () => { setNext(await request("next-workout", "PUT", workout, next!.revision)); })}>Set as next</button>
      </div>)}
    </div>
  </main>;

  return <main className="page-content input-editor-page">
    <div className="page-intro"><div><p className="eyebrow">Current workout</p><h1>Train, then finish</h1><p className="intro-copy">Save keeps this as a draft. Finish adds it to your completed log.</p></div></div>
    {warning}
    <label className="workout-date-label">Date <input type="date" value={inputDate(draft.date)} onChange={event => editor.edit({ ...editedDraft(), date: logDate(event.target.value) })} disabled={busy || editor.saving || !!finishAttempt} /></label>
    <textarea className="workout-input" value={draftText} onChange={event => {
      setDraftText(event.target.value);
      editor.edit({ date: draft.date, lines: event.target.value.split("\n").map(line => line.trim()).filter(Boolean) });
    }} disabled={busy || editor.saving || !!finishAttempt} aria-label="Current workout exercises" spellCheck={false} />
    {conflict && <div className="input-editor-error">A completed workout already exists for this date. <button type="button" onClick={() => void finish("merge")}>Merge</button> <button type="button" onClick={() => void finish("overwrite")}>Overwrite</button></div>}
    {finishAttempt && <p>Finish is awaiting confirmation. Retry to check it safely.</p>}
    <div className="input-editor-actions"><button type="button" className="back-button" onClick={() => void discard()} disabled={busy || editor.saving || !!finishAttempt}>Discard draft</button><div><button type="button" className="archive-button" onClick={() => void save()} disabled={busy || editor.saving || !!finishAttempt}>Save draft</button> <button type="button" className="input-save-button" onClick={() => void finish()} disabled={busy || editor.saving || !!finishAttempt}>{busy ? "Saving…" : finishAttempt ? "Retry finish" : "Finish workout"}</button></div></div>
  </main>;
}
