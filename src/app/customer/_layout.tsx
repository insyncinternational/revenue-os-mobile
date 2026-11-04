import { Stack } from "expo-router";
import { t } from "@/i18n";
import { usePortalPushSetup } from "@/portal/portalPush";
import { useStackOptions } from "@/theme/stackOptions";

/** A customer's area in their business's portal: the tabs, plus the screens and sheets above them. */
export default function CustomerLayout() {
  const options = useStackOptions();
  usePortalPushSetup();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="book" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
      <Stack.Screen name="documents" options={{ title: t("portal.docs.title"), headerLargeTitle: true }} />
      <Stack.Screen name="password" options={{ presentation: "formSheet", sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
      <Stack.Screen name="add-business" options={{ presentation: "formSheet", sheetAllowedDetents: [1], sheetGrabberVisible: true, sheetCornerRadius: 16 }} />
    </Stack>
  );
}
