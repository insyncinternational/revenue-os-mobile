import { useRef, useState } from "react";
import { useFocusAfterOpen } from "@/ui/useFocusAfterOpen";
import { StyleSheet, View, type TextInputInstance } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ApiError, userMessage } from "@/api/errors";
import { fullName } from "@/features/contacts/contact";
import { ContactPicker } from "@/features/contacts/ContactPicker";
import { useContact } from "@/features/contacts/useContacts";
import { TASK_TYPE_ICON } from "@/features/tasks/TaskRow";
import { taskBody, taskContact } from "@/features/tasks/tasks";
import { useCachedTask, useSaveTask, useToggleTask } from "@/features/tasks/useTasks";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { defaultTime, dayKey, addDays, splitIso, toIso } from "@/lib/when";
import { useCan } from "@/session/workspace";
import { space } from "@/theme/tokens";
import type { TaskInput, TaskPriority } from "@/types/contact";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { Field } from "@/ui/Field";
import { FormScreen } from "@/ui/FormScreen";
import { CheckCircle2, Clock, ListChecks, RotateCcw, UserRound } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { useToast } from "@/ui/Toast";
import { WhenPicker, type When } from "@/ui/WhenPicker";
import { FormSection } from "@/ui/FormSection";

const TYPES: TaskInput["task_type"][] = ["call", "email", "followup", "other"];

/** New task (from Tasks, a contact or a deal) or edit one. */
export default function TaskForm() {
  const params = useLocalSearchParams<{
    id?: string;
    leadId?: string;
    dealId?: string;
  }>();
  const id = Number(params.id) || 0;
  const editing = id > 0;
  // Focus once the sheet has opened (autoFocus scrolled the form past the field).
  const nameRef = useRef<TextInputInstance>(null);
  useFocusAfterOpen(nameRef, !editing);
  const toast = useToast();
  const existing = useCachedTask(id);
  const presetLead = useContact(Number(params.leadId) || 0).contact.data;
  const save = useSaveTask(editing ? id : null);
  const toggle = useToggleTask();
  const canEdit = useCan("tasks_edit");
  const [now] = useState(() => new Date());

  const [form, setForm] = useState<Omit<TaskInput, "due_at">>(() => ({
    title: existing?.title ?? "",
    task_type: existing?.task_type && existing.task_type !== "meeting" ? existing.task_type : "call",
    priority: existing?.priority ?? "medium",
    lead_id: existing?.lead_id ?? (Number(params.leadId) || null),
    deal_id: existing?.deal_id ?? (Number(params.dealId) || null),
    description: existing?.description ?? "",
  }));
  const [when, setWhen] = useState<When>(() => {
    if (editing) return splitIso(existing?.due_at);
    // New tasks default to tomorrow morning — the most common "remind me" moment.
    const tomorrow = dayKey(addDays(now, 1));
    return { day: tomorrow, time: defaultTime(tomorrow, now) ?? "09:00" };
  });
  const [leadLabel, setLeadLabel] = useState<string | null>(() => (existing ? taskContact(existing) : null));
  const [titleError, setTitleError] = useState<string | undefined>();
  const shownLead = leadLabel ?? (presetLead && form.lead_id === presetLead.id ? fullName(presetLead) : null);
  // The API can't clear a due date, so "No date" is offered only when there isn't one yet.
  const allowNone = !editing || !existing?.due_at;
  const done = existing?.status === "completed";

  const submit = () => {
    const built = taskBody({ ...form, due_at: when ? toIso(when.day, when.time) : null }, editing ? "edit" : "create");
    if (!built.ok) return setTitleError(t("tasks.titleRequired"));
    save.mutate(built.body, {
      onSuccess: () => {
        toast.show(editing ? t("tasks.saved") : t("tasks.created"), {
          kind: "success",
        });
        router.back();
      },
    });
  };

  if (editing && !existing) {
    return (
      <>
        <Stack.Screen options={{ title: t("tasks.edit") }} />
        <FormScreen topInset={false} sheetTitle={editing ? t("tasks.edit") : t("tasks.new")}>
          <Banner kind="info" message={t("tasks.notLoaded")} />
          <Button label={t("common.close")} variant="secondary" fullWidth onPress={() => router.back()} />
        </FormScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: editing ? t("tasks.edit") : t("tasks.new") }} />
      <FormScreen
        topInset={false}
        sheetTitle={editing ? t("tasks.edit") : t("tasks.new")}
        sticky={<Button label={t("common.save")} size="lg" fullWidth loading={save.isPending} onPress={submit} />}
      >
        {save.error ? (
          <Banner message={save.error instanceof ApiError && save.error.fieldErrors[0] ? save.error.fieldErrors[0].message : userMessage(save.error)} />
        ) : null}
        <FormSection title={t("tasks.sectionTask")} icon={ListChecks}>
          <Input
            label={t("tasks.titleLabel")}
            placeholder={t("tasks.titlePlaceholder")}
            value={form.title}
            onChangeText={(v) => {
              setForm((f) => ({ ...f, title: v }));
              if (titleError) setTitleError(undefined);
            }}
            error={titleError}
            ref={nameRef}
            autoCapitalize="sentences"
          />

          <Field label={t("tasks.type")}>
            <View style={styles.wrap}>
              {TYPES.map((k) => (
                <Chip
                  key={k}
                  label={t(`tasks.type_${k}`)}
                  icon={TASK_TYPE_ICON[k]}
                  selected={form.task_type === k}
                  onPress={() => {
                    haptics.selection();
                    setForm((f) => ({ ...f, task_type: k }));
                  }}
                />
              ))}
            </View>
          </Field>
        </FormSection>

        <FormSection title={t("tasks.sectionWhen")} icon={Clock}>
          <Field label={t("tasks.due")}>
            <WhenPicker value={when} onChange={setWhen} allowNone={allowNone} />
          </Field>

          <Field label={t("tasks.priority")}>
            <SegmentedControl<TaskPriority>
              value={form.priority}
              onChange={(p) => setForm((f) => ({ ...f, priority: p }))}
              options={[
                { key: "low", label: t("tasks.low") },
                { key: "medium", label: t("tasks.medium") },
                { key: "high", label: t("tasks.high") },
              ]}
            />
          </Field>
        </FormSection>

        <FormSection title={t("tasks.sectionMore")} icon={UserRound}>
          <Field label={t("pipeline.contact")}>
            <ContactPicker
              picked={form.lead_id ? (shownLead ?? t("tasks.linkedContact")) : null}
              onPick={(c) => {
                setForm((f) => ({ ...f, lead_id: c.id }));
                setLeadLabel(fullName(c));
              }}
              onClear={() => {
                setForm((f) => ({ ...f, lead_id: null }));
                setLeadLabel(null);
              }}
            />
          </Field>

          <Input
            label={t("tasks.notes")}
            placeholder={t("tasks.notesPlaceholder")}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            multiline
            style={styles.notes}
          />
        </FormSection>
        {editing && existing && canEdit ? (
          <Button
            label={done ? t("tasks.markNotDone") : t("tasks.markDone")}
            icon={done ? RotateCcw : CheckCircle2}
            variant="ghost"
            fullWidth
            onPress={() => {
              toggle.mutate({ task: existing, done: !done });
              router.back();
            }}
          />
        ) : null}
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  notes: { minHeight: 88, textAlignVertical: "top" },
});
