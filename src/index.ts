import { Exercise } from "./exercise";
import { splitLinesByDate } from "./parser";
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
}

main();
