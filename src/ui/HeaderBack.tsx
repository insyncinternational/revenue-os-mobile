import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { t } from "@/i18n";
import { space } from "@/theme/tokens";
import { ArrowLeft } from "./icons";
import { IconButton } from "./IconButton";

/** The back button of every pushed screen: a white circle, with room before the title so the two never touch. */
export function HeaderBack() {
  return (
    <View style={styles.wrap}>
      <IconButton icon={ArrowLeft} label={t("common.back")} circle size={20} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginEnd: space.md },
});
