type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsAt(instant: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function localMidnightToUtc(year: number, month: number, day: number, timeZone: string) {
  const localAsUtc = Date.UTC(year, month - 1, day);
  let result = localAsUtc;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const observed = partsAt(new Date(result), timeZone);
    const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    result -= observedAsUtc - localAsUtc;
  }
  return new Date(result);
}

export function localDayRangeStart(timeZone: string, days: number, now = new Date()) {
  const current = partsAt(now, timeZone);
  const target = new Date(Date.UTC(current.year, current.month - 1, current.day - Math.max(0, days - 1)));
  return localMidnightToUtc(target.getUTCFullYear(), target.getUTCMonth() + 1, target.getUTCDate(), timeZone).toISOString();
}
