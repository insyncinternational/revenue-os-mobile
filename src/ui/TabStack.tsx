import { Stack } from "expo-router";
import { useStackOptions } from "@/theme/stackOptions";

/** The stack inside a tab. Its first screen draws its own brand header (ui/TabHeader), so the system one is hidden. */
export function TabStack({ title }: { title: string }) {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title, headerShown: false }} />
    </Stack>
  );
}
