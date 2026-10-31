import { getLocales } from "expo-localization";
import { create } from "zustand";
import { storage, StorageKeys } from "@/lib/storage";
import { az } from "./az.generated";
import { en, type TranslationKey } from "./en";

export type { TranslationKey };

export type AppLanguage = "en" | "az";

export const LANGUAGES: { code: AppLanguage; nativeName: string; intlLocale: string }[] = [
  { code: "en", nativeName: "English", intlLocale: "en-US" },
  { code: "az", nativeName: "Azərbaycanca", intlLocale: "az-Latn-AZ" },
];

function detect(): AppLanguage {
  const saved = storage.getString(StorageKeys.language);
  if (saved === "en" || saved === "az") return saved;
  return getLocales()[0]?.languageCode === "az" ? "az" : "en";
}

/** The root layout keys the app on this, so a language change re-renders every screen once. */
export const useLanguage = create<{ language: AppLanguage }>(() => ({ language: detect() }));

export function getLanguage(): AppLanguage {
  return useLanguage.getState().language;
}

/** BCP-47 locale for Intl dates and numbers. */
export function getIntlLocale(): string {
  return LANGUAGES.find((l) => l.code === getLanguage())?.intlLocale ?? "en-US";
}

export function setLanguage(language: AppLanguage): void {
  storage.set(StorageKeys.language, language);
  useLanguage.setState({ language });
}

/** Translate a key; English is the fallback for anything not translated yet. */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const english = en[key];
  let s = (getLanguage() === "az" ? az[english] : undefined) ?? english;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
