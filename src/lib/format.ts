/** Pure formatting helpers (no React). Built on Intl — no date or number library. */

/**
 * Pure: "Revenue Won" → "Revenue won", "Start Calling" → "Start calling", the app's sentence case. Words in
 * capitals ("AI", "AED", "CRM") and words with a capital inside ("WhatsApp", "iPhone") stay as they are.
 */
export function sentenceCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => (i === 0 || w.length < 2 || w === w.toUpperCase() || /[A-Z]/.test(w.slice(1)) ? w : w.charAt(0).toLowerCase() + w.slice(1)))
    .join(" ");
}

export function initials(name: string): string {
  // An email address stands in for a missing name: use the part before the @.
  const source = name.includes("@") ? name.slice(0, name.indexOf("@")) : name;
  const parts = source.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

/**
 * Deterministic non-negative hash (same input → same output on every device). FNV-1a: it spreads well over small
 * buckets, unlike `h * 31 + c`, which modulo 6 collapses to the sum of the character codes.
 */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function toDate(v: Date | string | number): Date {
  return v instanceof Date ? v : new Date(v);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const DAY = 86_400_000;

/**
 * Words for phones whose Intl can't say them (Hermes on some Android builds has no RelativeTimeFormat):
 * "Now" / "Yesterday" and the "5m" / "3h" list shorthands, per app language.
 */
const SHORT: Record<string, { now: string; yesterday: string; min: (n: number) => string; hour: (n: number) => string }> = {
  en: { now: "Now", yesterday: "Yesterday", min: (n) => `${n}m`, hour: (n) => `${n}h` },
  az: { now: "İndi", yesterday: "Dünən", min: (n) => `${n} dəq`, hour: (n) => `${n} saat` },
  ar: { now: "الآن", yesterday: "أمس", min: (n) => `${n} د`, hour: (n) => `${n} س` },
};
function shortWords(locale: string): (typeof SHORT)[string] {
  return SHORT[locale.slice(0, 2).toLowerCase()] ?? SHORT.en!;
}

/** "now" / "Yesterday" in the user's language (Intl), capitalised; the table above where Intl can't say it. */
function relativeWord(locale: string, value: number, unit: "second" | "day", fallback: string): string {
  try {
    const word = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
    // An engine without this locale answers in English: use our own word instead.
    if (!locale.startsWith("en") && /^[a-z\s]+$/i.test(word)) return fallback;
    return word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
  } catch {
    return fallback;
  }
}

/**
 * Short relative time for lists: "now", "5m", "3h", "Yesterday", "Mon", "12 Oct", "12 Oct 2025".
 * `now` is injectable for tests.
 */
export function relativeTime(value: Date | string | number, locale = "en-US", now: Date = new Date()): string {
  const d = toDate(value);
  const t = d.getTime();
  if (Number.isNaN(t)) return "";
  const diff = now.getTime() - t;
  const words = shortWords(locale);
  if (diff < 60_000 && diff > -60_000) return relativeWord(locale, 0, "second", words.now).toLocaleLowerCase(locale);
  if (diff > 0 && diff < 3_600_000) return words.min(Math.floor(diff / 60_000));
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
  if (days === 0) return diff > 0 ? words.hour(Math.floor(diff / 3_600_000)) : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
  if (days === 1) return relativeWord(locale, -1, "day", words.yesterday);
  if (days > 1 && days < 7) return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(locale, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Full date and time, for long-press details and meeting rows. */
export function dateTime(value: Date | string | number, locale = "en-US"): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}

export function timeOfDay(value: Date | string | number, locale = "en-US"): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
}

/** Money in the workspace currency. Whole amounts drop the decimals; unknown currency codes fall back gracefully. */
export function money(amount: number | null | undefined, currency = "USD", locale = "en-US", opts: { compact?: boolean } = {}): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: opts.compact ? "compact" : "standard",
      minimumFractionDigits: opts.compact || whole ? 0 : 2,
      maximumFractionDigits: opts.compact ? 1 : whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(locale)}`;
  }
}

/** 1,234 / 12.5K for counters. */
export function count(n: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

/** "+12%", "−4%", "0%" — real minus sign, for KPI changes. */
export function percentChange(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return "";
  const r = Math.round(pct);
  if (r === 0) return "0%";
  return `${r > 0 ? "+" : "−"}${Math.abs(r)}%`;
}
