import { reloadAppAsync } from "expo";
import { getLocales } from "expo-localization";
import { I18nManager } from "react-native";
import { create } from "zustand";
import { storage, StorageKeys } from "@/lib/storage";
import { ar } from "./ar.generated";
import { az } from "./az.generated";
import { en, type TranslationKey } from "./en";

export type { TranslationKey };

export type AppLanguage = "en" | "az" | "ar";

export const LANGUAGES: { code: AppLanguage; nativeName: string; intlLocale: string; rtl: boolean }[] = [
  { code: "en", nativeName: "English", intlLocale: "en-US", rtl: false },
  { code: "az", nativeName: "Azərbaycanca", intlLocale: "az-Latn-AZ", rtl: false },
  // Western digits (0-9), as UAE apps and the web app use.
  { code: "ar", nativeName: "العربية", intlLocale: "ar-AE-u-nu-latn", rtl: true },
];

const DICTIONARIES: Record<Exclude<AppLanguage, "en">, Readonly<Record<string, string>>> = { az, ar };

function isAppLanguage(v: unknown): v is AppLanguage {
  return v === "en" || v === "az" || v === "ar";
}

function detect(): AppLanguage {
  const saved = storage.getString(StorageKeys.language);
  if (isAppLanguage(saved)) return saved;
  const device = getLocales()[0]?.languageCode;
  return device === "az" ? "az" : device === "ar" ? "ar" : "en";
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return language === "ar";
}

/**
 * React Native fixes the layout direction when the app starts, so Arabic needs the right direction set
 * natively and a restart. Called once at start-up (root layout): if the saved language and the running
 * direction disagree (first launch in Arabic, or a switch that did not restart), it fixes it.
 */
export function syncLayoutDirection(): boolean {
  const rtl = isRtlLanguage(getLanguage());
  I18nManager.allowRTL(rtl);
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.forceRTL(rtl);
  void reloadAppAsync("layout direction changed").catch(() => undefined);
  return true;
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
  const directionChanges = isRtlLanguage(language) !== isRtlLanguage(getLanguage());
  storage.set(StorageKeys.language, language);
  useLanguage.setState({ language });
  // Switching into or out of Arabic flips the whole layout: that takes an app restart.
  if (directionChanges) {
    I18nManager.allowRTL(isRtlLanguage(language));
    I18nManager.forceRTL(isRtlLanguage(language));
    void reloadAppAsync("language direction changed").catch(() => undefined);
  }
}

/** Translate a key; English is the fallback for anything not translated yet. */
export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const english = en[key];
  const language = getLanguage();
  let s = (language === "en" ? undefined : DICTIONARIES[language][english]) ?? english;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
