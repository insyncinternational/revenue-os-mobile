/**
 * Pure: how strong a new password looks, 0–4 (0 = nothing typed). Length counts most; mixing kinds of characters
 * (lower, upper, digits, symbols) lifts it. A guide for the meter, not a rule: the server's minimum still applies.
 */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  let score = pw.length >= 8 ? 1 : 0;
  if (pw.length >= 12) score += 1;
  if (kinds >= 3) score += 1;
  if (kinds === 4 || pw.length >= 16) score += 1;
  return Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
}
