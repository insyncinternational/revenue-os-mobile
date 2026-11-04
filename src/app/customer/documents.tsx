import { useState } from "react";
import { ActivityIndicator, Platform, Share, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import { portalApi } from "@/api/portal";
import { userMessage } from "@/api/errors";
import { fileSize } from "@/portal/portal";
import { portalToken } from "@/portal/portalSession";
import { usePortalDocuments } from "@/portal/usePortal";
import { getIntlLocale, t } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { gutter, space } from "@/theme/tokens";
import type { PortalDocument } from "@/types/portal";
import { Card } from "@/ui/Card";
import { FileText } from "@/ui/icons";
import { ListRow } from "@/ui/ListRow";
import { Screen } from "@/ui/Screen";
import { Divider } from "@/ui/Section";
import { SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState } from "@/ui/States";
import { useToast } from "@/ui/Toast";

/**
 * Downloads a document with the customer's token, then hands it to the phone: the share sheet on iPhone (open,
 * save to Files, send), a folder picker on Android (save to the phone).
 */
async function saveDocument(d: PortalDocument): Promise<boolean> {
  const { Directory, File, Paths } = await import("expo-file-system");
  const downloaded = await File.downloadFileAsync(portalApi.documentUrl(d.id), new Directory(Paths.cache), {
    headers: { Authorization: `Bearer ${portalToken()}` },
    idempotent: true,
  });
  if (Platform.OS === "ios") {
    await Share.share({ url: downloaded.uri, title: d.file_name });
    return true;
  }
  const folder = await Directory.pickDirectoryAsync().catch(() => null);
  if (!folder) return false;
  const target = folder.createFile(d.file_name, d.mime_type || null);
  target.write(await downloaded.bytes());
  return true;
}

/** Files the business shared with the customer (on their deals or company in the CRM). */
export default function CustomerDocuments() {
  const locale = getIntlLocale();
  const toast = useToast();
  const docs = usePortalDocuments();
  const [busy, setBusy] = useState<number | null>(null);
  const rows = docs.data?.documents ?? [];

  const open = async (d: PortalDocument) => {
    if (Platform.OS === "web") return toast.show(t("portal.docs.phoneOnly"));
    setBusy(d.id);
    try {
      if (await saveDocument(d)) toast.show(t("portal.docs.saved", { name: d.file_name }), { kind: "success" });
    } catch (e) {
      toast.show(userMessage(e), { kind: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t("portal.docs.title") }} />
      <Screen onRefresh={() => void docs.refetch()} refreshing={docs.isRefetching}>
        {!docs.data ? (
          docs.isError ? <ErrorState message={userMessage(docs.error)} onRetry={() => void docs.refetch()} /> : <SkeletonList rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title={t("portal.docs.emptyTitle")} message={t("portal.docs.emptyMessage")} />
        ) : (
          <Card padded={false} style={styles.card}>
            {rows.map((d, i) => (
              <View key={d.id}>
                {i > 0 ? <Divider inset={gutter + 36 + space.md} /> : null}
                <ListRow
                  title={d.file_name}
                  subtitle={[fileSize(d.file_size), d.created_at ? relativeTime(d.created_at, locale) : null].filter(Boolean).join(" · ")}
                  leading={<FileText size={22} />}
                  trailing={busy === d.id ? <ActivityIndicator /> : undefined}
                  chevron={busy !== d.id}
                  onPress={busy ? undefined : () => void open(d)}
                />
              </View>
            ))}
          </Card>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({ card: { marginHorizontal: gutter, marginTop: space.sm } });
