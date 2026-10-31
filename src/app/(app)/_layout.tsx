import { Stack } from "expo-router";
import { t } from "@/i18n";
import { useStackOptions } from "@/theme/stackOptions";

/** Signed in and allowed in: the tabs, plus screens that sit above them (switcher sheet, UI gallery). */
export default function AppLayout() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="switcher"
        options={{
          title: t("workspace.title"),
          presentation: "formSheet",
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
          sheetCornerRadius: 16,
          headerShown: false,
        }}
      />
      <Stack.Screen name="gallery" options={{ title: t("more.gallery"), headerLargeTitle: true }} />
    </Stack>
  );
}
