import { brandPalette, contrastRatio, isHexColor } from "./brand";
import { palettes } from "./tokens";

describe("brandPalette", () => {
  it("keeps Revenue OS colours when there is no valid agency colour", () => {
    expect(brandPalette(null, "light", palettes.light.surface)).toEqual({});
    expect(brandPalette("teal", "dark", palettes.dark.surface)).toEqual({});
    expect(brandPalette("#fff", "light", palettes.light.surface)).toEqual({});
  });

  const agencyColors = ["#0f9d8a", "#f97316", "#facc15", "#ffffff", "#000000", "#4f46e5", "#22c55e", "#ec4899"];

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

describe("Revenue OS palette", () => {
  it.each(["light", "dark"] as const)("%s: text and primary meet contrast on surfaces", (scheme) => {
    const p = palettes[scheme];
    expect(contrastRatio(p.text, p.surface)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(p.textSecondary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.textMuted, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primary, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primaryFill, p.onPrimary)).toBeGreaterThanOrEqual(4.5);
  });

  it("validates hex colours", () => {
    expect(isHexColor("#4f46e5")).toBe(true);
    expect(isHexColor(" #4F46E5 ")).toBe(true);
    expect(isHexColor("4f46e5")).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });
});
