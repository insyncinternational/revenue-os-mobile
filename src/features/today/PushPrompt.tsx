import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { askForPush, dismissPushAsk, pushAskDismissedRecently, pushPermission } from "@/push/push";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { BellRing, ICON_STROKE } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/**
 * Asks for notifications at a moment that explains why (never the system dialog on first launch).
 * Shown only while the phone hasn't been asked yet; "Not now" hides it for a week.
 */
export function PushPrompt() {
  const { colors } = useTheme();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!pushAskDismissedRecently()) {
      void pushPermission().then((p) => {
        if (alive) setShow(p === "undetermined");
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  if (!show) return null;

  return (
    <Card elevated contentStyle={styles.body}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
          <BellRing size={22} color={colors.primary} strokeWidth={ICON_STROKE} />
        </View>
        <View style={styles.flex}>
          <Text variant="headline">{t("push.askTitle")}</Text>
          <Text variant="subhead" tone="muted">
            {t("push.askMessage")}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button
          label={t("push.notNow")}
          variant="ghost"
          onPress={() => {
            dismissPushAsk();
            setShow(false);
          }}
        />
        <Button
          label={t("push.turnOn")}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            const result = await askForPush();
            setBusy(false);
            setShow(false);
            if (result === "granted") {
              haptics.success();
              toast.show(t("push.enabled"), { kind: "success" });
            } else if (result === "denied") {
              toast.show(t("push.blocked"));
            }
          }}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.md },
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm },
});
