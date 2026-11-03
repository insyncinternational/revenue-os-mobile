import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardChatScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useMutation, useQuery } from "@tanstack/react-query";
import { haptics } from "@/lib/haptics";
import { inboxApi } from "@/api/inbox";
import { ApiError, userMessage } from "@/api/errors";
import { Bubble } from "@/features/inbox/Bubble";
import type { ReplyAttachment } from "@/features/inbox/attachments";
import { Composer } from "@/features/inbox/Composer";
import { contactName, threadRows } from "@/features/inbox/list";
import { useConversation, useInboxAction, useSendReply, type PendingMessage } from "@/features/inbox/useInbox";
import { getIntlLocale, t } from "@/i18n";
import { useActiveBaseId, useCan } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { gutter, radius, space } from "@/theme/tokens";
import type { RewriteMode, WhatsAppAccountOption } from "@/types/inbox";
import { Avatar } from "@/ui/Avatar";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ChannelGlyph, channelLabel } from "@/ui/ChannelIcon";
import { Chip } from "@/ui/Chip";
import { Archive, FileText, ICON_STROKE, Mail, Phone, UserRound, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { DelayedFallback, SkeletonList } from "@/ui/Skeleton";
import { ErrorState } from "@/ui/States";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

export default function Conversation() {
  const { itemId = "" } = useLocalSearchParams<{ itemId: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const locale = getIntlLocale();
  const conv = useConversation(itemId);
  const act = useInboxAction();
  const send = useSendReply(itemId);
  const canReply = useCan("inbox_reply");
  const canManage = useCan("inbox_manage");
  const scroll = useRef<ScrollViewInstance>(null);
  // Follows the newest message only when it should: on open, right after sending, or while the reader
  // is already at the bottom. Reading further up is never interrupted by a refetch or an image loading.
  const atBottom = useRef(true);
  const toEndNext = useRef(false);
  const [composerHeight, setComposerHeight] = useState(64);
  const [waAccount, setWaAccount] = useState<WhatsAppAccountOption | null>(null);
  const [windowClosed, setWindowClosed] = useState(false);
  const markedRead = useRef(false);
  // Files of replies still sending, so "tap to retry" resends them too.
  const sentFiles = useRef(new Map<string, ReplyAttachment[]>());

  const item = conv.data?.item;
  const name = item ? contactName(item) : "";
  const rows = useMemo(() => threadRows(conv.data?.messages ?? []), [conv.data?.messages]);
  const waOptions = item?.channel === "whatsapp" ? (item.whatsapp_account_options ?? []) : [];
  // Default sender: the number this conversation already uses (as on the web), else the first.
  const waDefault = waOptions.find((o) => o.integration_id === item?.whatsapp_from?.integration_id) ?? null;
  const waSelected = waAccount ?? waDefault ?? waOptions[0] ?? null;
  const baseId = useActiveBaseId();
  const rewrite = async (text: string, mode: RewriteMode) => {
    try {
      return (await inboxApi.rewrite(baseId!, text, mode)).text;
    } catch (e) {
      toast.show(userMessage(e), { kind: "error" });
      throw e;
    }
  };
  const peek = () => {
    if (item?.lead_id) router.push({ pathname: "/contact-peek", params: { itemId: item.id } });
  };

  // Opening a conversation reads it (once per visit).
  useEffect(() => {
    if (item && item.unread_count > 0 && !markedRead.current) {
      markedRead.current = true;
      act.mutate({ id: item.id, action: "read" });
    }
  }, [item, act]);

  const sendText = (text: string, retryOf?: string, attachments: ReplyAttachment[] = []) => {
    const tempId = retryOf ?? `local-${Date.now()}`;
    toEndNext.current = true;
    const account = waOptions.length ? waSelected : null;
    const files = retryOf ? (sentFiles.current.get(retryOf) ?? []) : attachments;
    if (files.length) sentFiles.current.set(tempId, files);
    send.mutate(
      { text, tempId, whatsapp: account ? { integration_id: account.integration_id, account_id: account.account_id } : null, attachments: files },
      {
        onSuccess: () => sentFiles.current.delete(tempId),
        onError: (e) => {
          if (e instanceof ApiError && e.code === "WHATSAPP_WINDOW_CLOSED") setWindowClosed(true);
          else toast.show(userMessage(e), { kind: "error" });
        },
      }
    );
  };

  const title = (
    <PressableScale onPress={peek} disabled={!item?.lead_id} accessibilityLabel={item?.lead_id ? t("peek.open", { name }) : name} scaleTo={0.97} style={styles.headerTitle}>
      <Text variant="headline" numberOfLines={1}>
        {name}
      </Text>
      {item ? (
        <View style={styles.headerSub}>
          <ChannelGlyph channel={item.channel} size={12} />
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {channelLabel[item.channel]}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => title,
          headerTitleAlign: "center",
          headerRight: () =>
            item && canManage ? (
              <IconButton
                icon={Archive}
                label={t("inbox.archive")}
                circle
                size={20}
                onPress={() => {
                  act.mutate({ id: item.id, action: "archive" });
                  toast.show(t("inbox.archivedToast"), { action: { label: t("today.undo"), onPress: () => act.mutate({ id: item.id, action: "unarchive" }) } });
                  router.back();
                }}
              />
            ) : null,
        }}
      />
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {!conv.data ? (
          conv.isPending ? (
            <DelayedFallback>
              <SkeletonList rows={6} />
            </DelayedFallback>
          ) : (
            <ErrorState message={userMessage(conv.error)} onRetry={() => void conv.refetch()} />
          )
        ) : (
          <KeyboardChatScrollView
            ref={scroll}
            style={styles.fill}
            contentContainerStyle={[styles.thread, { paddingBottom: composerHeight + space.md }]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={32}
            onScroll={(e) => {
              const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
              atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
            }}
            onContentSizeChange={() => {
              if (!atBottom.current && !toEndNext.current) return;
              toEndNext.current = false;
              scroll.current?.scrollToEnd({ animated: rows.length > 0 });
            }}
          >
            <ContactHeader name={name} email={item?.contact_email ?? null} phone={item?.contact_phone ?? null} subject={item?.channel === "email" && !conv.data?.messages.some((m) => m.subject && m.body_text) ? item.subject : null} onDetails={item?.lead_id ? peek : undefined} />
            {rows.map((r) =>
              r.type === "day" ? (
                <DayDivider key={r.key} date={r.date} locale={locale} />
              ) : (
                <Bubble
                  key={r.key}
                  message={r.message as PendingMessage}
                  firstInGroup={r.firstInGroup}
                  lastInGroup={r.lastInGroup}
                  locale={locale}
                  onRetry={(m) => sendText((m.body_text ?? "").trim(), m.id)}
                  onViewOriginal={(m) => router.push({ pathname: "/email-original", params: { itemId, messageId: m.id } })}
                />
              )
            )}
          </KeyboardChatScrollView>
        )}

        <KeyboardStickyView style={styles.sticky} offset={{ closed: 0, opened: insets.bottom }}>
          {item && !item.can_reply ? (
            // A campaign's email has no mailbox thread to answer in: say so, and offer their own email app.
            item.timeline_only && item.contact_email ? (
              <Notice text={t("inbox.campaignNoReply")} action={{ label: t("inbox.emailThem"), icon: Mail, onPress: () => void Linking.openURL(`mailto:${item.contact_email}`) }} />
            ) : (
              <Notice text={t("inbox.replyNotSupported")} />
            )
          ) : item && !canReply ? (
            <Notice text={t("inbox.cannotReply")} />
          ) : (
            <Composer
              onSend={(text, files) => sendText(text, undefined, files)}
              canAttach={item?.channel === "email"}
              onRewrite={baseId ? rewrite : undefined}
              disabled={!item || windowClosed}
              onHeight={setComposerHeight}
              accessory={
                <>
                  {windowClosed && item ? <TemplatePicker itemId={item.id} onSent={() => setWindowClosed(false)} /> : null}
                  {waOptions.length > 1 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.numbers}>
                      <Text variant="caption" tone="muted">
                        {t("inbox.sendFrom")}
                      </Text>
                      {waOptions.map((o) => (
                        <Chip key={`${o.integration_id}-${o.account_id}`} label={o.label} selected={o === waSelected} onPress={() => setWaAccount(o)} />
                      ))}
                    </ScrollView>
                  ) : null}
                </>
              }
            />
          )}
        </KeyboardStickyView>
      </View>
    </>
  );
}

/**
 * Who this is, in one compact card at the top of the thread: the name is already in the header, so this shows
 * the avatar, how to reach them and one-tap call / email / details — the messages get the screen.
 */
function ContactHeader({ name, email, phone, subject, onDetails }: { name: string; email: string | null; phone: string | null; subject: string | null; onDetails?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.contactWrap}>
      <View style={[styles.contact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar name={name} size={44} />
        <View style={styles.contactText}>
          <Text variant="callout" weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          {email || phone ? (
            <Text variant="footnote" tone="muted" numberOfLines={1}>
              {[email, phone].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
        {phone ? <IconButton icon={Phone} label={t("inbox.call")} onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)} /> : null}
        {email ? <IconButton icon={Mail} label={t("inbox.email")} onPress={() => void Linking.openURL(`mailto:${email}`)} /> : null}
        {onDetails ? <IconButton icon={UserRound} label={t("peek.details")} onPress={onDetails} /> : null}
      </View>
      {subject ? (
        <Text variant="footnote" weight="semibold" tone="secondary" align="center" numberOfLines={2}>
          {subject}
        </Text>
      ) : null}
    </View>
  );
}

function DayDivider({ date, locale }: { date: string; locale: string }) {
  const { colors } = useTheme();
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const label = same(d, today) ? t("inbox.today") : same(d, yesterday) ? t("inbox.yesterday") : new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(d);
  return (
    <View style={styles.day}>
      <Text variant="caption" tone="muted" style={[styles.dayChip, { backgroundColor: colors.surfaceSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function Notice({ text, action }: { text: string; action?: { label: string; icon: IconComponent; onPress: () => void } }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.notice, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, space.md) }]}>
      <Text variant="footnote" tone="muted" align="center">
        {text}
      </Text>
      {action ? <Button label={action.label} icon={action.icon} size="sm" variant="secondary" style={styles.noticeAction} onPress={action.onPress} /> : null}
    </View>
  );
}

/** WhatsApp's 24-hour window is closed: only an approved template can be sent. */
function TemplatePicker({ itemId, onSent }: { itemId: string; onSent: () => void }) {
  const baseId = useActiveBaseId();
  const toast = useToast();
  const { colors } = useTheme();
  const templates = useQuery({ queryKey: ["inbox", baseId ?? 0, "templates", itemId], queryFn: () => inboxApi.whatsappTemplates(baseId!, itemId), enabled: baseId != null, staleTime: 5 * 60_000 });
  const sendTemplate = useMutation({
    mutationFn: (tpl: { name: string; language?: string }) => inboxApi.sendWhatsappTemplate(baseId!, itemId, tpl.name, tpl.language),
    onSuccess: () => {
      haptics.success();
      toast.show(t("inbox.templateSent"), { kind: "success" });
      onSent();
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });
  const list = templates.data?.templates ?? [];
  return (
    <View style={styles.templates}>
      <Banner kind="warning" message={t("inbox.windowClosed")} />
      {templates.isPending ? null : list.length === 0 ? (
        <Text variant="footnote" tone="muted">
          {t("inbox.noTemplates")}
        </Text>
      ) : (
        <View style={[styles.templateList, { borderColor: colors.border }]}>
          {list.slice(0, 4).map((tpl) => (
            <ListRow
              key={`${tpl.name}-${tpl.language ?? ""}`}
              title={tpl.name}
              subtitle={tpl.body ?? tpl.language ?? null}
              leading={<FileText size={18} color={colors.primary} strokeWidth={ICON_STROKE} />}
              trailing={<Button label={t("inbox.send")} size="sm" loading={sendTemplate.isPending && sendTemplate.variables?.name === tpl.name} onPress={() => sendTemplate.mutate(tpl)} />}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { paddingHorizontal: gutter, paddingTop: space.lg },
  headerTitle: { alignItems: "center", maxWidth: 240 },
  headerSub: { flexDirection: "row", alignItems: "center", gap: 4 },
  sticky: { position: "absolute", left: 0, right: 0, bottom: 0 },
  contactWrap: { gap: space.sm, paddingBottom: space.sm },
  contact: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.sm, paddingLeft: space.md, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  contactText: { flex: 1, minWidth: 0, marginLeft: space.xs },
  day: { alignItems: "center", marginTop: space.lg },
  dayChip: { paddingHorizontal: space.md, paddingVertical: 3, borderRadius: radius.pill, overflow: "hidden" },
  notice: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, paddingHorizontal: gutter },
  noticeAction: { alignSelf: "center", marginTop: space.sm },
  numbers: { flexDirection: "row", alignItems: "center", gap: space.sm },
  templates: { gap: space.sm },
  templateList: { borderWidth: 1, borderRadius: radius.lg, overflow: "hidden" },
});
