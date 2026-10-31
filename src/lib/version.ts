/** Pure: true when `version` is older than `minimum` ("1.2.10" vs "1.10.0"). Unreadable input never blocks. */
export function isOlderThan(version: string | null | undefined, minimum: string | null | undefined): boolean {
  const parse = (v: string | null | undefined) => (typeof v === "string" && /^\d+(\.\d+){0,2}$/.test(v.trim()) ? v.trim().split(".").map(Number) : null);
  const a = parse(version);
  const b = parse(minimum);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
