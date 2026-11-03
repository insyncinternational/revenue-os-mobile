import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { meetingWith } from "@/features/calendar/schedule";
import { useMeeting, useMeetingAction } from "@/features/calendar/useMeetings";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { addDays, dayKey, toIso } from "@/lib/when";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { FormScreen } from "@/ui/FormScreen";
import { Check, ICON_STROKE, RefreshCw } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Text } from "@/ui/Text";

type Outcome = "attended" | "no_show";
const FOLLOW_UP_IN = [
  { key: "tomorrow", days: 1 },
  { key: "in2days", days: 2 },
  { key: "nextWeek", days: 7 },
] as const;

/**
 * "How did it go?": Attended (notes, and an agreed next step that becomes a task) or No-show (and a task to
 * rebook). Opens on the answer the user already tapped, so a no-show is two taps.
 */
export default function MeetingOutcome() {
  const { id: raw, outcome: initial } = useLocalSearchParams<{ id: string; outcome?: string }>();
  const id = Number(raw) || 0;
  const { colors } = useTheme();
  const m = useMeeting(id).data?.meeting;
  const action = useMeetingAction(id);
  const [outcome, setOutcome] = useState<Outcome>(initial === "no_show" ? "no_show" : "attended");
  const [notes, setNotes] = useState(() => m?.notes ?? "");
  const [nextStep, setNextStep] = useState(() => m?.next_step ?? "");
  const [followIn, setFollowIn] = useState<number>(2);
  const [rebook, setRebook] = useState(true);
  const [now] = useState(() => new Date());
  const hasContact = Boolean(m?.lead_id);

  const save = () => {
    const input =
      outcome === "attended"
        ? {
            outcome,
            notes: notes.trim() || undefined,
            next_step: nextStep.trim() || undefined,
            next_step_due: nextStep.trim() && hasContact ? toIso(dayKey(addDays(now, followIn)), "09:00") : undefined,
          }
        : { outcome, follow_up: hasContact && rebook, notes: notes.trim() || undefined };
    action.mutate({ kind: "outcome", input }, { onSuccess: () => router.back() });
  };

  return (
    <FormScreen topInset={false}>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("meeting.howDidItGo")}
        </Text>
        {m ? (
          <Text variant="subhead" tone="muted" numberOfLines={2}>
            {[m.title, meetingWith(m)].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>
      {action.error ? <Banner message={userMessage(action.error)} /> : null}

      <SegmentedControl<Outcome>
        value={outcome}
        onChange={(v) => {
          haptics.selection();
          setOutcome(v);
        }}
        options={[
          { key: "attended", label: t("meeting.attended") },
          { key: "no_show", label: t("meeting.noShow") },
        ]}
      />

      {outcome === "attended" ? (
        <>
          <Input label={t("meeting.notesLabel")} placeholder={t("meeting.notesPlaceholder")} value={notes} onChangeText={setNotes} multiline style={styles.notes} />
          <Input label={t("meeting.nextStep")} placeholder={t("meeting.nextStepPlaceholder")} value={nextStep} onChangeText={setNextStep} autoCapitalize="sentences" />
          {nextStep.trim() && hasContact ? (
            <Field label={t("meeting.followUpWhen")}>
              <View style={styles.chips}>
                {FOLLOW_UP_IN.map((c) => (
                  <Chip key={c.key} label={t(`when.${c.key}`)} selected={followIn === c.days} onPress={() => setFollowIn(c.days)} />
                ))}
              </View>
              <Text variant="footnote" tone="muted">
                {t("meeting.nextStepTask")}
              </Text>
            </Field>
          ) : null}
        </>
      ) : (
        <>
          {hasContact ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                setRebook((v) => !v);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rebook }}
              style={({ pressed }) => [styles.toggle, { borderColor: rebook ? colors.primaryBorder : colors.border, backgroundColor: rebook ? colors.primarySubtle : pressed ? colors.pressed : colors.surface }]}
            >
              <RefreshCw size={20} color={rebook ? colors.primary : colors.textMuted} strokeWidth={ICON_STROKE} />
              <View style={styles.flex}>
                <Text variant="callout" weight="semibold">
                  {t("meeting.rebookTask")}
                </Text>
                <Text variant="footnote" tone="muted">
                  {t("meeting.rebookTaskHint")}
                </Text>
              </View>
              <View style={[styles.box, { borderColor: rebook ? colors.primaryFill : colors.borderStrong, backgroundColor: rebook ? colors.primaryFill : "transparent" }]}>
                {rebook ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          ) : null}
          <Input label={t("meeting.notesLabel")} placeholder={t("meeting.noShowNotesPlaceholder")} value={notes} onChangeText={setNotes} multiline style={styles.notes} />
        </>
      )}

      <Button label={t("common.save")} size="lg" fullWidth loading={action.isPending} onPress={save} />
      <Button label={t("common.cancel")} variant="ghost" fullWidth onPress={() => router.back()} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.xs },
  notes: { minHeight: 88, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  toggle: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1 },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
