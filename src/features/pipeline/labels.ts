import { t, type TranslationKey } from "@/i18n";

/** A translated lost reason (the API's values are fixed English words); unknown reasons show as they are. */
export function lostReasonLabel(reason: string): string {
  const key = `lost.${reason}` as TranslationKey;
  const label = t(key);
  return label === key ? reason : label;
}
