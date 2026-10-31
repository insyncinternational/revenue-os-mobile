import { t } from "@/i18n";
import { Inbox } from "@/ui/icons";
import { ComingSoon } from "@/ui/ComingSoon";

/** M3. */
export default function InboxScreen() {
  return <ComingSoon icon={Inbox} message={t("soon.inbox")} />;
}
