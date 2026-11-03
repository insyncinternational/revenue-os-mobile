import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ApiError, userMessage } from "@/api/errors";
import { meetingWith } from "@/features/calendar/schedule";
import { useCreateMeeting, useMeeting, useMeetingAction } from "@/features/calendar/useMeetings";
import { fullName } from "@/features/contacts/contact";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { useContact } from "@/features/contacts/useContacts";
import { getIntlLocale, t } from "@/i18n";
import { openMeeting } from "@/lib/navigate";
import { defaultTime, dayKey, splitIso, toIso } from "@/lib/when";
import { space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { FormScreen } from "@/ui/FormScreen";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";
import { WhenPicker, type When } from "@/ui/WhenPicker";
import { FormSection } from "@/ui/FormSection";
import { Users, CalendarClock, Video } from "@/ui/icons";

/** https:// only — the backend refuses anything else, and a bare "meet.google.com/…" gets the scheme added. */
function joinLink(raw: string): { ok: true; url: string | null } | { ok: false } {
  const v = raw.trim();
  if (!v) return { ok: true, url: null };
  const url = /^https?:\/\//i.test(v) ? v.replace(/^http:/i, "https:") : `https://${v}`;
  return /^https:\/\/[^\s/]+\.[^\s]+/i.test(url) ? { ok: true, url } : { ok: false };
}

/** New meeting (with a contact or a team meeting), or move an existing one (`id`). */
export default function MeetingForm() {
  const params = useLocalSearchParams<{ id?: string; leadId?: string }>();
  const id = Number(params.id) || 0;
  const rescheduling = id > 0;
  const toast = useToast();
  const locale = getIntlLocale();
  const existing = useMeeting(id).data?.meeting;
  const presetLead = useContact(Number(params.leadId) || 0).contact.data;
  const create = useCreateMeeting();
  const move = useMeetingAction(id);
  const [now] = useState(() => new Date());

  const [when, setWhen] = useState<When>(() => {
    // Moving a meeting starts from its current time — unless that has passed (the new one must be ahead).
    const cur = splitIso(existing?.due_at);
    if (cur && rescheduling && Date.parse(existing!.due_at!) > now.getTime()) return cur;
    const today = dayKey(now);
    const time = defaultTime(today, now);
    return time ? { day: today, time } : null;
  });
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState<number | null>(() => Number(params.leadId) || null);
  const [leadLabel, setLeadLabel] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [errors, setErrors] = useState<{ when?: string; link?: string }>({});
  const shownLead = leadLabel ?? (presetLead && leadId === presetLead.id ? fullName(presetLead) : null);
  const busy = create.isPending || move.isPending;
  const error = create.error ?? null;

  const submit = () => {
    if (!when) return setErrors({ when: t("meeting.pickTime") });
    const due = toIso(when.day, when.time);
    if (rescheduling) {
      move.mutate({ kind: "reschedule", dueAt: due }, { onSuccess: () => router.back() });
      return;
    }
    const j = joinLink(link);
    if (!j.ok) return setErrors({ link: t("meeting.linkInvalid") });
    setErrors({});
    create.mutate(
      {
        due_at: due,
        title: title.trim() || undefined,
        lead_id: leadId,
        join_url: j.url,
      },
      {
        onSuccess: ({ meeting }) => {
          toast.show(t("meeting.created"), { kind: "success" });
          router.back();
          setTimeout(() => openMeeting(meeting.id), 250);
        },
      },
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: rescheduling ? t("meeting.reschedule") : t("meeting.new"),
        }}
      />
      <FormScreen
        topInset={false}
        sheetTitle={rescheduling ? t("meeting.reschedule") : t("meeting.new")}
        sticky={<Button label={rescheduling ? t("meeting.moveIt") : t("meeting.book")} size="lg" fullWidth loading={busy} onPress={submit} />}
      >
        {error ? <Banner message={error instanceof ApiError && error.fieldErrors[0] ? error.fieldErrors[0].message : userMessage(error)} /> : null}
        {rescheduling && existing ? (
          <View style={styles.heading}>
            <Text variant="headline" numberOfLines={2}>
              {existing.title}
            </Text>
            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {[
                meetingWith(existing),
                existing.due_at
                  ? new Intl.DateTimeFormat(locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(existing.due_at))
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ) : null}

        {!rescheduling ? (
          <FormSection title={t("meeting.sectionWho")} icon={Users}>
            <Field label={t("pipeline.contact")}>
              <ContactPicker
                picked={leadId ? shownLead : null}
                onPick={(c) => {
                  setLeadId(c.id);
                  setLeadLabel(fullName(c));
                }}
                onClear={() => {
                  setLeadId(null);
                  setLeadLabel(null);
                }}
              />
              {!leadId ? (
                <Text variant="footnote" tone="muted">
                  {t("meeting.teamHint")}
                </Text>
              ) : null}
            </Field>
            <Input
              label={t("meeting.titleLabel")}
              placeholder={shownLead ? t("meeting.titleWith", { name: shownLead }) : t("meeting.teamTitle")}
              value={title}
              onChangeText={setTitle}
              autoCapitalize="sentences"
            />
          </FormSection>
        ) : null}

        <FormSection title={rescheduling ? t("meeting.newTime") : t("meeting.when")} icon={CalendarClock}>
          <WhenPicker
            value={when}
            onChange={(v) => {
              setWhen(v);
              if (errors.when) setErrors((e) => ({ ...e, when: undefined }));
            }}
          />
          {errors.when ? (
            <Text variant="footnote" tone="danger">
              {errors.when}
            </Text>
          ) : null}
        </FormSection>

        {!rescheduling ? (
          <FormSection title={t("meeting.linkLabel")} icon={Video}>
            <Input
              placeholder="https://meet.google.com/…"
              value={link}
              onChangeText={(v) => {
                setLink(v);
                if (errors.link) setErrors((e) => ({ ...e, link: undefined }));
              }}
              error={errors.link}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </FormSection>
        ) : existing?.source === "slotwise" ? (
          <Banner kind="info" message={t("meeting.slotwiseNote")} />
        ) : existing?.calendar ? (
          <Text variant="footnote" tone="muted">
            {t("meeting.inviteMoves")}
          </Text>
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.xs },
});
