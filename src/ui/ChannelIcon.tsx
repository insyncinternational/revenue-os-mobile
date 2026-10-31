import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { channelColors } from "@/theme/tokens";
import { FacebookIcon, InstagramIcon, LinkedInIcon, WhatsAppIcon } from "./BrandIcons";
import { Globe, ICON_STROKE, Mail, MessageSquare, Phone } from "./icons";

/** Matches the inbox API's `channel` values. */
export type Channel = "email" | "whatsapp" | "linkedin" | "sms" | "website_chat" | "instagram" | "facebook" | "call";

export const channelLabel: Record<Channel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  sms: "SMS",
  website_chat: "Website chat",
  instagram: "Instagram",
  facebook: "Facebook",
  call: "Call",
};

export function useChannelColor(channel: Channel): string {
  const { colors } = useTheme();
  return channel === "email" ? colors.primary : channelColors[channel];
}

/** Bare channel glyph. */
export function ChannelGlyph({ channel, size = 16, color }: { channel: Channel; size?: number; color?: string }) {
  const tint = useChannelColor(channel);
  const c = color ?? tint;
  switch (channel) {
    case "whatsapp":
      return <WhatsAppIcon size={size} color={c} />;
    case "linkedin":
      return <LinkedInIcon size={size} color={c} />;
    case "instagram":
      return <InstagramIcon size={size} color={c} />;
    case "facebook":
      return <FacebookIcon size={size} color={c} />;
    case "sms":
      return <MessageSquare size={size} color={c} strokeWidth={ICON_STROKE + 0.25} />;
    case "website_chat":
      return <Globe size={size} color={c} strokeWidth={ICON_STROKE + 0.25} />;
    case "call":
      return <Phone size={size} color={c} strokeWidth={ICON_STROKE + 0.25} />;
    default:
      return <Mail size={size} color={c} strokeWidth={ICON_STROKE + 0.25} />;
  }
}

/** Small round channel marker that sits on the corner of an avatar. */
export function ChannelBadge({ channel, size = 18 }: { channel: Channel; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={channelLabel[channel]}
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface, borderColor: colors.surface }]}
    >
      <ChannelGlyph channel={channel} size={size - 6} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
});
