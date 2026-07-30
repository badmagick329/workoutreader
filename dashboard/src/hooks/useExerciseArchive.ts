import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchExerciseSettings,
  saveExerciseSettings,
} from "@/services/exerciseApi";

export function useExerciseArchive() {
  const [archivedExerciseNames, setArchivedExerciseNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const archivedNamesRef = useRef<string[]>([]);

  useEffect(() => {
    archivedNamesRef.current = archivedExerciseNames;
  }, [archivedExerciseNames]);

  useEffect(() => {
    fetchExerciseSettings()
      .then((settings) => setArchivedExerciseNames(settings.archivedExerciseNames))
      .catch((err: unknown) => {
        console.error(err);
        setError("Exercise archive could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, []);

  const setArchived = useCallback(async (name: string, archived: boolean) => {
    const normalizedName = name.trim().toLowerCase();
    const next = archived
      ? Array.from(new Set([...archivedNamesRef.current, normalizedName])).sort()
      : archivedNamesRef.current.filter((item) => item !== normalizedName);
    archivedNamesRef.current = next;
    setArchivedExerciseNames(next);
    setError(null);

    try {
      const settings = await saveExerciseSettings(next);
      archivedNamesRef.current = settings.archivedExerciseNames;
      setArchivedExerciseNames(settings.archivedExerciseNames);
    } catch (err) {
      console.error(err);
      setError("Exercise archive could not be saved.");
      const settings = await fetchExerciseSettings().catch(() => null);
      if (settings) {
        archivedNamesRef.current = settings.archivedExerciseNames;
        setArchivedExerciseNames(settings.archivedExerciseNames);
      }
    }
  }, []);

  return { archivedExerciseNames, loading, error, setArchived };
}
