import { Exercise } from "./exercise";
import { tryParseNamePart, tryParseReps, tryParseWeight } from "./parser";

export type ExerciseSetParams = {
  name: string;
  weight: number;
  isBarbell: boolean;
  isBodyweight: boolean;
  reps: number;
};

export class ExerciseSetBuilder {
  _params: Partial<ExerciseSetParams> = {};

  constructor(params?: Partial<ExerciseSetParams>) {
    if (params) this._params = params ?? {};
  }

  parse(text: string) {
    return this.tryParseName(text)
      .tryParseWeight(text)
      .tryParseRepsAndMakeBuildable(text);
  }

  private tryParseName(text: string) {
    const namePart = tryParseNamePart(text);
    if (namePart) {
      if (this._params.weight !== undefined || this._params.reps !== undefined || /^[-+\d]/.test(namePart)) {
        throw new Error(`Unexpected token: ${text}`);
      }
      this._params.name = this._params.name
        ? `${this._params.name} ${namePart}`
        : namePart;
    }

    return this;
  }

  private tryParseWeight(text: string) {
    const weightResult = tryParseWeight(text);
    if (weightResult !== null) {
      this._params = {
        ...this._params,
        weight: weightResult.value,
        isBarbell: weightResult.isBarbell,
        isBodyweight: false,
        reps: undefined,
      };
    }

    return this;
  }

  private tryParseRepsAndMakeBuildable(text: string) {
    const reps = tryParseReps(text);
    if (reps !== null) {
      if (reps === 0) throw new Error("Reps must be greater than zero");
      if (!this._params.name) throw new Error("Enter an exercise name before reps");
      return new ExerciseSetBuilder({
        ...this._params,
        weight: this._params.weight ?? 1,
        isBodyweight: this._params.isBodyweight ?? true,
        isBarbell: this._params.isBarbell || false,
        reps,
      });
    }

    return this;
  }

  canBuild(): boolean {
    return Boolean(
      this._params.name &&
        this._params.weight !== undefined &&
        this._params.reps &&
        this._params.isBarbell !== undefined
    );
  }

  build() {
    if (!this.canBuild()) {
      throw new Error(`ExerciseSet is not buildable: ${JSON.stringify(this)}`);
    }
    return new ExerciseSet(this._params as ExerciseSetParams);
  }
}

export class ExerciseSet {
  params: ExerciseSetParams;

  constructor(params: ExerciseSetParams) {
    this.params = params;
  }

  toExercise(date: string): Exercise {
    return new Exercise({
      date,
      name: this.params.name,
      weight: this.params.weight,
      reps: this.params.reps,
      isBarbell: this.params.isBarbell,
      isBodyweight: this.params.isBodyweight,
    });
  }
}
