import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { useLanguage } from "@/i18n";
import { isOlderThan } from "@/lib/version";
import { queryClient } from "@/query/queryClient";
import { persistOnBackground, restoreQueryCache } from "@/query/persist";
import { useSession } from "@/session/sessionStore";
import { useBrandColor } from "@/theme/brandStore";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { ToastProvider } from "@/ui/Toast";

// Keep the splash up until fonts and the session are ready — no flash of unstyled text or the wrong screen.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 200, fade: true });

// Saved data is in memory before the first render, so screens open on content instead of a spinner.
restoreQueryCache(queryClient);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: require("../../assets/fonts/Inter_400Regular.ttf"),
    [fonts.medium]: require("../../assets/fonts/Inter_500Medium.ttf"),
    [fonts.semibold]: require("../../assets/fonts/Inter_600SemiBold.ttf"),
    [fonts.bold]: require("../../assets/fonts/Inter_700Bold.ttf"),
    [fonts.extrabold]: require("../../assets/fonts/Inter_800ExtraBold.ttf"),
  });
  const status = useSession((s) => s.status);
  const hydrate = useSession((s) => s.hydrate);
  const language = useLanguage((s) => s.language);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => persistOnBackground(queryClient), []);

  const ready = (fontsLoaded || fontError != null) && status !== "loading";
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BrandedTheme>
            <ToastProvider>
              {/* Keyed on the language: switching re-renders every screen once in the new language. */}
              <RootStack key={language} />
            </ToastProvider>
          </BrandedTheme>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function BrandedTheme({ children }: { children: React.ReactNode }) {
  const preview = useBrandColor((s) => s.preview);
  const workspace = useBrandColor((s) => s.workspace);
  const branding = useSession((s) => s.user?.branding);
  const fromUser = branding?.source === "agency" ? branding.primary_color : null;
  return <ThemeProvider brandColor={preview ?? workspace ?? fromUser}>{children}</ThemeProvider>;
}

/** Today, the first tab (typed-routes spelling of "/"). */
const HOME = "/(app)/(tabs)/index" as const;

/** Versions older than the server's minimum must update (checked once per launch; never blocks offline). */
function useUpdateRequired(): boolean {
  const config = useQuery({ queryKey: ["config"], queryFn: () => authApi.config(), staleTime: Infinity, retry: 1 });
  return isOlderThan(Constants.expoConfig?.version, config.data?.min_app_version);
}

function RootStack() {
  const { colors, scheme } = useTheme();
  const status = useSession((s) => s.status);
  const gate = useSession((s) => s.gate);
  const updateRequired = useUpdateRequired();
  const signedIn = status === "signedIn";

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={updateRequired}>
          <Stack.Screen name="update" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && !signedIn} redirectTo={HOME}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && signedIn && gate === "ok"} redirectTo={!signedIn ? "/sign-in" : gate === "paused" ? "/paused" : "/verify-email"}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && signedIn && gate === "verifyEmail"} redirectTo={signedIn ? HOME : "/sign-in"}>
          <Stack.Screen name="verify-email" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && signedIn && gate === "paused"} redirectTo={signedIn ? HOME : "/sign-in"}>
          <Stack.Screen name="paused" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
