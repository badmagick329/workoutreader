const repsRegex = /^\d+$/;
const weightRegex = /^((?:\d{1,4})(?:(?:\.)(?:\d{1,4}))?)[bw]$/;

export function validateDate(date: string): void {
  if (!/^\d{6}$/.test(date)) throw new Error("Use a YYMMDD date");
  const value = new Date(Date.UTC(2000 + Number(date.slice(0, 2)), Number(date.slice(2, 4)) - 1, Number(date.slice(4))));
  if (value.toISOString().slice(2, 10).replaceAll("-", "") !== date) throw new Error(`Invalid date: ${date}`);
}

const splitLinesByDate = (text: string) => {
  const chunks = new Map() as Map<string, string[]>;
  const cleanLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => Boolean(l));
  let date = "";
  let currentChunk = [] as string[];

  for (const line of cleanLines) {
    const dateFound = /^\d{6}$/.test(line);

    if (!dateFound) {
      if (date === "") {
        throw new Error(`Workout text found without a date\n${line}`);
      }
      currentChunk.push(line);
    } else {
      if (currentChunk.length > 0 && date !== "") {
        chunks.set(date, [...(chunks.get(date) ?? []), ...currentChunk]);
      }
      date = line;
      validateDate(date);
      currentChunk = [];
    }
  }
  if (currentChunk.length > 0 && date !== "") {
    chunks.set(date, [...(chunks.get(date) ?? []), ...currentChunk]);
  }

  return chunks;
};

const tryParseReps = (text: string) => {
  const match = text.match(repsRegex);
  if (!match) {
    return null;
  }
  const value = parseInt(match[0], 10);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Failed to parse reps: ${text}`);
  }
  return value;
};

const tryParseWeight = (
  text: string
): {
  value: number;
  isBarbell: boolean;
} | null => {
  const match = text.match(weightRegex);
  if (!match) {
    return null;
  }

  const val = match[0];
  let value;
  if (val.includes(".")) {
    value = parseFloat(val);
  } else {
    value = parseInt(val, 10);
  }
  if (isNaN(value)) {
    throw new Error(`Failed to parse weight: ${text}`);
  }

  const isBarbell = match[0].endsWith("b");
  return {
    value,
    isBarbell,
  };
};

const tryParseNamePart = (text: string) => {
  if (!text.match(repsRegex) && !text.match(weightRegex)) {
    return text.toLowerCase();
  }
  return null;
};

export { splitLinesByDate, tryParseReps, tryParseWeight, tryParseNamePart };
