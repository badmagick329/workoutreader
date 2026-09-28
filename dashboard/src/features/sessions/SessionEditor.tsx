import { useState } from "react";
import { useSavedEditor } from "@/hooks/useSavedEditor";
import { parseExercises, type Workout } from "../../../../src/workout-log";
import { formatSet } from "@/features/training/training-analysis";

export function SessionEditor({ date, onSaved, onClose }: { date: string; onSaved: () => void; onClose: () => void }) {
  const editor = useSavedEditor<Workout>(`sessions/${date}`, { date, lines: [] });
  const [preview, setPreview] = useState<string[] | null>(null);
  const [undo, setUndo] = useState<Workout | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const save = async () => {
    try {
      const { request } = await import("@/services/exerciseApi");
      const before = await request<{ value: Workout }>(`sessions/${date}`);
      await editor.save(); setUndo(before.value); setPreview(null); setMessage("Session saved"); onSaved();
    } catch (cause) { setMessage((cause as Error).message); }
  };
  const remove = async () => {
    if (!window.confirm("Delete this whole session from your log? The previous log is kept as a server backup.")) return;
    try {
      const { request } = await import("@/services/exerciseApi");
      await request(`sessions/${date}`, "DELETE", undefined, editor.revision());
      onSaved(); onClose();
    } catch (cause) { setMessage((cause as Error).message); }
  };
  return <section className="session-editor" aria-label="Edit session">
    <h2>Edit session</h2>
    <p>One exercise per line. Your edits are kept on this device.</p>
    {(editor.error || message) && <p role="status">{editor.error || message}</p>}
    <textarea className="workout-input" aria-label="Session exercises" disabled={!editor.ready || editor.saving} value={editor.value.lines.join("\n")} onChange={event => { editor.edit({ ...editor.value, lines: event.target.value.split("\n") }); setPreview(null); }} />
    {preview && <div aria-label="Save preview"><h3>Completed sets to save</h3>{preview.map((line, index) => <p key={index}>{line}</p>)}</div>}
    <div className="input-editor-actions">
      <button className="archive-button" disabled={editor.saving} onClick={onClose}>Close</button>
      <button className="archive-button danger-button" disabled={!editor.ready || editor.saving || editor.dirty} onClick={() => void remove()}>Delete session</button>
      {undo && <button className="archive-button" onClick={() => { editor.edit(undo); setUndo(null); setPreview(null); setMessage("Previous sets restored in editor. Preview and save to apply."); }}>Undo edit</button>}
      <button className="archive-button" onClick={() => { if (window.confirm("Discard local edits and load the saved session?")) { void editor.load(true); setPreview(null); } }}>Load saved session</button>
      {preview ? <button className="input-save-button" disabled={editor.saving || editor.conflict} onClick={() => void save()}>Save session</button> : <button className="input-save-button" disabled={!editor.ready || !editor.dirty} onClick={() => {
        try { const sets = parseExercises([date, ...editor.value.lines].join("\n")); if (!sets.length) throw new Error("Keep at least one completed set"); setPreview(sets.map(set => `${set.name}: ${formatSet(set, set.isBodyweight)}`)); setMessage(null); }
        catch (cause) { setMessage((cause as Error).message); }
      }}>Preview changes</button>}
    </div>
  </section>;
}
