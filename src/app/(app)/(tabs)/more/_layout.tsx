import { t } from "@/i18n";
import { TabStack } from "@/ui/TabStack";

export default function MoreLayout() {
  return <TabStack title={t("tabs.more")} />;
}
