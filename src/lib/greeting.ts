/**
 * Pure: the greeting for a local hour (0–23): 5–11 morning, 12–17 afternoon, else evening. The web
 * dashboard uses the same rule (revenue-os-frontend components/dashboard/HomeOverview.tsx dayPartOf).
 */
export function greetingKey(hour: number): "today.greetingMorning" | "today.greetingAfternoon" | "today.greetingEvening" {
  if (hour >= 5 && hour < 12) return "today.greetingMorning";
  if (hour >= 12 && hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}
