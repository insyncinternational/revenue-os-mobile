import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { AiAgentAction, AiDraft } from "@/types/approvals";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { ChannelBadge } from "@/ui/ChannelIcon";
import { Bot, CalendarClock, ICON_STROKE } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";
import { draftLeadName, humanize } from "./approvals";

/** A draft reply: who it's for, the first lines of what the AI wrote, why it waits. Tap to read, edit and decide. */
export const DraftRow = memo(function DraftRow({ draft, locale, onOpen }: { draft: AiDraft; locale: string; onOpen: (d: AiDraft) => void }) {
  const { colors } = useTheme();
  const name = draftLeadName(draft, t("approvals.aLead"));
  const body = (draft.edited_body || draft.proposed_body || "").replace(/\s+/g, " ").trim();
  const intent = humanize(draft.classification?.intent);
  return (
    <PressableScale
      onPress={() => onOpen(draft)}
      scaleTo={0.985}
      accessibilityLabel={[t("approvals.draftFor", { name }), body, intent].filter(Boolean).join(". ")}
      style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.top}>
        <View>
          <Avatar name={name} size={40} />
          <View style={styles.channel}>
            <ChannelBadge channel={draft.channel} size={18} />
          </View>
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text variant="callout" weight="semibold" numberOfLines={1} style={styles.flex}>
              {name}
            </Text>
            <Text variant="caption" tone="subtle">
              {relativeTime(draft.created_at, locale)}
            </Text>
          </View>
          <Text variant="subhead" tone="secondary" numberOfLines={2}>
            {body || t("approvals.noText")}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Badge label={draft.action_type === "send_follow_up" ? t("approvals.followUp") : t("approvals.reply")} tone="brand" />
        {intent ? <Badge label={intent} tone="neutral" /> : null}
        {draft.proposed_booking ? (
          <View style={styles.booking}>
            <CalendarClock size={14} color={colors.primary} strokeWidth={ICON_STROKE} />
            <Text variant="caption" tone="primary" weight="medium">
              {t("approvals.booksMeeting")}
            </Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
});

/** An agent action: what it will do, who asked, and Approve / Reject right on the row (no text to review). */
export const ActionRow = memo(function ActionRow({
  action,
  locale,
  canDecide,
  busy,
  onDecide,
}: {
  action: AiAgentAction;
  locale: string;
  canDecide: boolean;
  busy: boolean;
  onDecide: (a: AiAgentAction, kind: "approve" | "reject") => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]} accessible={!canDecide} accessibilityLabel={`${action.title}. ${action.agent_name ?? ""}`}>
      <View style={styles.top}>
        <View style={[styles.botIcon, { backgroundColor: colors.primarySubtle }]}>
          <Bot size={20} color={colors.primary} strokeWidth={ICON_STROKE} />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text variant="callout" weight="semibold" numberOfLines={2} style={styles.flex}>
              {action.title}
            </Text>
            <Text variant="caption" tone="subtle">
              {relativeTime(action.createdAt, locale)}
            </Text>
          </View>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {[action.agent_name || t("approvals.aiAgent"), action.action_label].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>
      {canDecide ? (
        <View style={styles.buttons}>
          <Button label={t("approvals.reject")} variant="secondary" size="sm" disabled={busy} onPress={() => onDecide(action, "reject")} style={styles.flexBtn} />
          <Button label={t("approvals.approve")} size="sm" disabled={busy} onPress={() => onDecide(action, "approve")} style={styles.flexBtn} />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  item: { marginHorizontal: gutter, marginBottom: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1, gap: space.sm },
  top: { flexDirection: "row", gap: space.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  channel: { position: "absolute", right: -4, bottom: -4 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm, paddingLeft: 40 + space.md },
  booking: { flexDirection: "row", alignItems: "center", gap: 4 },
  botIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  buttons: { flexDirection: "row", gap: space.sm, paddingLeft: 40 + space.md },
  flexBtn: { flex: 1, alignSelf: "auto" },
});
