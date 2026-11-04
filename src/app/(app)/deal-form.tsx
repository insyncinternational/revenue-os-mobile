import { useMemo, useRef, useState } from "react";
import { useFocusAfterOpen } from "@/ui/useFocusAfterOpen";
import { StyleSheet, View, type TextInputInstance } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ApiError, userMessage } from "@/api/errors";
import { fullName } from "@/features/contacts/contact";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { useContact } from "@/features/contacts/useContacts";
import { closeDateChoices, dealBody, orderedStages } from "@/features/pipeline/pipeline";
import { DealPreview } from "@/features/pipeline/DealPreview";
import { StagePicker } from "@/features/pipeline/StagePicker";
import { useDeal, usePipelineBoard, useSaveDeal } from "@/features/pipeline/usePipeline";
import { t } from "@/i18n";
import { openDeal } from "@/lib/navigate";
import { space } from "@/theme/tokens";
import type { DealInput } from "@/types/pipeline";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { AmountField } from "@/ui/AmountField";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection, ToggleRow } from "@/ui/FormSection";
import { CalendarClock, KanbanSquare, Target, UserRound } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/** New deal (from the pipeline, or a contact) or edit one. */
export default function DealForm() {
  const params = useLocalSearchParams<{ id?: string; stageId?: string; leadId?: string }>();
  const id = Number(params.id) || null;
  // Focus once the sheet has opened (autoFocus scrolled the form past the field).
  const nameRef = useRef<TextInputInstance>(null);
  useFocusAfterOpen(nameRef, !id);
  const toast = useToast();
  const existing = useDeal(id ?? 0).deal.data?.deal;
  const presetLead = useContact(Number(params.leadId) || 0).contact.data;
  const { board, bootstrap } = usePipelineBoard();
  const save = useSaveDeal(id);
  const currency = existing?.currency ?? bootstrap.data?.settings.default_currency ?? "USD";
  const stages = orderedStages(board.data?.stages ?? bootstrap.data?.stages ?? []).filter((s) => !s.is_won && !s.is_lost);

  const [form, setForm] = useState<DealInput>(() => ({
    name: existing?.name ?? "",
    amount: existing?.amount != null ? String(existing.amount) : "",
    currency,
    stage_id: existing?.stage_id ?? (Number(params.stageId) || null),
    lead_id: existing?.lead_id ?? (Number(params.leadId) || null),
    expected_close_date: existing?.expected_close_date ?? null,
  }));
  const [leadLabel, setLeadLabel] = useState<string | null>(() => {
    const l = existing?.lead;
    return l ? [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email : null;
  });
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const [now] = useState(() => new Date());
  const choices = useMemo(() => closeDateChoices(now), [now]);
  // Only open stages are offered (+ on the Won/Lost tab must not create an already-closed deal);
  // an existing closed deal keeps its stage.
  const selectedStage = form.stage_id != null && (id || stages.some((s) => s.id === form.stage_id)) ? form.stage_id : (stages[0]?.id ?? null);
  const shownLead = leadLabel ?? (presetLead ? fullName(presetLead) : null);

  const submit = () => {
    const built = dealBody({ ...form, currency, stage_id: selectedStage }, id ? "update" : "create");
    if (!built.ok) {
      setErrors(built.field === "name" ? { name: t("pipeline.nameRequired") } : { amount: t("pipeline.amountInvalid") });
      return;
    }
    setErrors({});
    save.mutate(built.body, {
      onSuccess: ({ deal }) => {
        toast.show(id ? t("pipeline.saved") : t("pipeline.created"), { kind: "success" });
        router.back();
        if (!id) setTimeout(() => openDeal(deal.id), 250);
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: id ? t("pipeline.edit") : t("pipeline.new") }} />
      <FormScreen topInset={false} sheetTitle={id ? t("pipeline.edit") : t("pipeline.new")} sticky={<Button label={t("common.save")} size="lg" fullWidth loading={save.isPending} onPress={submit} />}>
        {save.error ? <Banner message={save.error instanceof ApiError && save.error.fieldErrors[0] ? save.error.fieldErrors[0].message : userMessage(save.error)} /> : null}
        {/* What you're making, filling in as you type: the deal card as the pipeline will show it. */}
        <DealPreview name={form.name} amount={form.amount} currency={currency} stage={stages.find((s) => s.id === selectedStage) ?? null} contact={form.lead_id ? shownLead : null} />
        <FormSection title={t("pipeline.sectionDeal")} icon={KanbanSquare}>
          <Input
            label={t("pipeline.name")}
            placeholder={t("pipeline.namePlaceholder")}
            value={form.name}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, name: v }));
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            error={errors.name}
            ref={nameRef}
            autoCapitalize="sentences"
          />
          <AmountField
            label={t("pipeline.amount")}
            currency={currency}
            value={form.amount}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, amount: v }));
              if (errors.amount) setErrors((e) => ({ ...e, amount: undefined }));
            }}
            error={errors.amount}
          />
        </FormSection>

        <FormSection title={t("pipeline.stage")} icon={Target}>
          <StagePicker stages={stages} value={selectedStage} onChange={(stageId) => setForm((f) => ({ ...f, stage_id: stageId }))} />
        </FormSection>

        <FormSection title={t("pipeline.contact")} icon={UserRound}>
          <ContactPicker
            picked={form.lead_id ? shownLead : null}
            onPick={(c) => {
              setForm((f) => ({ ...f, lead_id: c.id }));
              setLeadLabel(fullName(c));
            }}
            onClear={() => {
              setForm((f) => ({ ...f, lead_id: null }));
              setLeadLabel(null);
            }}
          />
        </FormSection>

        <FormSection title={t("pipeline.closeDate")} icon={CalendarClock}>
          {/* A switch, not a "None" chip: no date is the normal case; turning it on offers quick picks. */}
          <ToggleRow
            label={t("pipeline.setCloseDate")}
            hint={t("pipeline.setCloseDateHint")}
            value={form.expected_close_date != null}
            onValueChange={(on) => setForm((f) => ({ ...f, expected_close_date: on ? (choices[0]?.date ?? null) : null }))}
          />
          {form.expected_close_date ? (
            <View style={styles.wrap}>
              {choices.map((c) => (
                <Chip key={c.key} label={t(`pipeline.${c.key}`)} selected={form.expected_close_date === c.date} onPress={() => setForm((f) => ({ ...f, expected_close_date: c.date }))} />
              ))}
            </View>
          ) : null}
          {form.expected_close_date && !choices.some((c) => c.date === form.expected_close_date) ? (
            <Text variant="footnote" tone="muted">
              {form.expected_close_date}
            </Text>
          ) : null}
        </FormSection>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
