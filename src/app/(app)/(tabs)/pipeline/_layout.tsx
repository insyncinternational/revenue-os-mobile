import { t } from "@/i18n";
import { TabStack } from "@/ui/TabStack";

export default function PipelineLayout() {
  return <TabStack title={t("tabs.pipeline")} />;
}
