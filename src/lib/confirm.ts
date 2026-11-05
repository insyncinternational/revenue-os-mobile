import { Platform } from "react-native";
import { showDialog } from "@/ui/Dialog";

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
