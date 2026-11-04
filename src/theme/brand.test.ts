import { brandPalette, contrastRatio, flattenOver, isHexColor, splitAlpha, withAlpha } from "./brand";
import { palettes } from "./tokens";

describe("withAlpha", () => {
  it("turns a hex colour into rgba and leaves other values alone", () => {
    expect(withAlpha("#f7820f", 0.12)).toBe("rgba(247, 130, 15, 0.12)");
    expect(withAlpha("#f7820f", 3)).toBe("rgba(247, 130, 15, 1)");
    expect(withAlpha("rgb(1,2,3)", 0.5)).toBe("rgb(1,2,3)");
  });
});

describe("splitAlpha", () => {
  it("moves an rgba alpha out of the colour and leaves opaque colours whole", () => {
    expect(splitAlpha("rgba(87, 211, 119, 0.12)")).toEqual({ color: "rgb(87, 211, 119)", opacity: 0.12 });
    expect(splitAlpha("#f7820f")).toEqual({ color: "#f7820f", opacity: 1 });
    expect(splitAlpha("rgb(1, 2, 3)")).toEqual({ color: "rgb(1, 2, 3)", opacity: 1 });
  });
});

describe("flattenOver", () => {
  it("blends a translucent colour onto the base and keeps hex as it is", () => {
    expect(flattenOver("rgba(255, 255, 255, 0.5)", "#000000")).toBe("#808080");
    expect(flattenOver("#f7820f", "#000000")).toBe("#f7820f");
    expect(flattenOver("rgba(0, 0, 0, 0)", "#7c2d12")).toBe("#7c2d12");
  });
});

describe("brandPalette", () => {
  it("keeps GrowthReach.ai colours when there is no valid agency colour", () => {
    expect(brandPalette(null, "light", palettes.light.surface)).toEqual({});
    expect(brandPalette("teal", "dark", palettes.dark.surface)).toEqual({});
    expect(brandPalette("#fff", "light", palettes.light.surface)).toEqual({});
  });

  const agencyColors = ["#0f9d8a", "#f97316", "#facc15", "#ffffff", "#000000", "#f7820f", "#22c55e", "#ec4899"];

  it.each(agencyColors)("light: %s gives readable fills and brand text (≥ 4.5:1)", (hex) => {
    const p = brandPalette(hex, "light", palettes.light.surface);
    expect(contrastRatio(p.primaryFill!, p.onPrimary!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primary!, palettes.light.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(agencyColors.filter((c) => c !== "#000000"))("dark: %s gives readable fills and brand text", (hex) => {
    const p = brandPalette(hex, "dark", palettes.dark.surface);
    // Text on the solid fill picks white or near-black, whichever reads.
    expect(contrastRatio(p.primaryFill!, p.onPrimary!)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(p.primary!, palettes.dark.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("uses dark text on a light agency fill in dark mode", () => {
    expect(brandPalette("#facc15", "dark", palettes.dark.surface).onPrimary).toBe("#0b0b0d");
  });
});

describe("GrowthReach.ai palette", () => {
  it.each(["light", "dark"] as const)("%s: text and primary meet contrast on surfaces", (scheme) => {
    const p = palettes[scheme];
    expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.textSecondary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.textMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
    // The brand is the logo's own orange by choice (2026-11-04), so it is held to a lower bar than text:
    // it must stay visible on surfaces and keep bold labels on its fill legible.
    expect(contrastRatio(p.primary, p.surface)).toBeGreaterThanOrEqual(2.5);
    expect(contrastRatio(p.primaryFill, p.onPrimary)).toBeGreaterThanOrEqual(2.5);
  });

  it("validates hex colours", () => {
    expect(isHexColor("#f7820f")).toBe(true);
    expect(isHexColor(" #F7820F ")).toBe(true);
    expect(isHexColor("4f46e5")).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });
});
