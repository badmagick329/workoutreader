import { useEffect, useState } from "react";
import { fetchWorkoutInput, saveWorkoutInput } from "@/services/exerciseApi";

export function WorkoutInputView({ onSaved }: { onSaved: () => void }) {
  const [text, setText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkoutInput()
      .then((input) => {
        setText(input);
        setSavedText(input);
      })
      .catch(() => setError("Workout input could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveWorkoutInput(text);
      setSavedText(text);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Workout input could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const dirty = text !== savedText;

  return (
    <main className="page-content input-editor-page">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Workout log</p>
          <h1>Edit your training data</h1>
          <p className="intro-copy">Changes replace the saved log when you select Save.</p>
        </div>
      </div>
      {error && <p className="input-editor-error" role="alert">{error}</p>}
      <textarea
        className="workout-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={loading || saving}
        aria-label="Workout log"
        spellCheck={false}
      />
      <div className="input-editor-actions">
        <span>{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <button type="button" className="input-save-button" onClick={save} disabled={loading || saving || !dirty}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </main>
  );
}
