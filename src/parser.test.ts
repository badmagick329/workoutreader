import { describe, expect, test } from "bun:test";
import { Exercise } from "./exercise";
import { parseExercises, parseWorkouts, validateWorkout } from "./workout-log";
describe("workout log", () => {
  test("retains repeated date blocks in both representations", () => {
    const text = "260101\nsquat 30b 5\n260101\nbench 20b 8";
    expect(parseWorkouts(text)[0]!.lines).toHaveLength(2);
    expect(parseExercises(text)).toHaveLength(2);
  });
  test("records an empty bar and repeated reps correctly", () => {
    expect(Exercise.fromLine("260101", "squat 0b 5 6").map(set => [set.weight, set.reps])).toEqual([[20, 5], [20, 6]]);
  });
  test("rejects malformed tokens rather than inventing sets", () => {
    expect(() => parseExercises("260101\nsquat 30b 5 typo")).toThrow("Line 2");
    expect(() => Exercise.fromLine("260101", "squat 30| 5")).toThrow();
    expect(() => Exercise.fromLine("260101", "squat 30b 0")).toThrow();
    expect(() => Exercise.fromLine("260101", "20w 5")).toThrow();
  });
  test("accepts incomplete targets and checks calendar dates and line boundaries", () => {
    expect(Exercise.fromLine("260101", "leg press")).toEqual([]);
    expect(() => validateWorkout({ date: "260230", lines: [] })).toThrow();
    expect(() => validateWorkout({ date: "260101", lines: ["260102"] })).toThrow();
    expect(() => validateWorkout({ date: "260101", lines: [null] })).toThrow();
  });
});
