import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { approvePayload, confidencePercent, draftLeadName, humanize, isApprovable, variantText, type DraftVariant } from "@/features/approvals/approvals";
import { useDecideDraft, useDraft } from "@/features/approvals/useApprovals";
import { getIntlLocale, t } from "@/i18n";
import { dateTime, relativeTime } from "@/lib/format";
import { openContact } from "@/lib/navigate";
import { useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { AiDraft } from "@/types/approvals";
import { Avatar } from "@/ui/Avatar";
import { Badge } from "@/ui/Badge";
import { Banner } from "@/ui/Banner";
import { Backdrop, useAreaHeaderStyle } from "@/ui/Backdrop";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChannelBadge, channelLabel } from "@/ui/ChannelIcon";
import { CalendarClock, Check, ICON_STROKE, Sparkles, UserRound, X } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Screen } from "@/ui/Screen";
import { SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { DelayedFallback, Skeleton } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { scoreTone } from "@/ui/scoreTone";
import { Text } from "@/ui/Text";

/** One AI draft: who it's for, why the AI wrote it, the text (editable), then Approve or Reject. */
export default function ApprovalScreen() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw) || 0;
  const query = useDraft(id);
  // Approvals live under Today: the same indigo wash.
  const headerStyle = useAreaHeaderStyle("today");
  const draft = query.data;

  if (!draft) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerStyle }} />
        <Screen>
          {query.isPending ? (
            <DelayedFallback>
              <View style={styles.loading}>
                <Skeleton width={56} height={56} round />
                <Skeleton width={180} height={22} />
                <Skeleton width="100%" height={160} />
              </View>
            </DelayedFallback>
          ) : (
            <View style={styles.errorPad}>
              <ErrorState message={userMessage(query.error)} onRetry={() => void query.refetch()} />
            </View>
          )}
        </Screen>
      </>
    );
  }
  // Keyed so switching to another draft (a second push) starts from its own text.
  return <DraftReview key={draft.id} draft={draft} refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />;
}

