/**
 * Agency white-label colours. A port of brandThemeVars() in revenue-os-frontend/lib/branding.ts: the same
 * contrast rule (solid fills and brand text reach 4.5:1), returned as palette overrides instead of CSS variables.
 */
import type { ColorScheme, Palette } from "./tokens";

type Rgb = [number, number, number];

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function isHexColor(v: string | null | undefined): v is string {
  return typeof v === "string" && HEX_RE.test(v.trim());
}

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.trim().slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;
}

function shade(rgb: Rgb, amount: number): Rgb {
  return [rgb[0] * (1 - amount), rgb[1] * (1 - amount), rgb[2] * (1 - amount)];
}

function tint(rgb: Rgb, amount: number): Rgb {
  return [rgb[0] + (255 - rgb[0]) * amount, rgb[1] + (255 - rgb[1]) * amount, rgb[2] + (255 - rgb[2]) * amount];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function untilReadable(rgb: Rgb, against: string, min: number, dir: "darken" | "lighten"): Rgb {
  let out = rgb;
  for (let step = 0; step < 14 && contrastRatio(rgbToHex(out), against) < min; step++) out = dir === "darken" ? shade(out, 0.08) : tint(out, 0.1);
  return out;
}

const WHITE = "#ffffff";
const DARK_INK = "#0b0b0d";

/**
 * Palette overrides for an agency colour, or an empty object (keep Revenue OS colours) when the colour is
 * missing or invalid. Unlike the web, the text on a solid fill is chosen by contrast (white or near-black),
 * so a light agency colour in dark mode never ends up with unreadable white text.
 */
export function brandPalette(primary: string | null | undefined, scheme: ColorScheme, surface: string): Partial<Palette> {
  if (!isHexColor(primary)) return {};
  const base = hexToRgb(primary);
  const rgb = base.join(", ");
  const hex = rgbToHex(base);

  if (scheme === "light") {
    const fill = untilReadable(base, WHITE, 4.5, "darken");
    const fillHex = rgbToHex(fill);
    return {
      primary: rgbToHex(untilReadable(base, surface, 4.5, "darken")),
      primaryFill: fillHex,
      primaryFillPressed: rgbToHex(shade(fill, 0.12)),
      onPrimary: WHITE,
      primarySubtle: `rgba(${rgb}, 0.1)`,
      primarySubtlePressed: `rgba(${rgb}, 0.18)`,
      primaryBorder: `rgba(${rgb}, 0.32)`,
      primaryText: fillHex,
      borderFocus: hex,
    };
  }

  const text = rgbToHex(untilReadable(base, surface, 4.5, "lighten"));
  const fillHex = hex;
  const onPrimary = contrastRatio(fillHex, WHITE) >= 4.5 ? WHITE : DARK_INK;
  return {
    primary: text,
    primaryFill: fillHex,
    primaryFillPressed: rgbToHex(tint(base, 0.12)),
    onPrimary,
    primarySubtle: `rgba(${rgb}, 0.14)`,
    primarySubtlePressed: `rgba(${rgb}, 0.22)`,
    primaryBorder: `rgba(${rgb}, 0.32)`,
    primaryText: text,
    borderFocus: text,
  };
}
