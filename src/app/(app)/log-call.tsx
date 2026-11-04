import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { userMessage } from "@/api/errors";
import { useLogCall } from "@/features/contacts/useContacts";
import { t, type TranslationKey } from "@/i18n";
import { gutter, space } from "@/theme/tokens";
import type { CallOutcome } from "@/types/contact";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { ChoiceTiles, type ChoiceTone } from "@/ui/ChoiceTiles";
import { FormScreen } from "@/ui/FormScreen";
import { CalendarCheck, PhoneMissed, RefreshCw, ThumbsDown, ThumbsUp, UserX, Voicemail, type IconComponent } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** Most useful first: the two good outcomes, then the common "didn't happen" ones. */
const OUTCOMES: CallOutcome[] = ["interested", "meeting_booked", "follow_up", "voicemail", "no_answer", "not_interested", "wrong_person"];

/** Each outcome's icon and colour: green went well, blue a next step, amber no answer, red no. */
const OUTCOME_LOOK: Record<CallOutcome, { icon: IconComponent; tone: ChoiceTone }> = {
  interested: { icon: ThumbsUp, tone: "success" },
  meeting_booked: { icon: CalendarCheck, tone: "success" },
  follow_up: { icon: RefreshCw, tone: "info" },
  voicemail: { icon: Voicemail, tone: "warning" },
  no_answer: { icon: PhoneMissed, tone: "warning" },
  not_interested: { icon: ThumbsDown, tone: "danger" },
  wrong_person: { icon: UserX, tone: "neutral" },
};

/** Opens when you come back from a call started in the app: one tap for the outcome, an optional note. */
export default function LogCall() {
  const { leadId: raw, name = "" } = useLocalSearchParams<{ leadId: string; name?: string }>();
  const leadId = Number(raw) || 0;
  const toast = useToast();
  const log = useLogCall(leadId);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!outcome) return;
    log.mutate(
      { outcome, label: t(`call.${outcome}` as TranslationKey), notes: notes.trim() },
      {
        onSuccess: () => {
          toast.show(t("call.logged"), { kind: "success" });
          router.back();
        },
      }
    );
  };

  return (
    <FormScreen topInset={false}>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header">
          {t("call.logTitle")}
        </Text>
        {name ? (
          <Text variant="subhead" tone="muted">
            {t("call.logWith", { name })}
          </Text>
        ) : null}
      </View>
      {log.error ? <Banner message={userMessage(log.error)} /> : null}
      <ChoiceTiles<CallOutcome> value={outcome} onChange={setOutcome} choices={OUTCOMES.map((o) => ({ key: o, label: t(`call.${o}` as TranslationKey), ...OUTCOME_LOOK[o] }))} />
      <Input label={t("call.notes")} placeholder={t("call.notesPlaceholder")} value={notes} onChangeText={setNotes} multiline style={styles.notes} />
      <Button label={t("call.save")} size="lg" fullWidth disabled={!outcome} loading={log.isPending} onPress={save} />
      <Button label={t("call.skip")} variant="ghost" fullWidth onPress={() => router.back()} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: space.xs },
  notes: { minHeight: 88, textAlignVertical: "top" },
  pad: { paddingHorizontal: gutter },
});
