import { createElement, forwardRef } from "react";
import { I18nManager } from "react-native";
import type { LucideIcon, LucideProps } from "lucide-react-native";

/**
 * An icon that points "forward" or "back" (chevron-right, arrow-left, send) faces the other way while
 * the app runs right-to-left (Arabic). React Native mirrors layout but never the drawing inside an icon.
 */
export function mirroredInRtl(Icon: LucideIcon): LucideIcon {
  const Mirrored = forwardRef<unknown, LucideProps>(function Mirrored(props, ref) {
    if (!I18nManager.isRTL) return createElement(Icon, { ...props, ref } as LucideProps);
    return createElement(Icon, { ...props, ref, style: [{ transform: [{ scaleX: -1 }] }, props.style] } as LucideProps);
  });
  return Mirrored as unknown as LucideIcon;
}
