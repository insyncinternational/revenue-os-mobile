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
  /** Brand gradient (deep brand → brand, a soft glow, readable content on top). Used by the home-screen widget; the in-app headers sit on `background` and keep the brand colour for accents. */
  heroFrom: string;
  heroTo: string;
  heroGlow: string;
  onHero: string;
  onHeroMuted: string;
  /** Frosted tiles and pills on that gradient. */
  heroGlass: string;
  heroGlassBorder: string;
  /** CSS box-shadow under elevated cards ("none" in dark mode, where surfaces step up instead). */
  cardShadow: string;
  /** The resting shadow every card sits on in light mode (cards carry no border there). "none" in dark mode. */
  cardShadowSoft: string;
  /** The main action: a black pill in light mode, a white one in dark (high contrast, like the brand-neutral reference apps). */
  ink: string;
  inkPressed: string;
  onInk: string;
};

const light: Palette = {
  // A cool light grey page with pure white cards on it: the cards stand out without outlines.
  background: "#f2f2f4",
  surface: "#ffffff",
  surfaceSecondary: "#f5f5f7",
  surfaceTertiary: "#ececf0",
  surfaceRaised: "#ffffff",
  surfaceInverse: "#111114",
  text: "#111114",
  textSecondary: "#3f3f46",
  textMuted: "#6b6b76",
  textSubtle: "#9a9aa3",
  textInverse: "#ffffff",
  border: "#e4e4e9",
  borderLight: "#efeff2",
  borderStrong: "#d4d4db",
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
  skeleton: "#e9e9ed",
  pressed: "#efeff2",
  heroFrom: "#312e81",
  heroTo: "#4f46e5",
  heroGlow: "#818cf8",
  onHero: "#ffffff",
  onHeroMuted: "rgba(255, 255, 255, 0.78)",
  heroGlass: "rgba(255, 255, 255, 0.14)",
  heroGlassBorder: "rgba(255, 255, 255, 0.22)",
  cardShadow: "0px 1px 2px rgba(17, 17, 20, 0.03), 0px 10px 28px rgba(17, 17, 20, 0.07)",
  cardShadowSoft: "0px 1px 2px rgba(17, 17, 20, 0.03)",
  ink: "#111114",
  inkPressed: "#2a2a30",
  onInk: "#ffffff",
};

const dark: Palette = {
  // Cards a clear step above the page, so they separate without borders.
  background: "#0b0b0f",
  surface: "#18181d",
  surfaceSecondary: "#1f1f25",
  surfaceTertiary: "#26262d",
  surfaceRaised: "#1e1e24",
  surfaceInverse: "#f4f4f6",
  text: "#f4f4f6",
  textSecondary: "#c9c9d1",
  textMuted: "#a1a1ab",
  textSubtle: "#76767f",
  textInverse: "#0b0b0f",
  border: "#2a2a31",
  borderLight: "#222228",
  borderStrong: "#3a3a42",
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
  skeleton: "#1f1f25",
  pressed: "#22222a",
  heroFrom: "#1e1b4b",
  heroTo: "#3730a3",
  heroGlow: "#6366f1",
  onHero: "#ffffff",
  onHeroMuted: "rgba(255, 255, 255, 0.72)",
  heroGlass: "rgba(255, 255, 255, 0.1)",
  heroGlassBorder: "rgba(255, 255, 255, 0.16)",
  cardShadow: "none",
  cardShadowSoft: "none",
  ink: "#ffffff",
  inkPressed: "#e4e4e9",
  onInk: "#111114",
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Text and icons on saturated, theme-independent fills (swipe actions, channel tiles). */
export const onSolid = "#ffffff";

/** Text and icons on a white pill that sits on colour or ink (the hero button, the active tab), in both themes. */
export const onWhite = "#111114";

/** The floating tab bar in dark mode: a lifted grey (ink-black would vanish into the page). */
export const tabBarDark = "#24242b";

/**
 * Revenue OS's own front door — native splash, launch intro and sign-in hero. Fixed brand indigo in both themes
 * (no agency colour applies before sign-in). `splash` must match app.json's expo-splash-screen backgroundColor.
 */
export const launchBrand = { splash: "#312e81", to: "#4f46e5", glow: "#818cf8", glowSoft: "#a5b4fc" } as const;

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

/**
 * Initials avatars: eight clearly different gradients (top-left → bottom-right) with white initials, the same in
 * light and dark — like modern messengers, so people are told apart at a glance.
 */
export const avatarGradients: readonly { from: string; to: string }[] = [
  { from: "#818cf8", to: "#4f46e5" }, // indigo
  { from: "#38bdf8", to: "#0369a1" }, // sky
  { from: "#34d399", to: "#047857" }, // emerald
  { from: "#fbbf24", to: "#c2410c" }, // amber
  { from: "#f472b6", to: "#be185d" }, // pink
  { from: "#a78bfa", to: "#6d28d9" }, // violet
  { from: "#2dd4bf", to: "#0f766e" }, // teal
  { from: "#fb923c", to: "#b91c1c" }, // sunset
];

/**
 * Inter, bundled in five weights (800 for the logo wordmark and the big metric numbers). Each weight is its own family so iOS, Android
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
  | "display"
  | "metric"
  | "largeTitle"
  | "title"
  | "headline"
  | "body"
  | "callout"
  | "subhead"
  | "footnote"
  | "caption";

export const typography: Record<TextVariant, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }> = {
  /** The one number a screen is about (Today's highlight card). */
  display: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 42, letterSpacing: -1.2 },
  /** Numbers in metric tiles: heavy and tight, so they read before their labels. */
  metric: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.8 },
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

// Generous, soft corners: cards 22, hero cards 28, controls 14 (inputs, search), everything tappable on its own a pill.
export const radius = { sm: 8, md: 14, lg: 16, xl: 22, xxl: 28, pill: 999 } as const;

/** Minimum touch target (iOS 44pt; Android's 48dp is met with hitSlop). */
export const touchTarget = 44;

/** Same timings as the web (styles/ds/tokens.css --duration-*). */
export const motion = { fast: 130, base: 190, slow: 280 } as const;

/** Caps OS text scaling so dense rows never break; body text may scale further. */
export const maxFontScale = { dense: 1.35, body: 1.6 } as const;
