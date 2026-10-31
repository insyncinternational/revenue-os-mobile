import { t } from "@/i18n";
import { TabStack } from "@/ui/TabStack";

export default function ContactsLayout() {
  return <TabStack title={t("tabs.contacts")} />;
}
