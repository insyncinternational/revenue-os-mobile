import { Alert, Platform } from "react-native";

/** Native yes/no dialog (browser confirm in the web preview). Resolves true when confirmed. */
export function confirm(message: string, confirmLabel: string, cancelLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(globalThis.confirm?.(message) ?? false);
  return new Promise((resolve) => {
    // iOS reads a lone title well; Android's dialog keeps an empty body under a title-only alert, so the question goes there.
    const [title, body] = Platform.OS === "android" ? ["", message] : [message, undefined];
    Alert.alert(title, body, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
