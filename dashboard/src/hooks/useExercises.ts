import { useEffect, useState } from "react";
import { fetchExercises } from "@/services/exerciseApi";
import type { ExerciseData } from "@/shared/workout-types";

export function useExercises() {
  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExercises()
      .then((data) => {
        setExercises(data);
        setLoading(false);
      })
      .catch((err) => console.error(err));
  }, []);

  return { exercises, loading };
}
