import { useEffect, useRef } from "react";
import { Stack, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { syncLayoutDirection, useLanguage } from "@/i18n";
import { isOlderThan } from "@/lib/version";
import { queryClient } from "@/query/queryClient";
import { persistOnBackground, restoreQueryCache } from "@/query/persist";
import { useActivePortal, usePortalSession } from "@/portal/portalSession";
import { useSession } from "@/session/sessionStore";
import { useStatusBarOverride } from "@/theme/statusBar";
import { useBrandColor } from "@/theme/brandStore";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { CelebrateProvider } from "@/ui/Celebrate";
import { LaunchIntro } from "@/ui/LaunchIntro";
import { DialogHost } from "@/ui/Dialog";
import { ToastProvider } from "@/ui/Toast";

// Keep the splash up until fonts and the session are ready — no flash of unstyled text or the wrong screen.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 200, fade: true });

// Saved data is in memory before the first render, so screens open on content instead of a spinner.
restoreQueryCache(queryClient);

// Arabic runs right-to-left: make the native layout direction match the saved language (restarts once if not).
syncLayoutDirection();

let splashHidden = false;
function hideSplash(): void {
  if (splashHidden) return;
  splashHidden = true;
  SplashScreen.hide();
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.regular]: require("../../assets/fonts/Geist_400Regular.ttf"),
    [fonts.medium]: require("../../assets/fonts/Geist_500Medium.ttf"),
    [fonts.semibold]: require("../../assets/fonts/Geist_600SemiBold.ttf"),
    [fonts.bold]: require("../../assets/fonts/Geist_700Bold.ttf"),
    [fonts.extrabold]: require("../../assets/fonts/Geist_800ExtraBold.ttf"),
  });
  const status = useSession((s) => s.status);
  const hydrate = useSession((s) => s.hydrate);
  const portalStatus = usePortalSession((s) => s.status);
  const language = useLanguage((s) => s.language);

  useEffect(() => {
    void hydrate();
    // Customers (a business's portal) sign in separately from staff.
    void usePortalSession.getState().hydrate();
  }, [hydrate]);

  useEffect(() => persistOnBackground(queryClient), []);

  // Server-written text (KPI labels, notifications, errors) comes in the app language: refetch on a switch.
  const firstLanguage = useRef(language);
  useEffect(() => {
    if (language === firstLanguage.current) return;
    firstLanguage.current = language;
    void queryClient.invalidateQueries();
  }, [language]);

  const ready = (fontsLoaded || fontError != null) && status !== "loading" && portalStatus !== "loading";
  // The intro says when its cover is drawn; the timer is a backstop so the splash can never stay up.
  useEffect(() => {
    if (!ready) return;
    const backstop = setTimeout(hideSplash, 1500);
    return () => clearTimeout(backstop);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <BrandedTheme>
            <ToastProvider>
              <CelebrateProvider>
                {/* Keyed on the language: switching re-renders every screen once in the new language. */}
                <RootStack key={language} />
                {/* Questions and choices in the app's own look, above every screen and sheet. */}
                <DialogHost />
              </CelebrateProvider>
            </ToastProvider>
          </BrandedTheme>
        </QueryClientProvider>
        </KeyboardProvider>
        {/* Over everything, once per cold start: the full intro before sign-in, a short one before Today. */}
        <LaunchIntro mode={status === "signedIn" ? "short" : "full"} onShown={hideSplash} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function BrandedTheme({ children }: { children: React.ReactNode }) {
  const preview = useBrandColor((s) => s.preview);
  const workspace = useBrandColor((s) => s.workspace);
  const branding = useSession((s) => s.user?.branding);
  const fromUser = branding?.source === "agency" ? branding.primary_color : null;
  // A customer sees their business's colour (staff sign-in, when there is one, wins).
  const staff = useSession((s) => s.status === "signedIn");
  const fromPortal = useActivePortal()?.branding?.primary_color ?? null;
  return <ThemeProvider brandColor={preview ?? workspace ?? fromUser ?? (staff ? null : fromPortal)}>{children}</ThemeProvider>;
}

/** Today, the first tab. */
const HOME = "/" as const;
/** A customer's home in their business's portal. */
const CUSTOMER_HOME = "/customer" as Href;

/** Versions older than the server's minimum must update (checked once per launch; never blocks offline). */
function useUpdateRequired(): boolean {
  const config = useQuery({ queryKey: ["config"], queryFn: () => authApi.config(), staleTime: Infinity, retry: 1 });
  return isOlderThan(Constants.expoConfig?.version, config.data?.min_app_version);
}

function RootStack() {
  const { colors, scheme } = useTheme();
  const statusOverride = useStatusBarOverride((s) => s.style);
  const reduceMotion = useReducedMotion();
  const status = useSession((s) => s.status);
  const gate = useSession((s) => s.gate);
  const updateRequired = useUpdateRequired();
  const signedIn = status === "signedIn";
  // A customer signed in to a business's portal (only when no staff account is signed in on this phone).
  const customer = usePortalSession((s) => s.sessions.length > 0) && !signedIn;

  return (
    <>
      <StatusBar style={statusOverride ?? (scheme === "dark" ? "light" : "dark")} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          // Signing in or out swaps whole sections (sign-in, the app, the portal): a short crossfade, not the
          // platform's default, which showed a blank page in between.
          animation: reduceMotion ? "none" : "fade",
          animationDuration: 180,
        }}
      >
        <Stack.Protected guard={updateRequired}>
          <Stack.Screen name="update" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && !signedIn && !customer} redirectTo={customer ? CUSTOMER_HOME : HOME}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && customer} redirectTo={signedIn ? HOME : "/sign-in"}>
          <Stack.Screen name="customer" />
        </Stack.Protected>
        <Stack.Protected guard={!updateRequired && signedIn && gate === "ok"} redirectTo={!signedIn ? (customer ? CUSTOMER_HOME : "/sign-in") : gate === "paused" ? "/paused" : "/verify-email"}>
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
