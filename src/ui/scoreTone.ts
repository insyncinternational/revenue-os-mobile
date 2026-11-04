/** Pure: a 0–100 score's health colour — red below 40, amber below 70, green from 70. */
export function scoreTone(value: number): "danger" | "warning" | "success" {
  return value < 40 ? "danger" : value < 70 ? "warning" : "success";
}
