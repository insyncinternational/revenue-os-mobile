import { Stack } from "expo-router";
import { useStackOptions } from "@/theme/stackOptions";

export const unstable_settings = { anchor: "sign-in" };

export default function AuthLayout() {
  const options = useStackOptions();
  return (
    <Stack screenOptions={{ ...options, title: "" }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
    </Stack>
  );
}
