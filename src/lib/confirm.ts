import { Alert, Platform } from "react-native";

/** Native yes/no dialog (browser confirm in the web preview). Resolves true when confirmed. */
export function confirm(message: string, confirmLabel: string, cancelLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(message) ?? false);
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
