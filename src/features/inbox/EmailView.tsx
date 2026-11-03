import { Linking, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { openableLink } from "./emailDocument";

/**
 * The original email, in a web view that runs no JavaScript and never navigates: the first load is our own
 * document; any link the reader taps opens in the phone's browser / mail / dialer instead (web, mail and phone
 * links only). `document` comes from emailDocument (its CSP blocks the rest).
 */
export function EmailView({ document }: { document: string }) {
  return (
    <WebView
      source={{ html: document }}
      originWhitelist={["about:*"]}
      javaScriptEnabled={false}
      domStorageEnabled={false}
      allowFileAccess={false}
      allowsLinkPreview={false}
      setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith("about:")) return true;
        if (openableLink(req.url)) void Linking.openURL(req.url);
        return false;
      }}
      style={styles.fill}
      containerStyle={styles.fill}
    />
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: "transparent" } });
