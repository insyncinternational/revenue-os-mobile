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

/** Pure: a #rrggbb colour at the given opacity (0–1) as rgba(); anything else comes back unchanged. */
export function withAlpha(color: string, alpha: number): string {
  if (!isHexColor(color)) return color;
  const [r, g, b] = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

/**
 * A colour as an opaque colour plus its opacity: "rgba(87, 211, 119, 0.12)" → { color: "rgb(87, 211, 119)", opacity: 0.12 }.
 * For SVG gradient stops, which ignore the alpha inside a colour on Android and draw it solid.
 */
export function splitAlpha(color: string): { color: string; opacity: number } {
  const m = color.trim().match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (!m) return { color, opacity: 1 };
  return { color: `rgb(${m[1]}, ${m[2]}, ${m[3]})`, opacity: Math.min(1, Math.max(0, Number(m[4]))) };
}

/**
 * An opaque hex for `color` drawn over `base` — for surfaces that take no transparency (home-screen widgets).
 * "rgba(255, 255, 255, 0.14)" over "#7c2d12" → a lighter brown-orange. A hex colour comes back as it is.
 */
export function flattenOver(color: string, base: string): string {
  if (isHexColor(color)) return color;
  const { color: rgb, opacity } = splitAlpha(color);
  const m = rgb.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
  if (!m || !isHexColor(base)) return base;
  const under = hexToRgb(base);
  return rgbToHex([0, 1, 2].map((i) => Number(m[i + 1]) * opacity + under[i]! * (1 - opacity)) as Rgb);
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
const CHARCOAL = "#14181e";
const CHARCOAL_PRESSED = "#2a303a";
const DARK_INK = "#0b0b0d";

/**
 * Hero gradient from an agency colour: a deep shade into the colour itself. Content on it is white unless that
 * can't reach 4.5:1 on both ends (very light colours such as yellow), then near-black.
 */
function heroFor(base: Rgb, scheme: ColorScheme): Partial<Palette> {
  const from = rgbToHex(shade(base, scheme === "dark" ? 0.55 : 0.35));
  const to = rgbToHex(scheme === "dark" ? shade(base, 0.2) : base);
  const whiteReads = contrastRatio(from, WHITE) >= 4.5 && contrastRatio(to, WHITE) >= 4.5;
  const darkText = !whiteReads && contrastRatio(to, DARK_INK) > contrastRatio(to, WHITE);
  return {
    heroFrom: from,
    heroTo: to,
    heroGlow: rgbToHex(tint(base, 0.35)),
    onHero: darkText ? DARK_INK : WHITE,
    onHeroMuted: darkText ? "rgba(11, 11, 13, 0.72)" : "rgba(255, 255, 255, 0.78)",
    heroGlass: darkText ? "rgba(11, 11, 13, 0.08)" : "rgba(255, 255, 255, 0.14)",
    heroGlassBorder: darkText ? "rgba(11, 11, 13, 0.14)" : "rgba(255, 255, 255, 0.22)",
  };
}

/**
 * Text and glass on the hero cards (ui/HeroCard): they are drawn on the accent fill, so they use the fill's own
 * text colour (white for an agency colour), the same as every other card on that fill (the credit pool).
 */
function heroOnFill(on: string): Pick<Palette, "onHero" | "onHeroMuted" | "heroGlass" | "heroGlassBorder"> {
  return on === WHITE
    ? { onHero: WHITE, onHeroMuted: "rgba(255, 255, 255, 0.8)", heroGlass: "rgba(255, 255, 255, 0.18)", heroGlassBorder: "rgba(255, 255, 255, 0.32)" }
    : { onHero: DARK_INK, onHeroMuted: "rgba(11, 11, 13, 0.72)", heroGlass: "rgba(11, 11, 13, 0.08)", heroGlassBorder: "rgba(11, 11, 13, 0.14)" };
}

/** Secondary text and translucent pieces on the accent fill, matching the text colour chosen for it. */
function onFill(on: string): Pick<Palette, "onPrimaryMuted" | "primaryTrack"> {
  return on === WHITE
    ? { onPrimaryMuted: "rgba(255, 255, 255, 0.78)", primaryTrack: "rgba(255, 255, 255, 0.18)" }
    : { onPrimaryMuted: "rgba(11, 11, 13, 0.7)", primaryTrack: "rgba(11, 11, 13, 0.12)" };
}

/**
 * Palette overrides for an agency colour, or an empty object (keep GrowthReach.ai colours) when the colour is
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
      ...onFill(WHITE),
      primarySubtle: `rgba(${rgb}, 0.1)`,
      primarySubtlePressed: `rgba(${rgb}, 0.18)`,
      primaryBorder: `rgba(${rgb}, 0.32)`,
      primaryText: fillHex,
      borderFocus: hex,
      // Main buttons stay charcoal under an agency colour too: the colour is kept for the hero card and the
      // highlights, so it means something where it appears (polish pass 2026-11-05).
      ink: CHARCOAL,
      inkPressed: CHARCOAL_PRESSED,
      ...heroFor(base, scheme),
      ...heroOnFill(WHITE),
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
    ...onFill(onPrimary),
    primarySubtle: `rgba(${rgb}, 0.14)`,
    primarySubtlePressed: `rgba(${rgb}, 0.22)`,
    primaryBorder: `rgba(${rgb}, 0.32)`,
    primaryText: text,
    borderFocus: text,
    ...heroFor(base, scheme),
    ...heroOnFill(onPrimary),
  };
}
