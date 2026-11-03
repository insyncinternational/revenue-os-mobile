import { Platform, Share } from "react-native";
import { t } from "@/i18n";
import type { Invoice } from "@/types/invoice";
import { balanceDue, cents } from "./invoice";

type Toast = { show: (message: string, opts?: { kind?: "success" | "error" | "info" }) => void };

/**
 * Opens the phone's share sheet with a sent invoice's pay link ("text-to-pay"). Browsers without a share sheet (the web
 * preview) copy the link instead. Used by the invoice screen and the new-invoice form.
 */
export async function sharePayLink(invoice: Invoice, locale: string, toast: Toast): Promise<void> {
  const total = cents(balanceDue(invoice), invoice.currency, locale);
  try {
    await Share.share({ message: t("invoice.shareMessage", { number: invoice.number, amount: total, url: invoice.pay_url }), url: invoice.pay_url, title: invoice.number });
  } catch {
    const clipboard = Platform.OS === "web" ? (globalThis as { navigator?: { clipboard?: { writeText: (s: string) => Promise<void> } } }).navigator?.clipboard : undefined;
    if (clipboard && (await clipboard.writeText(invoice.pay_url).then(() => true, () => false))) toast.show(t("invoice.linkCopied"), { kind: "success" });
    else toast.show(t("invoice.shareFailed"), { kind: "error" });
  }
}
