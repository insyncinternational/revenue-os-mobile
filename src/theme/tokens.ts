/**
 * GrowthReach.ai design tokens for mobile — the "Mono" look (2026-11-04 redesign).
 *
 * A warm grey page, white cards, the logo's charcoal and ONE accent: the GrowthReach.ai orange (the web's brand
 * ramp, revenue-os-frontend/styles/ds/tokens.css), replaced by an agency's own colour at runtime (theme/brand.ts).
 * Like the logo, text on the orange is charcoal, not white (7:1 instead of 2.6:1).
 * Components use these semantic names only — never raw hex values.
 */

export type ColorScheme = "light" | "dark";

export type Palette = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceTertiary: string;
  surfaceRaised: string;
  surfaceInverse: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  border: string;
  borderLight: string;
  borderStrong: string;
  borderFocus: string;
  /** Links, icons, active tab, selected states. */
  primary: string;
  /** The accent fill: the one highlight card per screen, the active tab pill, the main chart bar. */
  primaryFill: string;
  primaryFillPressed: string;
  /** Text and icons placed on `primaryFill`. */
  onPrimary: string;
  /** Secondary text on `primaryFill`. */
  onPrimaryMuted: string;
  /** Translucent pieces on `primaryFill` (a round button, the empty part of a meter). */
  primaryTrack: string;
  primarySubtle: string;
  primarySubtlePressed: string;
  primaryBorder: string;
  primaryText: string;
  success: string;
  successSurface: string;
  successText: string;
  warning: string;
  warningSurface: string;
  warningText: string;
  danger: string;
  dangerSurface: string;
  dangerText: string;
  info: string;
  infoSurface: string;
  infoText: string;
  /** Dims content behind sheets and dialogs. */
  scrim: string;
  /** Skeleton placeholder fill. */
  skeleton: string;
  /** Pressed row / ghost button background. */
  pressed: string;
  /** Brand gradient for the home-screen widget (deep brand → brand), with readable content on top. */
  heroFrom: string;
  heroTo: string;
  heroGlow: string;
  onHero: string;
  onHeroMuted: string;
  heroGlass: string;
  heroGlassBorder: string;
  /** Cards are flat in the Mono look: kept for the few lifted things (menus, the toast). */
  cardShadow: string;
  cardShadowSoft: string;
  /** A deep shade of the brand in light mode (not black), near-white in dark: main buttons, selected chips, the feature card. */
  ink: string;
  inkPressed: string;
  onInk: string;
};

/** The logo's orange (#f7820f light, #ff9a1a dark) with charcoal text on it, like the logo; #b8530b for orange text on white. */
const BRAND = { light: "#f7820f", lightPressed: "#e06a0a", dark: "#ff9a1a", darkPressed: "#ffad3d", text: "#b8530b", charcoal: "#14181e" } as const;

const light: Palette = {
  background: "#eeeee9",
  surface: "#ffffff",
  surfaceSecondary: "#f6f6f2",
  surfaceTertiary: "#e4e4de",
  surfaceRaised: "#ffffff",
  surfaceInverse: "#0e0e0c",
  text: "#0e0e0c",
  textSecondary: "#3a3a36",
  textMuted: "#5c5c57",
  textSubtle: "#8e8e87",
  textInverse: "#ffffff",
  border: "#e2e2dc",
  borderLight: "#eeeee9",
  borderStrong: "#cfcfc8",
  borderFocus: BRAND.light,
  primary: BRAND.text,
  primaryFill: BRAND.light,
  primaryFillPressed: BRAND.lightPressed,
  onPrimary: BRAND.charcoal,
  onPrimaryMuted: "rgba(20, 24, 30, 0.72)",
  primaryTrack: "rgba(20, 24, 30, 0.1)",
  primarySubtle: "#fff1e2",
  primarySubtlePressed: "#ffe4c7",
  primaryBorder: "#ffd3a6",
  primaryText: BRAND.text,
  success: "#0f8a3c",
  successSurface: "#e3f5e8",
  successText: "#0b6b2f",
  warning: "#a16207",
  warningSurface: "#fef9c3",
  warningText: "#854d0e",
  danger: "#d0281c",
  dangerSurface: "#fbe7e3",
  dangerText: "#a8150c",
  info: "#2a67ec",
  infoSurface: "#e6efff",
  infoText: "#1c4fc0",
  scrim: "rgba(14, 14, 12, 0.42)",
  skeleton: "#e4e4de",
  pressed: "#e9e9e3",
  heroFrom: "#e06a0a",
  heroTo: BRAND.light,
  heroGlow: "#ffb347",
  onHero: BRAND.charcoal,
  onHeroMuted: "rgba(20, 24, 30, 0.72)",
  heroGlass: "rgba(20, 24, 30, 0.08)",
  heroGlassBorder: "rgba(20, 24, 30, 0.14)",
  cardShadow: "0px 1px 2px rgba(14, 14, 12, 0.04), 0px 12px 32px rgba(14, 14, 12, 0.10)",
  cardShadowSoft: "0px 1px 2px rgba(20, 24, 30, 0.04), 0px 10px 28px rgba(20, 24, 30, 0.07)",
  // The logo's near-black: main buttons and selected pills, with the orange kept for highlights.
  ink: BRAND.charcoal,
  inkPressed: "#2a303a",
  onInk: "#ffffff",
};

