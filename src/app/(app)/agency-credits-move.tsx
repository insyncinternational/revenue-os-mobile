import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { agencyApi } from "@/api/agency";
import { clientName, parseCredits } from "@/features/agency/agency";
import { useAgencyAction, useAgencyClient, useAgencyClients, useAgencyDashboard } from "@/features/agency/useAgency";
import { getIntlLocale, t } from "@/i18n";
import { count } from "@/lib/format";
import { useDebounced } from "@/lib/useDebounced";
import { gutter, space } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Banner } from "@/ui/Banner";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { FormScreen } from "@/ui/FormScreen";
import { FormSection } from "@/ui/FormSection";
import { CircleMinus, Sparkles, Users } from "@/ui/icons";
import { RowIcon } from "@/ui/RowIcon";
import { Input } from "@/ui/Input";
import { ListRow } from "@/ui/ListRow";
import { SearchBar } from "@/ui/SearchBar";
import { Divider } from "@/ui/Section";
import { SkeletonList } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";

const QUICK = [100, 500, 1000, 5000];

/**
 * Give lead credits from the agency pool to a client, or take unused ones back. Opened from a client (that client)
 * or from Home / Credits (pick the client first).
 */
export default function MoveCreditsSheet() {
  const locale = getIntlLocale();
  const params = useLocalSearchParams<{ clientId?: string; take?: string }>();
  const take = params.take === "1";
  const [clientId, setClientId] = useState(Number(params.clientId) || 0);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const pool = useAgencyDashboard().data?.totals.lead_credits;
  const client = useAgencyClient(clientId).data;
  const n = parseCredits(amount);
  const max = take ? client?.credits.lead_credits : pool;
  const tooMuch = n != null && max != null && n > max;
  const title = take ? t("agency.credits.takeBack") : t("agency.credits.give");

  const move = useAgencyAction(
    (agencyId, v: { credits: number; note: string }) =>
      take ? agencyApi.takeBack(agencyId, clientId, { lead_credits: v.credits, note: v.note || undefined }) : agencyApi.allocate(agencyId, { client_id: clientId, lead_credits: v.credits, note: v.note || undefined }),
    {
      success: (_r, v) => (take ? t("agency.done.takenBack", { count: count(v.credits, locale) }) : t("agency.done.given", { count: count(v.credits, locale) })),
      onDone: () => router.back(),
    }
  );

  const submit = () => {
    setTried(true);
    if (!clientId || n == null || tooMuch) return;
    move.mutate({ credits: n, note: note.trim() });
  };

  if (!clientId) return <PickClient title={title} onPick={setClientId} />;

  const name = client ? clientName(client.client) : "";
  return (
    <>
      <Stack.Screen options={{ title }} />
      <FormScreen
        topInset={false}
        sheetTitle={title}
        sticky={<Button label={title} icon={take ? CircleMinus : Sparkles} size="lg" fullWidth loading={move.isPending} disabled={!client} onPress={submit} />}
      >
        <Card padded={false}>
          <ListRow
            title={name || "…"}
            subtitle={client ? t("agency.credits.clientHas", { count: count(client.credits.lead_credits, locale) }) : undefined}
            leading={<Avatar name={name || "?"} size={40} />}
            onPress={params.clientId ? undefined : () => setClientId(0)}
            chevron={!params.clientId}
          />
        </Card>
        <FormSection title={t("agency.credits.amount")} icon={Sparkles}>
          <Input
            label={t("agency.credits.leadCredits")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            autoFocus
            hint={pool != null && !take ? t("agency.credits.poolHas", { count: count(pool, locale) }) : undefined}
            error={tried && n == null ? t("agency.credits.amountRequired") : tooMuch ? (take ? t("agency.credits.moreThanClient") : t("agency.credits.moreThanPool")) : null}
          />
          <View style={styles.chips}>
            {QUICK.map((q) => (
              <Chip key={q} label={count(q, locale)} selected={n === q} onPress={() => setAmount(String(q))} />
            ))}
          </View>
          <Input label={t("agency.credits.note")} value={note} onChangeText={setNote} maxLength={200} hint={t("agency.credits.noteHint")} />
        </FormSection>
        {take ? <Banner kind="info" message={t("agency.credits.takeInfo")} /> : null}
      </FormScreen>
    </>
  );
}

/** Which client: search, then tap. */
function PickClient({ title, onPick }: { title: string; onPick: (id: number) => void }) {
  const locale = getIntlLocale();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const list = useAgencyClients(q, "all");
  const rows = useMemo(() => (list.data?.pages.flatMap((p) => p.clients) ?? []).filter((c) => !c.in_trash), [list.data]);
  return (
    <>
      <Stack.Screen options={{ title }} />
      <FormScreen topInset={false} sheetTitle={title}>
        <Text variant="subhead" tone="muted">
          {t("agency.credits.pickClient")}
        </Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t("workspace.searchClients")} autoFocus />
        <Card padded={false}>
          {list.isPending ? (
            <SkeletonList rows={4} />
          ) : rows.length === 0 ? (
            <ListRow title={t("workspace.noClients")} leading={<RowIcon icon={Users} />} />
          ) : (
            rows.map((c, i) => (
              <View key={c.id}>
                {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                <ListRow
                  title={clientName(c)}
                  subtitle={t("agency.credits.clientHas", { count: count(c.credits_balance, locale) })}
                  leading={<Avatar name={clientName(c)} size={36} />}
                  chevron
                  onPress={() => onPick(c.id)}
                />
              </View>
            ))
          )}
        </Card>
      </FormScreen>
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
