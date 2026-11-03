import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { initials, stableHash } from "@/lib/format";
import { avatarGradients, onSolid } from "@/theme/tokens";
import { Text } from "./Text";

type Props = { name: string; uri?: string | null; size?: number };

/**
 * A photo, else the person's initials in one of eight soft tints (the same person always gets the same one).
 * Without a photo: white initials on a soft gradient (drawn natively by the style, so long lists stay cheap).
 */
export const Avatar = memo(function Avatar({ name, uri, size = 40 }: Props) {
  const g = avatarGradients[stableHash(name || "?") % avatarGradients.length] ?? avatarGradients[0]!;
  const box = { width: size, height: size, borderRadius: size / 2 };
  const fill = { backgroundColor: g.to, backgroundImage: `linear-gradient(135deg, ${g.from}, ${g.to})` };
  return (
    <View style={[styles.base, box, uri ? null : fill]} accessible={false}>
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" transition={120} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        <Text weight="semibold" style={{ color: onSolid, fontSize: Math.round(size * 0.38), lineHeight: Math.round(size * 0.5) }} maxFontSizeMultiplier={1}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
