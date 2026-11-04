/**
 * Pure: the greeting for a local hour (0–23): 5–11 morning, 12–17 afternoon, else evening. The web
 * dashboard uses the same rule (revenue-os-frontend components/dashboard/HomeOverview.tsx dayPartOf).
 */
/** Titles that are not a first name on their own ("Dr. Hashmi" greets as "Dr. Hashmi", not "Dr."). */
const NAME_TITLES = /^(dr|mr|mrs|ms|miss|prof|sir|eng|sheikh|sheikha)\.?$/i;

/** Pure: a person's first name for greetings (a leading title keeps the next word). Same rule as the web's lib/personName.ts. */
export function firstNameOf(name: string | null | undefined): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const [first = "", second] = parts;
  if (second && NAME_TITLES.test(first)) return `${first} ${second}`;
  return first;
}

export function greetingKey(hour: number): "today.greetingMorning" | "today.greetingAfternoon" | "today.greetingEvening" {
  if (hour >= 5 && hour < 12) return "today.greetingMorning";
  if (hour >= 12 && hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}
