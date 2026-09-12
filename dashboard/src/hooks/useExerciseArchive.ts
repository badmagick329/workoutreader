import { useCallback, useEffect, useRef, useState } from "react";
import { fetchExerciseSettings, setExerciseArchived } from "@/services/exerciseApi";
export function useExerciseArchive() {
  const [archivedExerciseNames, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const reload = useCallback(() => {
    const operation = queue.current.then(async () => {
      setLoading(true); setError(null);
      try { const result = await fetchExerciseSettings(); setNames(result.value.archivedExerciseNames); }
      catch (cause) { setError((cause as Error).message); }
      finally { setLoading(false); }
    });
    queue.current = operation;
    return operation;
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const setArchived = useCallback((name: string, archived: boolean): Promise<void> => {
    const operation = queue.current.then(async () => {
      try {
        const result = await setExerciseArchived(name, archived);
        setNames(result.value.archivedExerciseNames); setError(null);
      } catch (cause) { setError((cause as Error).message); }
    });
    queue.current = operation;
    return operation;
  }, []);
  return { archivedExerciseNames, loading, error, setArchived, reload };
}
