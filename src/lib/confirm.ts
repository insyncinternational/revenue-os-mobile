import { Platform } from "react-native";
import { showDialog } from "@/ui/Dialog";

/** A little longer than the dialog's close animation (160 ms). */
const DIALOG_CLOSE_MS = 200;

/**
 * Waits until the dialog has finished closing. Signing out swaps the whole screen; done while the sheet was still
 * sliding away, it slid over an already empty page.
 */
export function afterDialogCloses(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Platform.OS === "web" ? 0 : DIALOG_CLOSE_MS));
}

/** Yes/no question in the app's own dialog (browser confirm in the web preview). Resolves true when confirmed. */
export function confirm(message: string, confirmLabel: string, cancelLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(message) ?? false);
  return new Promise((resolve) => {
    showDialog({
      message,
      actions: [
        { label: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
        { label: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      ],
    });
  });
}
