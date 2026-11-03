import { createElement } from "react";
import { View } from "react-native";

/**
 * Web preview of the original email: a fully sandboxed frame (no scripts, forms, popups or navigation of the app).
 * The phone uses EmailView.tsx (a web view with JavaScript off).
 */
export function EmailView({ document }: { document: string }) {
  return (
    <View style={{ flex: 1 }}>
      {createElement("iframe", {
        srcDoc: document,
        sandbox: "",
        referrerPolicy: "no-referrer",
        title: "Original email",
        style: { border: 0, width: "100%", height: "100%", flex: 1, background: "transparent" },
      })}
    </View>
  );
}
