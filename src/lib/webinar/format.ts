const DAY_NAMES = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];
const MONTH_LONG = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** "Do 04.06.2026 · 10:00–11:00 Uhr MESZ" */
export function slotLongLabel(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const day = DAY_NAMES[s.getUTCDay()].slice(0, 2);
  return `${day} ${pad(s.getUTCDate())}.${pad(s.getUTCMonth() + 1)}.${s.getUTCFullYear()} · ${pad(
    s.getUTCHours()
  )}:${pad(s.getUTCMinutes())}–${pad(e.getUTCHours())}:${pad(
    e.getUTCMinutes()
  )} Uhr MESZ`;
}

/** "Donnerstag, 4. Juni 2026" */
export function slotDayLabel(startsAt: string): string {
  const s = new Date(startsAt);
  return `${DAY_NAMES[s.getUTCDay()]}, ${s.getUTCDate()}. ${
    MONTH_LONG[s.getUTCMonth()]
  } ${s.getUTCFullYear()}`;
}

/** "10:00 – 11:00 Uhr (MESZ) · Online" */
export function slotTimeLabel(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())} – ${pad(
    e.getUTCHours()
  )}:${pad(e.getUTCMinutes())} Uhr (MESZ) · Online`;
}

/** "Jun" / "04" for the date badge */
export function slotDateBadge(startsAt: string): { m: string; d: string } {
  const s = new Date(startsAt);
  return { m: MONTH_SHORT[s.getUTCMonth()], d: pad(s.getUTCDate()) };
}

/** "Noch N Plätze" or "Nur noch N Plätze" (low when < 20% of capacity) */
export function seatsLabel(remaining: number, max: number): {
  text: string;
  low: boolean;
} {
  if (remaining === 0) return { text: "Warteliste", low: true };
  const low = remaining <= Math.max(5, Math.ceil(max * 0.2));
  return {
    text: low ? `Nur noch ${remaining} Plätze` : `Noch ${remaining} Plätze`,
    low,
  };
}
