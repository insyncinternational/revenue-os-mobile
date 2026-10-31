import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { t } from "@/i18n";
import { Button } from "./Button";
import { CircleAlert, ICON_STROKE, RefreshCw, WifiOff, type IconComponent } from "./icons";
import { Text } from "./Text";

type EmptyProps = { icon: IconComponent; title: string; message?: string; actionLabel?: string; onAction?: () => void };

/** Empty list or screen: always says what to do next. */
export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: colors.primarySubtle }]}>
        <Icon size={26} color={colors.primary} strokeWidth={ICON_STROKE} />
      </View>
      <Text variant="headline" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="subhead" tone="muted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

/** Failed load: friendly message + Retry. Never raw error text. */
export function ErrorState({ message, onRetry, offline }: { message?: string; onRetry?: () => void; offline?: boolean }) {
  const { colors } = useTheme();
  const Icon = offline ? WifiOff : CircleAlert;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: offline ? colors.surfaceTertiary : colors.dangerSurface }]}>
        <Icon size={26} color={offline ? colors.textMuted : colors.danger} strokeWidth={ICON_STROKE} />
      </View>
      <Text variant="headline" align="center">
        {offline ? t("state.offlineTitle") : t("state.errorTitle")}
      </Text>
      <Text variant="subhead" tone="muted" align="center" style={styles.message}>
        {message ?? (offline ? t("state.offlineMessage") : t("state.errorMessage"))}
      </Text>
      {onRetry ? <Button label={t("common.retry")} icon={RefreshCw} variant="secondary" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

/** Thin banner under the header while offline; cached data stays visible below it. */
export function OfflineBanner() {
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.surfaceTertiary }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <WifiOff size={14} color={colors.textSecondary} strokeWidth={2} />
      <Text variant="footnote" tone="secondary" weight="medium">
        {t("state.offlineBanner")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: gutter * 2, paddingVertical: space.huge, gap: space.sm },
  iconRing: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: space.sm },
  message: { maxWidth: 300 },
  action: { marginTop: space.md, alignSelf: "center" },
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs + 2, paddingVertical: space.xs + 2 },
});
