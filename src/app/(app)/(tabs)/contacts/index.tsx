import { t } from "@/i18n";
import { Users } from "@/ui/icons";
import { ComingSoon } from "@/ui/ComingSoon";

/** M4. */
export default function ContactsScreen() {
  return <ComingSoon icon={Users} message={t("soon.contacts")} />;
}
