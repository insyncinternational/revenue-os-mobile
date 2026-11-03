/**
 * Pure local-time helpers for picking and grouping by day (no date library). A "day key" is the user's
 * local calendar day as "YYYY-MM-DD"; a "time" is "HH:MM" in 24 h.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

/** Local midnight of a day key. */
export function dateOfKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Whole local days from `from` to `to` (0 = same day, 1 = tomorrow, −1 = yesterday). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

/** The next `count` days starting today. */
export function nextDays(now: Date, count: number): { key: string; date: Date }[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(startOfDay(now), i);
    return { key: dayKey(date), date };
  });
}

const FIRST_SLOT = 7 * 60;
const LAST_SLOT = 21 * 60 + 30;
const STEP = 30;

/** Half-hour slots 07:00–21:30; on today, only the ones still ahead (with 5 minutes to spare). */
export function timeSlots(day: string, now: Date): string[] {
  const today = day === dayKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes() + 5;
  const out: string[] = [];
  for (let m = FIRST_SLOT; m <= LAST_SLOT; m += STEP) {
    if (today && m < nowMin) continue;
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

/** A sensible time when a day is picked: 09:00, or today's next free slot (null when today is over). */
export function defaultTime(day: string, now: Date): string | null {
  const slots = timeSlots(day, now);
  return slots.includes("09:00") ? "09:00" : (slots[0] ?? null);
}

/** Day key + "HH:MM" (local) → ISO instant for the API. */
export function toIso(day: string, time: string): string {
  const d = dateOfKey(day);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

/** An ISO instant → its local day key and "HH:MM", for editing. */
export function splitIso(iso: string | null | undefined): { day: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return { day: dayKey(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** End of the user's local day, for "today" counts computed on the server. */
export function endOfDayIso(now: Date): string {
  const d = startOfDay(now);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
