import { Box, Button, Column, Row, Spacer, Text } from "@expo/ui/jetpack-compose";
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, padding, paddingAll, width } from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";
import type { TodayWidgetProps } from "./todayWidgetProps";

/**
 * The home-screen widget on Android: the workspace, Today's three counters and the first thing to do.
 * Runs in the widget's own runtime — nothing from outside this function exists there (see todayWidgetProps.ts).
 * The whole card is one button whose "open:" target the generated provider turns into revenueos:// (plugins/withWidgetOpenApp.js).
 */
const TodayWidget = (props: TodayWidgetProps) => {
  "widget";
  const c = props.colors;
  // `target` is read by the widget runtime; Expo UI's Button type doesn't list it.
  const open = { target: "open:/" } as object;
  return (
    <Button {...open} colors={{ containerColor: c.bg, contentColor: c.fg }} modifiers={[fillMaxSize(), cornerRadius(24)]}>
      <Column modifiers={[fillMaxSize(), paddingAll(16)]} verticalArrangement="center">
        <Text color={c.fg} style={{ fontSize: 15, fontWeight: "700" }} maxLines={1}>
          {props.title}
        </Text>
        <Text color={c.muted} style={{ fontSize: 12 }} maxLines={2}>
          {props.subtitle}
        </Text>
        {props.signedIn ? (
          <Column>
            <Spacer modifiers={[height(10)]} />
            <Row>
              {props.stats.map((s, i) => (
                <Row key={s.label}>
                  {i > 0 ? <Spacer modifiers={[width(22)]} /> : null}
                  <Column>
                    <Text color={c.fg} style={{ fontSize: 24, fontWeight: "700" }}>
                      {String(s.count)}
                    </Text>
                    <Text color={c.muted} style={{ fontSize: 12 }} maxLines={1}>
                      {s.label}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Row>
            <Spacer modifiers={[height(10)]} />
            <Box modifiers={[fillMaxWidth(), background(c.tile), cornerRadius(12), padding(10, 8, 10, 8)]}>
              <Text color={c.fg} style={{ fontSize: 13, fontWeight: "500" }} maxLines={1}>
                {props.next}
              </Text>
            </Box>
          </Column>
        ) : null}
      </Column>
    </Button>
  );
};

export default createWidget("TodayWidget", TodayWidget);
