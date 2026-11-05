// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

const HEX = { selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]", message: "Use a theme colour (useTheme().colors) instead of a raw hex value." };

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "src/i18n/az.generated.ts", "src/i18n/ar.generated.ts"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      // Icons come from src/ui/icons.ts (one file per icon), never the whole lucide package.
      "no-restricted-imports": ["error", { paths: [{ name: "lucide-react-native", allowTypeImports: true, message: "Import icons from @/ui/icons." }] }],
    },
  },
  {
    // Colours live in the theme. Components use palette tokens, never raw hex values.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/theme/**", "src/ui/Logo.tsx", "src/ui/brandGeometry.ts", "src/ui/BrandIcons.tsx", "src/dev/Gallery.tsx", "**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", HEX],
    },
  },
  {
    // One highlight look: screens use the hero card's tokens (primaryFill + accentGradient, onHero, onHeroMuted,
    // heroGlass) or a shared card, never the gradient's raw stops, which made a second and third orange.
    files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", HEX, ...["heroFrom", "heroTo", "heroGlow"].map((name) => ({ selector: `MemberExpression[property.name="${name}"]`, message: "Use the hero tokens (primaryFill + accentGradient, onHero, heroGlass) or a shared card from @/ui." }))],
    },
  },
]);
