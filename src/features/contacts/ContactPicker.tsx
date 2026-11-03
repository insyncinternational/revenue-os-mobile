import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { contactsApi } from "@/api/contacts";
import { t } from "@/i18n";
import { useDebounced } from "@/lib/useDebounced";
import { useSession } from "@/session/sessionStore";
import { useActiveBaseId } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import type { Contact } from "@/types/contact";
import { Avatar } from "@/ui/Avatar";
import { X } from "@/ui/icons";
import { IconButton } from "@/ui/IconButton";
import { ListRow } from "@/ui/ListRow";
import { SearchBar } from "@/ui/SearchBar";
import { Text } from "@/ui/Text";
import { fullName } from "./contact";

/**
 * Who a deal, task or meeting is with: the picked contact (with ✕ to clear), or search-as-you-type
 * (top 5 matches).
 */
export function ContactPicker({ picked, onPick, onClear }: { picked: string | null; onPick: (c: Contact) => void; onClear: () => void }) {
  const { colors } = useTheme();
  if (picked) {
    return (
      <View style={[styles.picked, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Avatar name={picked} size={32} />
        <Text variant="callout" weight="medium" style={styles.flex} numberOfLines={1}>
          {picked}
        </Text>
        <IconButton icon={X} label={t("pipeline.noContact")} size={18} onPress={onClear} />
      </View>
    );
  }
  return <ContactSearch onPick={onPick} />;
}

function ContactSearch({ onPick }: { onPick: (c: Contact) => void }) {
  const baseId = useActiveBaseId() ?? 0;
  const me = useSession((s) => s.user?.id ?? null);
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const query = useDebounced(q, 250);
  const results = useQuery({
    queryKey: ["contacts", baseId, "picker", query],
    queryFn: ({ signal }) => contactsApi.list(baseId, { view: "all", search: query }, 1, me, signal),
    enabled: baseId > 0 && query.trim().length >= 2,
    staleTime: 30_000,
  });
  const rows = (results.data?.leads ?? []).slice(0, 5);
  return (
    <View style={styles.pickerWrap}>
      <SearchBar value={q} onChangeText={setQ} placeholder={t("pipeline.pickContact")} />
      {rows.length > 0 ? (
        <View style={[styles.results, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {rows.map((c) => (
            <ListRow key={c.id} title={fullName(c)} subtitle={c.company ?? c.email} leading={<Avatar name={fullName(c)} size={32} />} onPress={() => onPick(c)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  picked: { flexDirection: "row", alignItems: "center", gap: space.md, paddingLeft: space.md, borderWidth: 1, borderRadius: radius.md },
  flex: { flex: 1, minWidth: 0 },
  pickerWrap: { gap: space.sm },
  results: { borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
});
