import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type TextInputInstance } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { authApi, isSignedIn, isTwoFactorRequired } from "@/api/auth";
import { ApiError, userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { looksLikeEmail, useAuthFlow } from "@/session/authFlow";
import { googleSignInAvailable, signInWithGoogle } from "@/session/googleSignIn";
import { useLaunch } from "@/session/launch";
import { useSession } from "@/session/sessionStore";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, launchBrand, radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { GoogleIcon } from "@/ui/BrandIcons";
import { Button } from "@/ui/Button";
import { GradientFill } from "@/ui/Gradient";
import { Eye, EyeOff, ICON_STROKE, Lock, Mail } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { BrandMark } from "@/ui/Logo";
import { Reveal } from "@/ui/Reveal";
import { Text } from "@/ui/Text";

const HALO = 150;

/** Short phones drop the subtitle and tighten the gaps, so the whole form always fits without scrolling. */
const COMPACT = 700;

/**
 * Sign in on one calm screen — no scrolling: the brand tile under a soft glow, "Welcome back", the form, Google, and
 * the footer pinned to the bottom. The keyboard lifts the content instead of scrolling it. Everything enters after
 * the launch intro; a refused sign-in gives the form a small shake.
 */
export default function SignIn() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // While typing, the tile, subtitle and footer step aside so the form has the room (nothing overlaps or scrolls).
  // A focused field counts too: the keyboard state can be stale when the app comes back with the keyboard
  // already up, and the footer then sat on top of "Continue with Google".
  const keyboardUp = useKeyboardState((k) => k.isVisible);
  const [fieldFocused, setFieldFocused] = useState(false);
  const typing = keyboardUp || fieldFocused;
  const compact = height < COMPACT || typing;
  const introDone = useLaunch((s) => s.introDone);
  const signIn = useSession((s) => s.signIn);
  const endedReason = useSession((s) => s.endedReason);
  const flow = useAuthFlow();
  const [email, setEmail] = useState(flow.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const passwordRef = useRef<TextInputInstance>(null);
  const shake = useSharedValue(0);
  const wait = !introDone;

  const login = useMutation({
    mutationFn: async () => {
      const result = await authApi.login(email.trim(), password);
      if (!isTwoFactorRequired(result) && !isSignedIn(result)) throw new ApiError("unknown", 200, t("state.errorMessage"));
      return result;
    },
    onSuccess: async (result) => {
      flow.setEmail(email.trim());
      if (isTwoFactorRequired(result)) {
        flow.setChallenge(result.challenge_token);
        setPassword("");
        router.push("/two-factor");
        return;
      }
      haptics.success();
      await signIn(result);
    },
  });

  const google = useMutation({
    mutationFn: signInWithGoogle,
    onSuccess: async (r) => {
      if (r.kind === "twoFactor") {
        flow.setChallenge(r.challenge);
        router.push("/two-factor");
      } else if (r.kind === "signedIn") {
        haptics.success();
        await signIn(r.result);
      }
    },
  });
  const googleError =
    google.data?.kind === "error"
      ? google.data.code === "no_account"
        ? t("auth.googleNoAccount")
        : google.data.code === "suspended"
          ? t("error.suspended")
          : t("auth.googleFailed")
      : google.error
        ? userMessage(google.error)
        : null;

  // A refused sign-in: a quick side-to-side shake, the way a lock screen says "no".
  const failed = login.isError || google.data?.kind === "error";
  useEffect(() => {
    if (!failed) return;
    haptics.warning();
    shake.set(withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(6, { duration: 60 }), withTiming(0, { duration: 50 })));
  }, [failed, login.failureCount, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const submit = () => {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = t("auth.enterEmail");
    else if (!looksLikeEmail(email)) errors.email = t("auth.invalidEmail");
    if (!password) errors.password = t("auth.enterPassword");
    setFieldErrors(errors);
    if (errors.email || errors.password || login.isPending) return;
    login.mutate();
  };

  const notice =
    login.error != null
      ? userMessage(login.error)
      : googleError
        ? googleError
        : endedReason === "suspended"
          ? t("error.suspended")
          : endedReason === "unauthorized"
            ? t("error.sessionEnded")
            : null;

  const gap = compact ? space.md : space.lg;
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <TopGlow />
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <View style={[styles.column, { paddingTop: insets.top + (compact ? space.xl : space.huge), paddingBottom: insets.bottom + space.lg, gap }]}>
          {/* Head and form together, centred in the space above the footer. */}
          <View style={[styles.main, { gap: compact ? space.xl : space.xxxl }]}>
          <Reveal wait={wait} style={styles.head}>
            {typing ? null : <BrandTile />}
            <Text variant={compact ? "title" : "largeTitle"} align="center" accessibilityRole="header">
              {t("signin.title")}
            </Text>
            {compact ? null : (
              <Text variant="callout" tone="muted" align="center">
                {t("signin.subtitle")}
              </Text>
            )}
          </Reveal>

          <Animated.View style={[styles.form, { gap }, shakeStyle]}>
            {notice ? <Banner message={notice} kind={login.error || googleError ? "danger" : "warning"} /> : null}
            <Reveal index={1} wait={wait}>
              <Input
                label={t("auth.email")}
                placeholder={t("auth.emailPlaceholder")}
                icon={Mail}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
                }}
                error={fieldErrors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="username"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFieldFocused(true)}
                onBlur={() => setFieldFocused(false)}
              />
            </Reveal>
            <Reveal index={2} wait={wait}>
              <Input
                ref={passwordRef}
                label={t("auth.password")}
                icon={Lock}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
                }}
                error={fieldErrors.password}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                onFocus={() => setFieldFocused(true)}
                onBlur={() => setFieldFocused(false)}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {showPassword ? <EyeOff size={18} color={colors.textMuted} strokeWidth={ICON_STROKE} /> : <Eye size={18} color={colors.textMuted} strokeWidth={ICON_STROKE} />}
                  </Pressable>
                }
              />
              <Pressable onPress={() => router.push("/forgot-password")} hitSlop={10} accessibilityRole="link" accessibilityLabel={t("auth.forgotPassword")} style={styles.forgot}>
                <Text variant="subhead" tone="primary" weight="semibold">
                  {t("auth.forgotPassword")}
                </Text>
              </Pressable>
            </Reveal>

            <Reveal index={3} wait={wait} style={{ gap }}>
              <Button label={t("auth.signIn")} size="lg" fullWidth loading={login.isPending} disabled={google.isPending} onPress={submit} />
              {googleSignInAvailable ? (
                <>
                  <View style={styles.or}>
                    <View style={[styles.rule, { backgroundColor: colors.border }]} />
                    <Text variant="footnote" tone="muted">
                      {t("auth.or")}
                    </Text>
                    <View style={[styles.rule, { backgroundColor: colors.border }]} />
                  </View>
                  <Button label={t("auth.continueGoogle")} variant="secondary" size="lg" fullWidth loading={google.isPending} disabled={login.isPending} onPress={() => google.mutate()} icon={GoogleIcon} />
                </>
              ) : null}
            </Reveal>
          </Animated.View>
          </View>

          {typing ? null : (
            <Reveal index={4} wait={wait}>
              <Text variant="footnote" tone="muted" align="center">
                {t("auth.noAccount")}
              </Text>
              {/* Customers of a business sign in to its portal instead (a code from their email, or their portal password). */}
              <Pressable onPress={() => router.push("/customer-sign-in")} hitSlop={10} accessibilityRole="link" style={styles.customer}>
                <Text variant="subhead" weight="semibold" align="center" style={{ color: colors.primaryText }}>
                  {t("portal.signIn.entry")}
                </Text>
              </Pressable>
            </Reveal>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The brand mark on an indigo app-icon tile, with a soft halo that breathes slowly behind it. */
function BrandTile() {
  const reduce = useReducedMotion();
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (!reduce) breathe.set(withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, breathe]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.55 + breathe.value * 0.45, transform: [{ scale: 0.92 + breathe.value * 0.1 }] }));
  return (
    <View style={styles.tileWrap} accessible accessibilityRole="image" accessibilityLabel="GrowthReach.ai">
      {/* A soft round glow, fading to nothing at its edge. */}
      <Animated.View style={[styles.halo, halo]}>
        <Svg width={HALO} height={HALO}>
          <Defs>
            <RadialGradient id="tileHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.35" stopColor={launchBrand.glow} stopOpacity={0.45} />
              <Stop offset="1" stopColor={launchBrand.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={HALO} height={HALO} fill="url(#tileHalo)" />
        </Svg>
      </Animated.View>
      <View style={styles.tile}>
        <GradientFill from={launchBrand.splash} to={launchBrand.to} glow={launchBrand.glowSoft} glowOpacity={0.45} />
        <BrandMark size={40} tone="onBrand" />
      </View>
    </View>
  );
}

/** A faint brand-coloured light falling from the top edge — colour without a heavy header. */
function TopGlow() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const h = 340;
  return (
    <Svg width={width} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="signinGlow" cx="50%" cy="0%" rx="75%" ry="100%">
          <Stop offset="0" stopColor={colors.primary} stopOpacity={0.16} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={h} fill="url(#signinGlow)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Head, form and footer spread over the full height; nothing scrolls.
  column: { flex: 1, paddingHorizontal: gutter + space.sm, width: "100%", maxWidth: 460, alignSelf: "center" },
  main: { flex: 1, justifyContent: "center" },
  head: { alignItems: "center", gap: space.sm },
  tileWrap: { width: 88, height: 88, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  halo: { position: "absolute", width: HALO, height: HALO, left: (88 - HALO) / 2, top: (88 - HALO) / 2 },
  tile: { width: 68, height: 68, borderRadius: radius.xl + 6, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  form: { width: "100%" },
  forgot: { alignSelf: "flex-end", marginTop: space.sm },
  customer: { alignSelf: "center", marginTop: space.md, paddingVertical: space.xs },
  or: { flexDirection: "row", alignItems: "center", gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
