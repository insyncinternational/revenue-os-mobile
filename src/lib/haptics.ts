import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/** Light feedback for meaningful moments only (send, complete, swipe threshold) — never on scroll or every tap. */
export const haptics = {
  selection() {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  },
  light() {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  success() {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning() {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
