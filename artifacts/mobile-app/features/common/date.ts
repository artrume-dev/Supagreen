export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function getRecentDateStrings(days: number): string[] {
  const boundedDays = Math.min(Math.max(days, 1), 120);
  const dates: string[] = [];
  const current = new Date();

  for (let i = 0; i < boundedDays; i += 1) {
    const date = new Date(current);
    date.setDate(current.getDate() - i);
    dates.push(date.toISOString().split("T")[0]);
  }

  return dates;
}
