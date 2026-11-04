import { t } from "@/i18n";

const TIERS = { Hot: { key: "contacts.hot", tone: "success" }, Warm: { key: "contacts.warm", tone: "warning" }, Cold: { key: "contacts.cold", tone: "danger" } } as const;

/** The server's lead tier in the app's language (Hot / Warm / Cold; anything else, like "Converted", as it comes). */
export function tierWord(tier: string): string {
  return tier in TIERS ? t(TIERS[tier as keyof typeof TIERS].key) : tier;
}

/** Its colour, the same as the score's: green hot, amber warm, red cold; "Converted" green; unknown none. */
export function tierTone(tier: string): "success" | "warning" | "danger" | null {
  return tier in TIERS ? TIERS[tier as keyof typeof TIERS].tone : tier === "Converted" ? "success" : null;
}
