import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { emailDocument, hasRemoteImages } from "@/features/inbox/emailDocument";
import { EmailView } from "@/features/inbox/EmailView";
import { originalHtml } from "@/features/inbox/list";
import { useConversation } from "@/features/inbox/useInbox";
import { t } from "@/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { DelayedFallback, Skeleton } from "@/ui/Skeleton";
import { EmptyState } from "@/ui/States";
import { Eye, Mail } from "@/ui/icons";
import { Text } from "@/ui/Text";

/** One email as it was sent (layout, links, images on request), opened from its bubble. */
export default function EmailOriginal() {
  const { itemId = "", messageId = "" } = useLocalSearchParams<{ itemId: string; messageId: string }>();
  const { colors, scheme } = useTheme();
  const conv = useConversation(itemId);
  const [images, setImages] = useState(false);
  const message = conv.data?.messages.find((m) => m.id === messageId);
  const html = message ? originalHtml(message) : null;
  const remote = html ? hasRemoteImages(html) : false;
  // The React Compiler memoises this (enabled in app.json); no manual useMemo.
  const doc = html ? emailDocument(html, { text: colors.text, link: colors.primary, background: colors.background, dark: scheme === "dark" }, { remoteImages: images }) : null;

  return (
    <>
      <Stack.Screen options={{ title: message?.subject?.trim() || t("inbox.originalTitle") }} />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {remote && !images ? (
          <View style={[styles.note, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.border }]}>
            <Text variant="footnote" tone="muted" style={styles.flex}>
              {t("inbox.imagesHidden")}
            </Text>
            <Button label={t("inbox.showImages")} icon={Eye} size="sm" variant="secondary" onPress={() => setImages(true)} />
          </View>
        ) : null}
        {doc ? (
          <EmailView document={doc} />
        ) : conv.isPending ? (
          // Still loading: lines of placeholder, not "missing".
          <DelayedFallback>
            <View style={styles.loading}>
              <Skeleton width="60%" height={18} />
              <Skeleton />
              <Skeleton />
              <Skeleton width="80%" />
            </View>
          </DelayedFallback>
        ) : (
          <EmptyState icon={Mail} title={t("inbox.originalMissing")} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  loading: { padding: gutter, gap: space.md },
  note: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: gutter, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
});
