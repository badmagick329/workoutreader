import { Exercise } from "./exercise";
import { splitLinesByDate } from "./parser";
import { writeExercisesToCsv } from "./csv-writer";
const print = console.log;

async function main() {
  const text = await Bun.file("./data/input.txt").text();
  const splitLines = splitLinesByDate(text);

  let exercises = [] as Exercise[];
  for (const [date, lines] of splitLines) {
    for (const line of lines) {
      const result = Exercise.fromLine(date, line);
      exercises = exercises.concat(result);
    }
  }
  print(exercises.map((e) => e.toString()).join("\n"));

  // Write CSV export
  await writeExercisesToCsv(exercises, "./data/output.csv");
  print(`\nExported ${exercises.length} sets to data/output.csv`);
}

main();
