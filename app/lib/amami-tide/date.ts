const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function getTokyoToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function normalizeDateParam(value: string | string[] | undefined, year = 2026): string {
  const raw = Array.isArray(value) ? value[0] : value;
  const fallback = getTokyoToday().startsWith(`${year}-`) ? getTokyoToday() : `${year}-01-01`;
  if (!raw || !DATE_RE.test(raw)) return fallback;
  const parsed = new Date(`${raw}T00:00:00+09:00`);
  if (Number.isNaN(parsed.getTime()) || Number(raw.slice(0, 4)) !== year) return fallback;
  return raw;
}

export function formatJapaneseDate(dateIso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${dateIso}T12:00:00+09:00`));
}

export function addDays(dateIso: string, amount: number): string {
  const date = new Date(`${dateIso}T12:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
