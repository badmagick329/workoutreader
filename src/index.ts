import { parseExercises } from "./workout-log";
import { writeExercisesToCsv } from "./csv-writer";
const print = console.log;

async function main() {
  const text = await Bun.file("./data/input.txt").text();
  const exercises = parseExercises(text);
  print(exercises.map((e) => e.toString()).join("\n"));

  // Write CSV export
  await writeExercisesToCsv(exercises, "./data/output.csv");
  print(`\nExported ${exercises.length} sets to data/output.csv`);
}

main();
