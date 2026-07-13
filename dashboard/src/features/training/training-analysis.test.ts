import { describe, expect, test } from "bun:test";
import { Exercise } from "../../../../src/exercise";
import {
  calculateEstimated1RM,
  getProgressReport,
  getWorkoutSessions,
} from "./training-analysis";
import type { ExerciseData } from "@/shared/workout-types";

function set(
  date: string,
  name: string,
  weight: number,
  reps: number,
): ExerciseData {
  return { date, name, weight, reps, isBarbell: false } as ExerciseData;
}

describe("training analysis", () => {
  test("uses the set with the highest estimated 1RM for a loaded session", () => {
    const report = getProgressReport([
      set("260101", "bench press", 100, 5),
      set("260101", "bench press", 95, 8),
    ]);
    const lift = report.lifts[0]!;

    expect(lift.latest.topSet.weight).toBe(95);
    expect(lift.latest.topSet.reps).toBe(8);
    expect(lift.latest.metric).toBeCloseTo(calculateEstimated1RM(95, 8));
  });

  test("uses best reps for bodyweight sessions", () => {
    const report = getProgressReport([
      set("260101", "pull up", 1, 8),
      set("260101", "pull up", 1, 11),
    ]);

    expect(report.lifts[0]!.isBodyweight).toBe(true);
    expect(report.lifts[0]!.latest.metric).toBe(11);
    expect(report.lifts[0]!.latest.topSet.reps).toBe(11);
  });

  test("requires six exact-name sessions and compares the last three to the prior three", () => {
    const exercises: ExerciseData[] = [
      set("260101", "squat", 100, 5),
      set("260102", "squat", 100, 5),
      set("260103", "squat", 100, 5),
      set("260104", "squat", 110, 5),
      set("260105", "squat", 110, 5),
      set("260106", "squat", 110, 5),
      set("260101", "leg press", 200, 8),
      set("260102", "leg press", 200, 8),
    ];
    const report = getProgressReport(exercises);
    const squat = report.lifts.find((lift) => lift.name === "squat")!;
    const legPress = report.lifts.find((lift) => lift.name === "leg press")!;

    expect(squat.trend).toBe("improving");
    expect(squat.changeRatio).toBeGreaterThan(0.025);
    expect(legPress.trend).toBe("baseline");
    expect(legPress.changeRatio).toBeNull();
  });

  test("does not let a changed set count alter session direction", () => {
    const exercises: ExerciseData[] = [
      set("260101", "bench press", 100, 5),
      set("260102", "bench press", 100, 5),
      set("260103", "bench press", 100, 5),
      set("260104", "bench press", 100, 5),
      set("260104", "bench press", 80, 8),
      set("260105", "bench press", 100, 5),
      set("260105", "bench press", 80, 8),
      set("260106", "bench press", 100, 5),
      set("260106", "bench press", 80, 8),
    ];
    const lift = getProgressReport(exercises).lifts[0]!;

    expect(lift.trend).toBe("holding");
    expect(lift.changeRatio).toBe(0);
  });

  test("keeps substituted exercise names independent", () => {
    const exercises = [
      set("260101", "leg press", 200, 8),
      set("260102", "leg press", 200, 8),
      set("260103", "leg press", 200, 8),
      set("260104", "squat", 100, 5),
      set("260105", "squat", 100, 5),
      set("260106", "squat", 100, 5),
    ];
    const report = getProgressReport(exercises);

    expect(report.lifts).toHaveLength(2);
    expect(report.lifts.every((lift) => lift.trend === "baseline")).toBe(true);
  });

  test("groups completed sets into dated sessions and never creates a session for an incomplete line", () => {
    const completed = Exercise.fromLine("260101", "squat 30b 6 6");
    const incomplete = Exercise.fromLine("260101", "leg press");
    const sessions = getWorkoutSessions([...completed, ...incomplete]);

    expect(incomplete).toEqual([]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.exercises).toHaveLength(1);
    expect(sessions[0]!.exercises[0]!.name).toBe("squat");
  });
});
