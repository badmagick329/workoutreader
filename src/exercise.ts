import { ExerciseSetBuilder } from "./exercise-set";

export class Exercise {
  readonly date: string;
  readonly name: string;
  readonly weight: number;
  readonly reps: number;
  readonly isBarbell: boolean;

  static readonly barbellWeight = 20;

  constructor(params: {
    date: string;
    name: string;
    weight: number;
    reps: number;
    isBarbell: boolean;
  }) {
    this.date = params.date;
    this.name = params.name;
    this.weight = params.isBarbell
      ? params.weight + Exercise.barbellWeight
      : params.weight;
    this.reps = params.reps;
    this.isBarbell = params.isBarbell;
  }

  static fromLine(date: string, line: string): Exercise[] {
    const exercises = [] as Exercise[];
    let setBuilder = new ExerciseSetBuilder();

    const cleanedLines = line
      .split(" ")
      .map((l) => l.trim())
      .filter((l) => Boolean(l));

    for (const word of cleanedLines) {
      setBuilder = setBuilder.parse(word);
      if (!setBuilder.canBuild()) {
        continue;
      }

      const set = setBuilder.build();
      exercises.push(set.toExercise(date));
    }

    return exercises;
  }

  toString() {
    return `[${this.date}] ${this.name} ${this.weight}${
      this.isBarbell ? "b" : "w"
    } x ${this.reps}`;
  }
}
