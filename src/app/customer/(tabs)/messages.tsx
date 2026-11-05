import { useMemo, useRef, useState } from "react";
import { StyleSheet, View, type ScrollViewInstance } from "react-native";
import { KeyboardChatScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { portalApi } from "@/api/portal";
import { userMessage } from "@/api/errors";
import { Composer } from "@/features/inbox/Composer";
import { chronological, messageText } from "@/portal/portal";
import { CustomerHeader } from "@/portal/CustomerHeader";
import { useActivePortal } from "@/portal/portalSession";
import { usePortalAction, usePortalMessages } from "@/portal/usePortal";
import { getIntlLocale, t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { PortalMessage } from "@/types/portal";
import { MessageCircle } from "@/ui/icons";
import { SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";

/**
 * The conversation with the business: their emails, website chats and portal messages, oldest first. The business
 * answers from its normal Inbox; replies arrive here (and as a push), and the screen checks again every minute.
 */
export default function CustomerMessages() {
  const { colors } = useTheme();
  const locale = getIntlLocale();
  const portal = useActivePortal();
  const messages = usePortalMessages(true);
  const scroll = useRef<ScrollViewInstance>(null);
  const [composerHeight, setComposerHeight] = useState(64);
  const rows = useMemo(() => chronological(messages.data?.messages ?? []), [messages.data]);
  const send = usePortalAction((token, body: string) => portalApi.send(token, body));

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <KeyboardChatScrollView
        ref={scroll}
        style={styles.fill}
        contentContainerStyle={{ paddingBottom: composerHeight + space.md }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: rows.length > 0 })}
      >
        <CustomerHeader title={t("portal.tabs.messages")} summary={t("portal.msg.summary", { business: portal?.branding?.business_name ?? "" })} />
        {!messages.data ? (
          messages.isError ? <ErrorState message={userMessage(messages.error)} onRetry={() => void messages.refetch()} /> : <SkeletonList rows={4} bare />
        ) : rows.length === 0 ? (
          <EmptyState icon={MessageCircle} title={t("portal.msg.emptyTitle")} message={t("portal.msg.emptyMessage")} />
        ) : (
          <View style={styles.thread}>
            {rows.map((m) => (
              <MessageBubble key={m.id} m={m} locale={locale} />
            ))}
          </View>
        )}
      </KeyboardChatScrollView>
      <KeyboardStickyView style={styles.sticky} offset={{ closed: 0, opened: 0 }}>
        <Composer onSend={(text) => text.trim() && send.mutate(text.trim().slice(0, 4000))} disabled={send.isPending} placeholder={t("portal.msg.placeholder")} onHeight={setComposerHeight} />
      </KeyboardStickyView>
    </View>
  );
}

function MessageBubble({ m, locale }: { m: PortalMessage; locale: string }) {
  const { colors } = useTheme();
  const mine = m.from === "customer";
  return (
    <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
      <View style={[styles.bubble, mine ? { backgroundColor: colors.primaryFill, borderBottomRightRadius: 6 } : { backgroundColor: colors.surface, borderBottomLeftRadius: 6 }]}>
        {/* Portal messages all carry the same generic subject; only emails have a real one. */}
        {m.subject && m.channel === "email" ? (
          <Text variant="footnote" weight="semibold" style={{ color: mine ? colors.onPrimary : colors.text }} numberOfLines={2}>
            {m.subject}
          </Text>
        ) : null}
        <Text variant="body" selectable style={{ color: mine ? colors.onPrimary : colors.text }}>
          {messageText(m.body)}
        </Text>
      </View>
      {m.created_at ? (
        <Text variant="caption" tone="muted" style={mine ? styles.timeRight : undefined}>
          {relativeTime(m.created_at, locale)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { paddingHorizontal: gutter, gap: space.md },
  bubbleRow: { maxWidth: "85%", gap: 4 },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: space.md + 2, paddingVertical: space.sm + 2, borderRadius: radius.lg, gap: 2 },
  timeRight: { alignSelf: "flex-end" },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
