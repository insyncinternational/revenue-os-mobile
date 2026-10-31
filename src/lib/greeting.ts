/** Pure: the greeting for a local hour (0–23). */
export function greetingKey(hour: number): "today.greetingMorning" | "today.greetingAfternoon" | "today.greetingEvening" {
  if (hour < 12) return "today.greetingMorning";
  if (hour < 18) return "today.greetingAfternoon";
  return "today.greetingEvening";
}
