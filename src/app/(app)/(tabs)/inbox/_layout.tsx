import { t } from "@/i18n";
import { TabStack } from "@/ui/TabStack";

export default function InboxLayout() {
  return <TabStack title={t("tabs.inbox")} />;
}
