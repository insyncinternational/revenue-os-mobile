import { t } from "@/i18n";
import { KanbanSquare } from "@/ui/icons";
import { ComingSoon } from "@/ui/ComingSoon";

/** M5. */
export default function PipelineScreen() {
  return <ComingSoon icon={KanbanSquare} message={t("soon.pipeline")} />;
}
