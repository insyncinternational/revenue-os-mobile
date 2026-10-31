import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme/ThemeProvider";
import { avatarTints } from "@/theme/tokens";
import { initials, stableHash } from "@/lib/format";
import { Text } from "./Text";

type Props = { name: string; uri?: string | null; size?: number };

export const Avatar = memo(function Avatar({ name, uri, size = 40 }: Props) {
  const { scheme } = useTheme();
  const tints = avatarTints[scheme];
  const tint = tints[stableHash(name || "?") % tints.length] ?? tints[0]!;
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.base, box, { backgroundColor: tint.bg }]} accessible={false}>
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" transition={120} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        <Text weight="semibold" style={{ color: tint.fg, fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.5) }} maxFontSizeMultiplier={1}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
