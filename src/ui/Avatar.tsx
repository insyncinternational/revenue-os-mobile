import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { initials, stableHash } from "@/lib/format";
import { useTheme } from "@/theme/ThemeProvider";
import { accentAvatarTone, avatarTones } from "@/theme/tokens";
import { accentGradient } from "./Gloss";
import { Text } from "./Text";

/** `accent`: always the glossy brand tone (the signed-in person in headers). */
type Props = { name: string; uri?: string | null; size?: number; accent?: boolean };

/**
 * A photo, else the person's initials on one of six soft tints (avatarTones): the same person always gets the
 * same one, so clients are easy to tell apart. `accent` is the signed-in person's glossy brand tone.
 */
export const Avatar = memo(function Avatar({ name, uri, size = 40, accent }: Props) {
  const { colors, scheme } = useTheme();
  const tones = avatarTones(colors, scheme);
  const tone = accent ? accentAvatarTone(colors) : (tones[stableHash(name || "?") % tones.length] ?? tones[0]!);
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.base, box, uri ? styles.clip : null]} accessible={false}>
      {uri ? null : <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: tone.bg }, tone.glossy ? { backgroundImage: accentGradient(colors) } : null]} />}
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" transition={120} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        <Text weight="semibold" style={{ color: tone.fg, fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.5) }} maxFontSizeMultiplier={1}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  // A photo is clipped to the circle.
  clip: { overflow: "hidden" },
});
