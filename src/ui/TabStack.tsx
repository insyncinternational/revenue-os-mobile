import { Stack } from "expo-router";
import { useStackOptions } from "@/theme/stackOptions";

/** The stack inside a tab: large title on iOS, the same flat header everywhere. */
export function TabStack({ title }: { title: string }) {
  const options = useStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title, headerLargeTitle: true }} />
    </Stack>
  );
}
