import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { FormScreen } from "@/ui/FormScreen";
import { ArrowUpCircle, ICON_STROKE } from "@/ui/icons";
import { Logo } from "@/ui/Logo";
import { Text } from "@/ui/Text";

/** This app version is older than the server's minimum (GET /api/mobile/config). Store links come with the store listing. */
export default function UpdateRequired() {
  const { colors } = useTheme();
  return (
    <FormScreen footer={<Logo height={32} tagline={false} />}>
      <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
        <ArrowUpCircle size={26} color={colors.primary} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("gate.updateTitle")}
        </Text>
        <Text variant="body" tone="secondary">
          {t("gate.updateMessage")}
        </Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  heading: { gap: space.xs },
});
