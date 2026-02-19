export function parseYYMMDD(dateStr: string): Date {
  const year = 2000 + parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1;
  const day = parseInt(dateStr.substring(4, 6));
  return new Date(year, month, day);
}

export function isWithinLastDays(dateStr: string, days: number): boolean {
  if (!dateStr) return false;
  const valueDate = parseYYMMDD(dateStr);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return valueDate > threshold;
}
