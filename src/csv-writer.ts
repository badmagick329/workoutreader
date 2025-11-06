type CsvOptions = {
  delimiter?: string; // default ","
  eol?: string; // default "\r\n"
  alwaysQuote?: boolean; // default false
  bom?: boolean; // default false (set true for Excel)
  nullAsEmpty?: boolean; // default true (else write "NULL")
  hardenForExcel?: boolean; // default true (guards =+-@ start)
};

function csvEscape(value: unknown, opts: CsvOptions): string {
  const delimiter = opts.delimiter ?? ",";
  const eol = opts.eol ?? "\r\n";
  const alwaysQuote = opts.alwaysQuote ?? false;
  const nullAsEmpty = opts.nullAsEmpty ?? true;
  const harden = opts.hardenForExcel ?? true;

  if (value === null || value === undefined) return nullAsEmpty ? "" : "NULL";

  // Convert to string without losing precision on bigints
  let s = typeof value === "bigint" ? value.toString() : String(value);

  // Optional Excel hardening: neutralize potential formulas from untrusted input
  if (harden && /^[=\-+@]/.test(s)) {
    s = "'" + s; // makes Excel treat it as text
  }

  const needsQuote =
    alwaysQuote ||
    s.includes(delimiter) ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r") ||
    /^\s/.test(s) || // leading space
    /\s$/.test(s); // trailing space

  if (needsQuote) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV(
  headers: string[],
  rows: Array<Record<string, unknown> | unknown[]>,
  options: CsvOptions = {}
): string {
  const delimiter = options.delimiter ?? ",";
  const eol = options.eol ?? "\r\n";
  const bom = options.bom ?? false;

  const writeRow = (cells: unknown[]) =>
    cells.map((c) => csvEscape(c, options)).join(delimiter) + eol;

  let out = "";
  if (bom) out += "\uFEFF"; // UTF-8 BOM for Excel

  // header
  out += writeRow(headers);

  // rows (support array-of-arrays or array-of-objects)
  for (const r of rows) {
    const cells = Array.isArray(r) ? r : headers.map((h) => (r as any)[h]);
    out += writeRow(cells);
  }
  return out;
}

// Example usage (Bun):
// const headers = ["id", "name", "notes"];
// const rows = [
//   { id: 1, name: 'Alice', notes: 'Hello, world' },
//   { id: 2, name: 'Bob',   notes: 'He said "hi"' },
//   { id: 3, name: 'Carol', notes: "Line1\nLine2" },
// ];

// const csv = toCSV(headers, rows, { bom: true, hardenForExcel: true });
// await Bun.write("people.csv", csv);
