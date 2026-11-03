import { HStack, Spacer, Text, VStack } from "@expo/ui/swift-ui";
import { background, containerBackground, cornerRadius, font, foregroundStyle, frame, lineLimit, padding, widgetURL } from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { TodayWidgetProps } from "./todayWidgetProps";

/**
 * The home-screen widget on iPhone: the same card as Android (TodayWidget.android.tsx), in SwiftUI. A tap opens
 * Today. Runs in the widget's own runtime — nothing from outside this function exists there.
 */
const TodayWidget = (props: TodayWidgetProps) => {
  "widget";
  const c = props.colors;
  return (
    <VStack alignment="leading" spacing={10} modifiers={[containerBackground(c.bg, "widget"), widgetURL("revenueos://"), frame({ maxWidth: 10000, maxHeight: 10000, alignment: "leading" })]}>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 15, weight: "bold" }), foregroundStyle(c.fg), lineLimit(1)]}>{props.title}</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted), lineLimit(2)]}>{props.subtitle}</Text>
      </VStack>
      {props.signedIn ? (
        <HStack spacing={22}>
          {props.stats.map((s) => (
            <VStack key={s.label} alignment="leading" spacing={0}>
              <Text modifiers={[font({ size: 24, weight: "bold" }), foregroundStyle(c.fg)]}>{String(s.count)}</Text>
              <Text modifiers={[font({ size: 12 }), foregroundStyle(c.muted), lineLimit(1)]}>{s.label}</Text>
            </VStack>
          ))}
          <Spacer />
        </HStack>
      ) : null}
      {props.signedIn ? (
        <Text modifiers={[font({ size: 13, weight: "medium" }), foregroundStyle(c.fg), lineLimit(1), padding({ top: 8, bottom: 8, leading: 10, trailing: 10 }), frame({ maxWidth: 10000, alignment: "leading" }), background(c.tile), cornerRadius(12)]}>
          {props.next}
        </Text>
      ) : null}
    </VStack>
  );
};

export default createWidget("TodayWidget", TodayWidget);
