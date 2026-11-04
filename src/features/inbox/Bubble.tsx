import { memo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { timeOfDay } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { CircleAlert, Clock, ExternalLink, ICON_STROKE, Paperclip } from "@/ui/icons";
import { Text } from "@/ui/Text";
import { bubbleText, originalHtml, splitQuote } from "./list";
import type { PendingMessage } from "./useInbox";

type Props = { message: PendingMessage; firstInGroup: boolean; lastInGroup: boolean; locale: string; onRetry?: (m: PendingMessage) => void; onViewOriginal?: (m: PendingMessage) => void };

/**
 * A chat bubble. Theirs on the left (soft surface), yours on the right (brand). Consecutive messages stack with
 * tight corners; the time sits under the last of a group. Sending / failed states are shown on your own bubbles.
 */
export const Bubble = memo(function Bubble({ message: m, firstInGroup, lastInGroup, locale, onRetry, onViewOriginal }: Props) {
  const { colors } = useTheme();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (m.message_kind === "activity") {
    return (
      <View style={styles.activity}>
        <Text variant="caption" tone="muted" align="center" style={[styles.activityChip, { backgroundColor: colors.surfaceSecondary }]}>
          {m.activity_label || m.body_text}
        </Text>
      </View>
    );
  }

  const mine = m.direction === "outbound";
  const full = bubbleText(m);
  const hasOriginal = Boolean(onViewOriginal) && originalHtml(m) != null;
  // Earlier mail quoted under a reply is hidden behind a toggle, as on the web.
  const { own, quote } = splitQuote(full);
  const text = quote && !quoteOpen ? own : full;
  // A whole email (often a campaign's) folds to a few lines, so one message doesn't fill the screen.
  const long = isLongMessage(text);
  const linkColor = mine && !m.failed ? colors.onPrimary : colors.primary;
  const corner = 6;
  const shape = mine
    ? { borderTopRightRadius: firstInGroup ? radius.xl : corner, borderBottomRightRadius: lastInGroup ? radius.xl : corner }
    : { borderTopLeftRadius: firstInGroup ? radius.xl : corner, borderBottomLeftRadius: lastInGroup ? radius.xl : corner };

  const bubble = (
    <View
      style={[
        styles.bubble,
        shape,
        // Yours in a soft brand gradient (fill to its pressed shade: both dark enough for white text in either theme).
        mine
          ? m.failed
            ? { backgroundColor: colors.dangerSurface, alignSelf: "flex-end" }
            : { backgroundColor: colors.primaryFill, backgroundImage: `linear-gradient(135deg, ${colors.primaryFill}, ${colors.primaryFillPressed})`, alignSelf: "flex-end" }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, alignSelf: "flex-start" },
        m.pending && styles.pending,
      ]}
    >
      {m.subject && m.body_text ? (
        <Text variant="footnote" weight="semibold" style={{ color: mine && !m.failed ? colors.onPrimary : colors.text }} numberOfLines={2}>
          {m.subject}
        </Text>
      ) : null}
      <Text variant="body" selectable numberOfLines={long && !expanded ? COLLAPSED_LINES : undefined} style={{ color: mine && !m.failed ? colors.onPrimary : colors.text }}>
        {text}
      </Text>
      {long ? (
        <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={8} accessibilityRole="button" style={styles.original}>
          <Text variant="footnote" weight="semibold" style={{ color: linkColor }}>
            {expanded ? t("inbox.showLess") : t("inbox.showMore")}
          </Text>
        </Pressable>
      ) : null}
      {m.attachment_names?.length ? (
        <View style={styles.original}>
          <Paperclip size={13} color={linkColor} strokeWidth={ICON_STROKE + 0.25} />
          <Text variant="footnote" weight="medium" numberOfLines={1} style={[styles.files, { color: linkColor }]}>
            {m.attachment_names.join(", ")}
          </Text>
        </View>
      ) : null}
      {quote ? (
        <Pressable onPress={() => setQuoteOpen((o) => !o)} hitSlop={8} accessibilityRole="button" style={styles.original}>
          <Text variant="footnote" weight="semibold" style={{ color: linkColor }}>
            {quoteOpen ? t("inbox.hideQuote") : t("inbox.showQuote")}
          </Text>
        </Pressable>
      ) : null}
      {hasOriginal ? (
        <Pressable onPress={() => onViewOriginal?.(m)} hitSlop={8} accessibilityRole="link" accessibilityLabel={t("inbox.viewOriginal")} style={styles.original}>
          <ExternalLink size={13} color={mine ? colors.onPrimary : colors.primary} strokeWidth={ICON_STROKE + 0.25} />
          <Text variant="footnote" weight="semibold" style={{ color: mine ? colors.onPrimary : colors.primary }}>
            {t("inbox.viewOriginal")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.wrap, { marginTop: firstInGroup ? space.md : 3 }, mine ? styles.right : styles.left]}>
      {m.failed && onRetry ? (
        <Pressable onPress={() => onRetry(m)} accessibilityRole="button" accessibilityLabel={t("inbox.failed")}>
          {bubble}
        </Pressable>
      ) : (
        bubble
      )}
      {lastInGroup || m.pending || m.failed ? (
        <View style={[styles.meta, mine ? styles.metaRight : null]}>
          {m.pending ? <Clock size={11} color={colors.textSubtle} strokeWidth={2} /> : null}
          {m.failed ? <CircleAlert size={12} color={colors.danger} strokeWidth={ICON_STROKE + 0.5} /> : null}
          <Text variant="caption" tone={m.failed ? "danger" : "subtle"}>
            {m.failed ? t("inbox.failed") : m.pending ? t("inbox.sending") : timeOfDay(m.created_at, locale)}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const COLLAPSED_LINES = 8;

/**
 * Pure: a message long enough to fold — it would wrap to clearly more lines than the folded height. About 32
 * characters fit a bubble line on a phone; each paragraph (and each blank line) takes at least one.
 */
export function isLongMessage(text: string): boolean {
  const lines = text.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil(p.length / 32)), 0);
  return lines > COLLAPSED_LINES + 2;
}

const styles = StyleSheet.create({
  wrap: { maxWidth: "82%" },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: space.md + 2, paddingVertical: space.sm + 1, borderRadius: radius.xl, gap: 2 },
  pending: { opacity: 0.7 },
  original: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: space.xs },
  files: { flexShrink: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, paddingHorizontal: space.xs },
  metaRight: { justifyContent: "flex-end" },
  activity: { alignItems: "center", marginVertical: space.md },
  activityChip: { paddingHorizontal: space.md, paddingVertical: 4, borderRadius: radius.pill, overflow: "hidden" },
});
