import { t } from "@/i18n";
import { TabStack } from "@/ui/TabStack";

/** Conversations open above the tabs (app/(app)/conversation/[itemId].tsx), full screen like any messenger. */
export default function InboxLayout() {
  return <TabStack title={t("tabs.inbox")} />;
}
