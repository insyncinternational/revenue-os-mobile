import { router } from "expo-router";
import { t } from "@/i18n";
import { ArrowLeft } from "./icons";
import { IconButton } from "./IconButton";

/** The back button of every pushed screen: a floating white circle, like the header's other actions. */
export function HeaderBack() {
  return <IconButton icon={ArrowLeft} label={t("common.back")} circle size={20} onPress={() => router.back()} />;
}
