import type { TodayWidgetProps } from "./todayWidgetProps";

/** The browser has no home screen: the real widget lives in TodayWidget.android.tsx and TodayWidget.ios.tsx. */
const TodayWidget = {
  updateSnapshot(_props: TodayWidgetProps): void {},
};

export default TodayWidget;
