/**
 * Revenue OS design tokens for mobile.
 *
 * Colours are copied from the web's semantic tokens (revenue-os-frontend/styles/ds/tokens.css) so both apps
 * read as one product. Components use these semantic names only — never raw hex values.
 * Type and spacing are sized for phones (the web's 13px base is too small on a handset).
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
  /** Solid fills (primary button). */
  primaryFill: string;
  primaryFillPressed: string;
  /** Text and icons placed on `primaryFill`. */
  onPrimary: string;
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
};

const light: Palette = {
  background: "#f7f6f5",
  surface: "#ffffff",
  surfaceSecondary: "#f4f2f1",
  surfaceTertiary: "#efecea",
  surfaceRaised: "#ffffff",
  surfaceInverse: "#0f172a",
  text: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#636b78",
  textSubtle: "#9096a1",
  textInverse: "#ffffff",
  border: "#e4e0dd",
  borderLight: "#eeebe9",
  borderStrong: "#d3cecb",
  borderFocus: "#6366f1",
  primary: "#4f46e5",
  primaryFill: "#4338ca",
  primaryFillPressed: "#3730a3",
  onPrimary: "#ffffff",
  primarySubtle: "#eef2ff",
  primarySubtlePressed: "#e0e7ff",
  primaryBorder: "#c7d2fe",
  primaryText: "#4338ca",
  success: "#008c36",
  successSurface: "#e6fee9",
  successText: "#006f26",
  warning: "#b35600",
  warningSurface: "#fff2e0",
  warningText: "#8f4100",
  danger: "#d32021",
  dangerSurface: "#ffebe6",
  dangerText: "#aa0c13",
  info: "#2a67ec",
  infoSurface: "#e6f8ff",
  infoText: "#1c4fc0",
  scrim: "rgba(15, 23, 42, 0.4)",
  skeleton: "#efecea",
  pressed: "#f2f0ef",
};

const dark: Palette = {
  background: "#0b0b0d",
  surface: "#141416",
  surfaceSecondary: "#1c1c1f",
  surfaceTertiary: "#242428",
  surfaceRaised: "#19191d",
  surfaceInverse: "#f7f6f5",
  text: "#f4f4f5",
  textSecondary: "#c9c9ce",
  textMuted: "#9a9aa2",
  textSubtle: "#71717a",
  textInverse: "#0b0b0d",
  border: "#2a2a2f",
  borderLight: "#202024",
  borderStrong: "#3a3a41",
  borderFocus: "#818cf8",
  primary: "#818cf8",
  primaryFill: "#4f46e5",
  primaryFillPressed: "#6366f1",
  onPrimary: "#ffffff",
  primarySubtle: "rgba(99, 102, 241, 0.12)",
  primarySubtlePressed: "rgba(99, 102, 241, 0.2)",
  primaryBorder: "rgba(99, 102, 241, 0.32)",
  primaryText: "#a5b4fc",
  success: "#57d377",
  successSurface: "rgba(87, 211, 119, 0.12)",
  successText: "#84e397",
  warning: "#fe993f",
  warningSurface: "rgba(254, 153, 63, 0.12)",
  warningText: "#ffb471",
  danger: "#ff7165",
  dangerSurface: "rgba(255, 113, 101, 0.12)",
  dangerText: "#ff9889",
  info: "#69aeff",
  infoSurface: "rgba(105, 174, 255, 0.12)",
  infoText: "#8bc7ff",
  scrim: "rgba(0, 0, 0, 0.6)",
  skeleton: "#1c1c1f",
  pressed: "#1c1c1f",
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Text and icons on saturated, theme-independent fills (swipe actions, channel tiles). */
export const onSolid = "#ffffff";

/** Shadow colours: neutral for raised surfaces, a brand-tinted one for the floating "+" button. */
export const shadows = { neutral: "#000000", brand: "#1e1b4b" } as const;

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

/** Avatar backgrounds and initials, picked by name so a person always gets the same pair. */
export const avatarTints: Record<ColorScheme, { bg: string; fg: string }[]> = {
  light: [
    { bg: "#eef2ff", fg: "#4338ca" },
    { bg: "#e6f8ff", fg: "#1c4fc0" },
    { bg: "#e6fee9", fg: "#006f26" },
    { bg: "#fff2e0", fg: "#8f4100" },
    { bg: "#fdeef6", fg: "#a3195b" },
    { bg: "#f1edfd", fg: "#5b21b6" },
  ],
  dark: [
    { bg: "#1e1b4b", fg: "#a5b4fc" },
    { bg: "#0c2a45", fg: "#8bc7ff" },
    { bg: "#0e2f1c", fg: "#84e397" },
    { bg: "#3a2208", fg: "#ffb471" },
    { bg: "#3b1428", fg: "#f9a8d4" },
    { bg: "#2a1f4d", fg: "#c4b5fd" },
  ],
};

/**
 * Inter, bundled in five weights (800 only for the logo wordmark). Each weight is its own family so iOS, Android
 * and web render identically.
 */
export const fonts = {
  regular: "Inter-Regular",
  medium: "Inter-Medium",
  semibold: "Inter-SemiBold",
  bold: "Inter-Bold",
  extrabold: "Inter-ExtraBold",
} as const;

export type TextVariant =
  | "largeTitle"
  | "title"
  | "headline"
  | "body"
  | "callout"
  | "subhead"
  | "footnote"
  | "caption";

export const typography: Record<TextVariant, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }> = {
  largeTitle: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
};

/** 4-point grid. */
export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;

/** Side padding of every screen. */
export const gutter = space.lg;

export const radius = { sm: 6, md: 10, lg: 12, xl: 16, pill: 999 } as const;

/** Minimum touch target (iOS 44pt; Android's 48dp is met with hitSlop). */
export const touchTarget = 44;

/** Same timings as the web (styles/ds/tokens.css --duration-*). */
export const motion = { fast: 130, base: 190, slow: 280 } as const;

/** Caps OS text scaling so dense rows never break; body text may scale further. */
export const maxFontScale = { dense: 1.35, body: 1.6 } as const;