const dark: Palette = {
  background: "#0e0e0c",
  surface: "#1a1a18",
  surfaceSecondary: "#202020",
  surfaceTertiary: "#2a2a27",
  surfaceRaised: "#232321",
  surfaceInverse: "#f2f2ee",
  text: "#f2f2ee",
  textSecondary: "#cfcfc8",
  textMuted: "#a0a09a",
  textSubtle: "#72726c",
  textInverse: "#0e0e0c",
  border: "#2a2a27",
  borderLight: "#20201e",
  borderStrong: "#3a3a36",
  borderFocus: BRAND.dark,
  primary: "#ffad3d",
  primaryFill: BRAND.dark,
  primaryFillPressed: BRAND.darkPressed,
  // Bright orange can't carry white text: dark ink on it (8.7:1).
  onPrimary: "#1a1206",
  onPrimaryMuted: "rgba(26, 18, 6, 0.72)",
  primaryTrack: "rgba(26, 18, 6, 0.12)",
  primarySubtle: "rgba(255, 154, 26, 0.14)",
  primarySubtlePressed: "rgba(255, 154, 26, 0.24)",
  primaryBorder: "rgba(255, 154, 26, 0.36)",
  primaryText: "#ffb870",
  success: "#57d377",
  successSurface: "rgba(87, 211, 119, 0.12)",
  successText: "#84e397",
  warning: "#facc15",
  warningSurface: "rgba(250, 204, 21, 0.12)",
  warningText: "#fcd34d",
  danger: "#ff7165",
  dangerSurface: "rgba(255, 113, 101, 0.12)",
  dangerText: "#ff9889",
  info: "#69aeff",
  infoSurface: "rgba(105, 174, 255, 0.12)",
  infoText: "#8bc7ff",
  scrim: "rgba(0, 0, 0, 0.6)",
  skeleton: "#232321",
  pressed: "#262624",
  heroFrom: "#e06a0a",
  heroTo: BRAND.dark,
  heroGlow: "#ffc06b",
  onHero: "#1a1206",
  onHeroMuted: "rgba(26, 18, 6, 0.72)",
  heroGlass: "rgba(26, 18, 6, 0.1)",
  heroGlassBorder: "rgba(26, 18, 6, 0.16)",
  cardShadow: "none",
  cardShadowSoft: "none",
  ink: "#f2f2ee",
  inkPressed: "#d9d9d3",
  onInk: "#0e0e0c",
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Text and icons on saturated, theme-independent fills (swipe actions, channel tiles). */
export const onSolid = "#ffffff";

/** Text and icons on a white pill that sits on colour or ink, in both themes. */
export const onWhite = "#0e0e0c";

/**
 * The app's areas. In the Mono look they no longer get their own colours (that read as an old dashboard): every
 * area shares the page, ink and the one accent. Kept as names for empty-state scenes and analytics.
 */
export type Area = "today" | "inbox" | "contacts" | "pipeline" | "won" | "calendar" | "tasks" | "invoices" | "campaigns" | "account";

/**
 * GrowthReach.ai's own front door — native splash, launch intro and sign-in hero. Fixed brand colours in both themes: the logo's near-black with an orange glow
 * (no agency colour applies before sign-in). `splash` must match app.json's expo-splash-screen backgroundColor.
 */
export const launchBrand = { splash: "#14181e", to: "#3a2410", glow: "#ff9a1a", glowSoft: "#ffb870" } as const;

/** Shadow colours: neutral for raised surfaces, a brand-tinted one for lifted brand things. */
export const shadows = { neutral: "#000000", brand: "#431407" } as const;

/** One colour per conversation channel, the same in both themes (Email follows the brand). */
export const channelColors = {
  whatsapp: "#128c4b",
  linkedin: "#0a66c2",
  sms: "#0d9488",
  call: "#0d9488",
  website_chat: "#7c3aed",
  instagram: "#e4405f",
  facebook: "#0866ff",
} as const;

/**
 * Initials avatars: a soft accent tint, a calm grey, or the glossy accent (no black, no rainbow), picked by name
 * so a person keeps theirs. `fg` is the initials colour.
 */
export type AvatarTone = { bg: string; fg: string; glossy?: boolean };
export function avatarTones(c: Palette, scheme: ColorScheme): readonly AvatarTone[] {
  return scheme === "dark" ? AVATAR_DARK : AVATAR_LIGHT;
}

/** The signed-in person in headers: the glossy brand tone. */
export function accentAvatarTone(c: Palette): AvatarTone {
  return { bg: c.primaryFill, fg: c.onPrimary, glossy: true };
}

// Soft tints with a dark text of the same hue (all pass 4.5:1), the same person always getting the same one.
const AVATAR_LIGHT: readonly AvatarTone[] = [
  { bg: "#ffe8d3", fg: "#a4480a" },
  { bg: "#d8f1ec", fg: "#0f6b5c" },
  { bg: "#e9e5fb", fg: "#4b3bb5" },
  { bg: "#e3ecfc", fg: "#1e54b7" },
  { bg: "#fce7f0", fg: "#a3245a" },
  { bg: "#f1efd9", fg: "#6b5b0e" },
];
const AVATAR_DARK: readonly AvatarTone[] = [
  { bg: "#3a2613", fg: "#ffb877" },
  { bg: "#123630", fg: "#7fd9c6" },
  { bg: "#29224f", fg: "#b9aeff" },
  { bg: "#16284a", fg: "#9dbbff" },
  { bg: "#3d1a2a", fg: "#ff9cc5" },
  { bg: "#2f2a10", fg: "#e6d36a" },
];

/** Geist in five weights (each its own family so iOS, Android and web render identically). One typeface everywhere. */
export const fonts = {
  regular: "Geist-Regular",
  medium: "Geist-Medium",
  semibold: "Geist-SemiBold",
  bold: "Geist-Bold",
  extrabold: "Geist-ExtraBold",
} as const;

export type TextVariant =
  | "display"
  | "metric"
  | "largeTitle"
  | "title"
  | "headline"
  | "body"
  | "callout"
  | "subhead"
  | "footnote"
  | "caption"
  | "eyebrow";

export const typography: Record<TextVariant, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; textTransform?: "uppercase" }> = {
  /** The one number a screen is about: big, tight, confident. */
  display: { fontFamily: fonts.semibold, fontSize: 48, lineHeight: 52, letterSpacing: -2 },
  /** Numbers in tiles and cards. */
  metric: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -1 },
  /** Every main screen's title. */
  largeTitle: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 44, letterSpacing: -1.6 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  headline: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  /** Small spaced capitals: section labels and status tags ("UP NEXT", "THIS WEEK"). Only for labels in capitals. */
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: "uppercase" },
};

/** 4-point grid. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;

/** Side padding of every screen. */
export const gutter = space.xl;

// Big soft corners: cards 24, feature cards 32, controls 16, everything tappable on its own a pill.
export const radius = { sm: 10, md: 16, lg: 20, xl: 24, xxl: 32, pill: 999 } as const;

/** Minimum touch target (iOS 44pt; Android's 48dp is met with hitSlop). */
export const touchTarget = 44;

/** Same timings as the web (styles/ds/tokens.css --duration-*). */
export const motion = { fast: 130, base: 190, slow: 280 } as const;

/** Caps OS text scaling so dense rows never break; body text may scale further. */
export const maxFontScale = { dense: 1.35, body: 1.6 } as const;