function DraftReview({ draft, refreshing, onRefresh }: { draft: AiDraft; refreshing: boolean; onRefresh: () => void }) {
  const { colors } = useTheme();
  const headerStyle = useAreaHeaderStyle("today");
  const locale = getIntlLocale();
  const decide = useDecideDraft();
  const canDecide = useCan("ai_drafts_decide") && isApprovable(draft);
  const hasB = Boolean(draft.proposed_body_b?.trim());
  const [variant, setVariant] = useState<DraftVariant>("a");
  // null until the reviewer types: until then the text follows the draft (the list copy, then the full one).
  const [edits, setEdits] = useState<{ subject: string; body: string } | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const baseline = variantText(draft, variant);
  const text = edits ?? baseline;

  const name = draftLeadName(draft, t("approvals.aLead"));
  const isEmail = draft.channel === "email";
  const payload = approvePayload(draft, variant, text);
  const edited = text.body.trim() !== baseline.body.trim() || (isEmail && text.subject.trim() !== baseline.subject.trim());
  const confidence = confidencePercent(draft);
  const intent = humanize(draft.classification?.intent);
  const busy = decide.isPending;
  const booking = draft.proposed_booking;

  const pickVariant = (v: DraftVariant) => {
    setVariant(v);
    setEdits(null);
  };
  const done = () => (router.canGoBack() ? router.back() : router.replace("/approvals"));
  const approve = () => decide.mutate({ id: draft.id, kind: "approve", edited: payload }, { onSuccess: done });
  const reject = () => decide.mutate({ id: draft.id, kind: "reject", reason: reason.trim() || undefined }, { onSuccess: done });

  return (
    <>
      <Stack.Screen options={{ title: t("approvals.draftTitle"), headerStyle }} />
      <Screen onRefresh={onRefresh} refreshing={refreshing} keyboardAware>
        <View style={styles.hero}>
          <Backdrop area="today" underBar />
          <View>
            <Avatar name={name} size={56} />
            <View style={styles.channel}>
              <ChannelBadge channel={draft.channel} size={22} />
            </View>
          </View>
          <Text variant="title" align="center" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="subhead" tone="muted" align="center" numberOfLines={1}>
            {[draft.lead?.company, channelLabel[draft.channel], relativeTime(draft.created_at, locale)].filter(Boolean).join(" · ")}
          </Text>
          {draft.lead_id ? <Button label={t("approvals.openContact")} icon={UserRound} variant="ghost" size="sm" onPress={() => openContact(draft.lead_id)} style={styles.center} /> : null}
        </View>

        {intent || draft.reason || draft.classification?.reasoning ? (
          <Card style={styles.card}>
            <View style={styles.whyHead}>
              <Sparkles size={16} color={colors.primary} strokeWidth={ICON_STROKE} />
              <Text variant="subhead" weight="semibold" style={styles.flex}>
                {intent ? t("approvals.classifiedAs", { intent }) : t("approvals.why")}
              </Text>
              {/* How sure the AI is, coloured like a score: green from 70, amber from 40, red below. */}
              {confidence != null ? <Badge label={t("approvals.confidence", { n: confidence })} tone={scoreTone(confidence)} dot /> : null}
            </View>
            {draft.classification?.reasoning || draft.reason ? (
              <Text variant="footnote" tone="secondary" style={styles.whyText}>
                {draft.classification?.reasoning || draft.reason}
              </Text>
            ) : null}
            {draft.skip_reason === "below_threshold" ? (
              <Text variant="footnote" tone="warning" style={styles.whyText}>
                {t("approvals.lowConfidence")}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {draft.content_findings.length ? (
          <View style={styles.block}>
            <Banner kind="warning" message={t("approvals.flagged")} />
          </View>
        ) : null}
        {draft.error_message ? (
          <View style={styles.block}>
            <Banner kind="danger" message={draft.error_message} />
          </View>
        ) : null}

        <SectionHeader title={draft.action_type === "send_follow_up" ? t("approvals.followUp") : t("approvals.reply")} />
        <View style={styles.editor}>
          {hasB && canDecide ? (
            <SegmentedControl<DraftVariant>
              value={variant}
              onChange={pickVariant}
              options={[
                { key: "a", label: t("approvals.versionA") },
                { key: "b", label: t("approvals.versionB") },
              ]}
            />
          ) : null}
          {isEmail ? (
            <Input
              label={t("approvals.subject")}
              value={text.subject}
              editable={canDecide}
              onChangeText={(subject) => setEdits({ ...text, subject })}
            />
          ) : null}
          <Input
            label={t("approvals.message")}
            value={text.body}
            editable={canDecide}
            multiline
            onChangeText={(body) => setEdits({ ...text, body })}
            style={styles.body}
          />
          {edited && canDecide ? (
            <Text variant="footnote" tone="muted">
              {t("approvals.editedHint")}
            </Text>
          ) : null}
        </View>

        {booking ? (
          <View style={[styles.booking, { backgroundColor: colors.primarySubtle }]}>
            <CalendarClock size={18} color={colors.primary} strokeWidth={ICON_STROKE} />
            <Text variant="subhead" tone="primary" weight="medium" style={styles.flex}>
              {t(booking.is_reschedule ? "approvals.willReschedule" : "approvals.willBook", { when: dateTime(booking.start, locale) })}
            </Text>
          </View>
        ) : null}

        {canDecide ? (
          rejecting ? (
            <View style={styles.actions}>
              <Input label={t("approvals.rejectReason")} placeholder={t("approvals.rejectReasonHint")} value={reason} onChangeText={setReason} multiline style={styles.reason} />
              <View style={styles.row}>
                <Button label={t("common.back")} variant="secondary" disabled={busy} onPress={() => setRejecting(false)} style={styles.flexBtn} />
                <Button label={t("approvals.confirmReject")} variant="danger" icon={X} loading={busy} onPress={reject} style={styles.flexBtn} />
              </View>
            </View>
          ) : (
            <View style={[styles.actions, styles.row]}>
              <Button label={t("approvals.reject")} variant="secondary" icon={X} disabled={busy} onPress={() => setRejecting(true)} style={styles.flexBtn} />
              <Button
                label={edited ? t("approvals.approveEdited") : t("approvals.approveSend")}
                icon={Check}
                loading={busy}
                disabled={!text.body.trim()}
                onPress={approve}
                style={styles.flexBtn}
              />
            </View>
          )
        ) : (
          <Text variant="footnote" tone="muted" align="center" style={styles.actions}>
            {isApprovable(draft) ? t("approvals.viewOnly") : draft.status === "failed" ? t("approvals.failedHint") : t("approvals.alreadyDecided")}
          </Text>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { padding: gutter, gap: space.lg, alignItems: "center" },
  errorPad: { paddingTop: space.xxl },
  hero: { alignItems: "center", gap: space.xs, paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.md },
  channel: { position: "absolute", right: -4, bottom: -4 },
  center: { alignSelf: "center" },
  card: { marginHorizontal: gutter, marginTop: space.sm },
  whyHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  whyText: { marginTop: space.sm },
  flex: { flex: 1, minWidth: 0 },
  block: { paddingHorizontal: gutter, marginTop: space.sm },
  editor: { paddingHorizontal: gutter, gap: space.md },
  body: { minHeight: 180, textAlignVertical: "top" },
  booking: { flexDirection: "row", alignItems: "center", gap: space.sm, marginHorizontal: gutter, marginTop: space.lg, padding: space.md, borderRadius: radius.md },
  actions: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.xxl, gap: space.md },
  row: { flexDirection: "row", gap: space.sm },
  reason: { minHeight: 72, textAlignVertical: "top" },
  flexBtn: { flex: 1, alignSelf: "auto" },
});
