import { useRef, useState } from "react";
import { useFocusAfterOpen } from "@/ui/useFocusAfterOpen";
import { StyleSheet, View, type TextInputInstance } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ApiError, userMessage } from "@/api/errors";
import { useContact, useSaveContact } from "@/features/contacts/useContacts";
import { t } from "@/i18n";
import { openContact } from "@/lib/navigate";
import { looksLikeEmail } from "@/session/authFlow";
import { space } from "@/theme/tokens";
import type { Contact, ContactInput } from "@/types/contact";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { Avatar } from "@/ui/Avatar";
import { FormSection } from "@/ui/FormSection";
import { Briefcase, Building, ICON_STROKE, Mail, Phone, UserRound } from "@/ui/icons";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/ui/Text";
import { Input } from "@/ui/Input";
import { useToast } from "@/ui/Toast";

const EMPTY: ContactInput = { first_name: "", last_name: "", email: "", phone: "", company: "", role: "" };

function fromContact(c: Contact | undefined): ContactInput {
  if (!c) return EMPTY;
  return { first_name: c.first_name ?? "", last_name: c.last_name ?? "", email: c.email ?? "", phone: c.phone ?? "", company: c.company ?? "", role: c.role ?? "" };
}

/** New contact, or edit one. Only safe fields — never enrichment or scoring (those cost credits). */
export default function ContactForm() {
  const { id: raw } = useLocalSearchParams<{ id?: string }>();
  const id = Number(raw) || null;
  const existing = useContact(id ?? 0).contact.data;
  const toast = useToast();
  const { colors } = useTheme();
  const save = useSaveContact(id);
  const [form, setForm] = useState<ContactInput>(() => fromContact(existing));
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({});
  const firstRef = useRef<TextInputInstance>(null);
  // Focus once the sheet has opened (autoFocus scrolled the form past the field).
  useFocusAfterOpen(firstRef, !id);
  const lastRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const phoneRef = useRef<TextInputInstance>(null);
  const companyRef = useRef<TextInputInstance>(null);
  const roleRef = useRef<TextInputInstance>(null);

  const set = (k: keyof ContactInput) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    const next: typeof errors = {};
    if (![form.first_name, form.last_name, form.email, form.phone].some((v) => v.trim())) next.first_name = t("contacts.nameRequired");
    if (form.email.trim() && !looksLikeEmail(form.email)) next.email = t("auth.invalidEmail");
    setErrors(next);
    if (Object.keys(next).length || save.isPending) return;
    save.mutate(form, {
      onSuccess: (saved) => {
        toast.show(id ? t("contacts.saved") : t("contacts.created"), { kind: "success" });
        router.back();
        if (!id) setTimeout(() => openContact(saved.id), 250);
      },
      onError: (e) => {
        // Field errors from the server (422) go next to their fields.
        if (e instanceof ApiError) {
          const fe: typeof errors = {};
          for (const f of e.fieldErrors) if (f.path in EMPTY) fe[f.path as keyof ContactInput] = f.message;
          if (Object.keys(fe).length) setErrors(fe);
        }
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: id ? t("contacts.edit") : t("contacts.new") }} />
      <FormScreen topInset={false} sheetTitle={id ? t("contacts.edit") : t("contacts.new")} sticky={<Button label={t("common.save")} size="lg" fullWidth loading={save.isPending} onPress={submit} />}>
        {save.error && !(save.error instanceof ApiError && save.error.fieldErrors.length) ? <Banner message={userMessage(save.error)} /> : null}
        {/* A live preview: the avatar and name fill in as you type. */}
        <View style={styles.preview}>
          {/* Initials once a name is typed; a plain person icon before that (a "?" read like an error). */}
          {[form.first_name, form.last_name].filter(Boolean).join(" ").trim() ? (
            <Avatar name={[form.first_name, form.last_name].filter(Boolean).join(" ").trim()} size={72} />
          ) : (
            <View style={[styles.blank, { backgroundColor: colors.surfaceTertiary }]}>
              <UserRound size={30} color={colors.textMuted} strokeWidth={ICON_STROKE} />
            </View>
          )}
          <Text variant="headline" numberOfLines={1} tone={[form.first_name, form.last_name].filter(Boolean).join(" ").trim() ? "default" : "muted"}>
            {[form.first_name, form.last_name].filter(Boolean).join(" ").trim() || (id ? t("contacts.edit") : t("contacts.new"))}
          </Text>
          {form.company ? (
            <Text variant="subhead" tone="muted" numberOfLines={1}>
              {form.company}
            </Text>
          ) : null}
        </View>
        <FormSection title={t("contacts.sectionName")} icon={UserRound}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input ref={firstRef} label={t("contacts.firstName")} value={form.first_name} onChangeText={set("first_name")} error={errors.first_name} autoCapitalize="words" textContentType="givenName" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => lastRef.current?.focus()} />
            </View>
            <View style={styles.half}>
              <Input ref={lastRef} label={t("contacts.lastName")} value={form.last_name} onChangeText={set("last_name")} autoCapitalize="words" textContentType="familyName" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()} />
            </View>
          </View>
        </FormSection>
        <FormSection title={t("contacts.sectionReach")} icon={Mail}>
          <Input ref={emailRef} label={t("contacts.email")} icon={Mail} value={form.email} onChangeText={set("email")} error={errors.email} placeholder="name@company.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()} />
          <Input ref={phoneRef} label={t("contacts.phone")} icon={Phone} value={form.phone} onChangeText={set("phone")} error={errors.phone} placeholder="+971 50 123 4567" keyboardType="phone-pad" textContentType="telephoneNumber" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => companyRef.current?.focus()} />
        </FormSection>
        <FormSection title={t("contacts.sectionWork")} icon={Building}>
          <Input ref={companyRef} label={t("contacts.company")} icon={Building} value={form.company} onChangeText={set("company")} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => roleRef.current?.focus()} />
          <Input ref={roleRef} label={t("contacts.role")} icon={Briefcase} value={form.role} onChangeText={set("role")} returnKeyType="done" onSubmitEditing={submit} />
        </FormSection>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  half: { flex: 1 },
  preview: { alignItems: "center", gap: space.xs, paddingBottom: space.xs },
  blank: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
});
