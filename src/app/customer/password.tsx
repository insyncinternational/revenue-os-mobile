import { useState } from "react";
import { router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { portalAuthApi } from "@/api/portal";
import { userMessage } from "@/api/errors";
import { portalToken, useActivePortal, usePortalSession } from "@/portal/portalSession";
import { usePortalAction } from "@/portal/usePortal";
import { t } from "@/i18n";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { KeyRound } from "@/ui/icons";
import { Input } from "@/ui/Input";

const MIN = 8;

/** Set a portal password (sign in without waiting for a code), or change it. Other sessions end; this phone keeps going. */
export default function CustomerPassword() {
  const portal = useActivePortal();
  const adopt = usePortalSession((s) => s.adopt);
  const account = useQuery({ queryKey: ["portal", portal?.slug ?? "", "account"], queryFn: ({ signal }) => portalAuthApi.account(portalToken(), signal), enabled: Boolean(portal) });
  const has = account.data?.has_password === true;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);

  const save = usePortalAction((token, v: { password: string; current?: string }) => portalAuthApi.setPassword(token, v.password, v.current), {
    success: t("password.changed"),
    onDone: (r) => {
      void adopt(r);
      router.back();
    },
  });

  const submit = () => {
    setTried(true);
    if ((has && !current) || next.length < MIN || next !== again) return;
    save.mutate({ password: next, current: has ? current : undefined });
  };
  const title = has ? t("portal.me.changePassword") : t("portal.me.setPassword");

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FormScreen topInset={false} sheetTitle={title} sticky={<Button label={t("password.save")} size="lg" fullWidth loading={save.isPending} onPress={submit} />}>
        {save.error ? <Banner message={userMessage(save.error)} /> : null}
        <FormSection title={t("password.section")} icon={KeyRound}>
          {has ? <Input label={t("password.current")} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" textContentType="password" error={tried && !current ? t("password.currentRequired") : null} /> : null}
          <Input label={t("password.new")} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" textContentType="newPassword" hint={t("password.rule")} error={tried && next.length < MIN ? t("password.rule") : null} />
          <Input label={t("password.again")} value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" textContentType="newPassword" error={again && again !== next ? t("password.mismatch") : null} />
        </FormSection>
      </FormScreen>
    </>
  );
}
