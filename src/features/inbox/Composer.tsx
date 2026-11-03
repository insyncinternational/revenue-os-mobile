import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getIntlLocale, t, type TranslationKey } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, maxFontScale, radius, space } from "@/theme/tokens";
import type { RewriteMode } from "@/types/inbox";
import { Chip } from "@/ui/Chip";
import { ArrowUp, Camera, FileText, ICON_STROKE, ImageIcon, Paperclip, RotateCcw, Sparkles, X } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Reveal } from "@/ui/Reveal";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";
import { addWithinLimits, canPickFiles, formatBytes, MAX_ATTACHMENTS, pickFile, pickPhotos, takePhoto, type ReplyAttachment } from "./attachments";

type Props = {
  onSend: (text: string, attachments: ReplyAttachment[]) => void;
  /** Show the paperclip (email conversations: the only channel the reply API sends files on). */
  canAttach?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onHeight?: (h: number) => void;
  accessory?: React.ReactNode;
  /** AI rewrite of the draft; the button shows only when given. Resolves to the new text (rejects on failure). */
  onRewrite?: (text: string, mode: RewriteMode) => Promise<string>;
};

const MIN = 40;
const MAX = 132;
const MODES: RewriteMode[] = ["shorter", "tone:friendly", "tone:formal", "tone:direct", "tone:warm", "qualification_question"];
const modeKey = (m: RewriteMode) => `inbox.rewrite_${m.replace("tone:", "")}` as TranslationKey;

/**
 * Reply box: grows with the text up to ~5 lines, send button springs in when there's something to send.
 * ✨ opens the AI rewrite row above the box (shorter, a tone, or ending with a question); the result replaces the
 * draft and can be undone. 📎 (email only) adds photos, a camera shot or a file, shown as removable chips.
 * Sits on the keyboard (KeyboardStickyView in the screen) and above the home indicator.
 */
export function Composer({ onSend, disabled, placeholder, onHeight, accessory, onRewrite, canAttach }: Props) {
  const { colors } = useTheme();
  const toast = useToast();
  const locale = getIntlLocale();
  const [files, setFiles] = useState<ReplyAttachment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [height, setHeight] = useState(MIN);
  const [aiOpen, setAiOpen] = useState(false);
  const [busy, setBusy] = useState<RewriteMode | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const ready = !disabled && text.trim().length > 0;
  const canRewrite = Boolean(onRewrite) && ready;

  const sendStyle = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(ready ? 1 : 0.86, { damping: 14, stiffness: 220 }) }], opacity: withSpring(ready ? 1 : 0.45) }), [ready]);

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSend(value, files);
    setText("");
    setFiles([]);
    setAttachOpen(false);
    setHeight(MIN);
    setAiOpen(false);
    setBefore(null);
  };

  // Promise chains rather than try/finally: the React Compiler can't yet compile a component containing `finally`.
  const rewrite = (mode: RewriteMode) => {
    if (!onRewrite || busy) return Promise.resolve();
    const original = text;
    setBusy(mode);
    return onRewrite(original.trim(), mode)
      .then((next) => {
        haptics.success();
        setBefore(original);
        setText(next);
      })
      .catch(() => {
        // The screen shows the error.
      })
      .finally(() => setBusy(null));
  };

  const pick = async (source: "photos" | "camera" | "file") => {
    const picked = source === "photos" ? await pickPhotos(MAX_ATTACHMENTS - files.length) : source === "camera" ? await takePhoto() : await pickFile();
    if (picked == null) {
      toast.show(t("inbox.cameraDenied"), { kind: "error" });
      return;
    }
    if (!picked.length) return;
    const { list, dropped } = addWithinLimits(files, picked);
    setFiles(list);
    setAttachOpen(false);
    if (dropped) toast.show(t("inbox.attachLimit"), { kind: "error" });
  };

  const attach = (source: "photos" | "camera" | "file") => {
    if (picking) return Promise.resolve();
    setPicking(true);
    return pick(source)
      .catch(() => toast.show(t("inbox.attachFailed"), { kind: "error" }))
      .finally(() => setPicking(false));
  };

  return (
    <View
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
      style={[styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, space.sm) }]}
    >
      {accessory}
      {files.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.ai}>
          {files.map((f) => (
            <View key={f.key} style={[styles.file, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Paperclip size={14} color={colors.textSecondary} strokeWidth={ICON_STROKE} />
              <Text variant="footnote" weight="medium" numberOfLines={1} style={styles.fileName}>
                {f.filename}
              </Text>
              <Text variant="caption" tone="muted">
                {formatBytes(f.size, locale)}
              </Text>
              <PressableScale onPress={() => setFiles((l) => l.filter((x) => x.key !== f.key))} hitSlop={8} accessibilityLabel={t("inbox.removeFile", { name: f.filename })}>
                <X size={14} color={colors.textMuted} strokeWidth={ICON_STROKE} />
              </PressableScale>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {attachOpen ? (
        <Reveal>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.ai}>
            <Chip label={t("inbox.attachPhotos")} icon={ImageIcon} onPress={() => void attach("photos")} />
            <Chip label={t("inbox.attachCamera")} icon={Camera} onPress={() => void attach("camera")} />
            {canPickFiles ? <Chip label={t("inbox.attachFile")} icon={FileText} onPress={() => void attach("file")} /> : null}
            {picking ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </ScrollView>
        </Reveal>
      ) : null}
      {aiOpen && canRewrite ? (
        <Reveal>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.ai}>
            <Text variant="caption" tone="muted">
              {t("inbox.rewriteWithAi")}
            </Text>
            {before != null ? (
              <Chip
                label={t("inbox.rewriteUndo")}
                icon={RotateCcw}
                onPress={() => {
                  setText(before);
                  setBefore(null);
                }}
              />
            ) : null}
            {MODES.map((m) => (
              <View key={m} style={styles.chipWrap}>
                <Chip label={t(modeKey(m))} selected={busy === m} onPress={() => void rewrite(m)} />
                {busy === m ? <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} /> : null}
              </View>
            ))}
          </ScrollView>
        </Reveal>
      ) : null}
      <View style={styles.row}>
        {canAttach ? (
          <PressableScale
            onPress={() => {
              haptics.selection();
              setAttachOpen((o) => !o);
            }}
            disabled={disabled || files.length >= MAX_ATTACHMENTS}
            accessibilityLabel={t("inbox.attach")}
            accessibilityState={{ expanded: attachOpen }}
            hitSlop={6}
            style={[styles.clip, { backgroundColor: attachOpen ? colors.primarySubtle : "transparent" }]}
          >
            <Paperclip size={20} color={attachOpen ? colors.primary : colors.textSecondary} strokeWidth={ICON_STROKE} />
          </PressableScale>
        ) : null}
        <View style={[styles.field, { backgroundColor: colors.surface, borderColor: aiOpen && canRewrite ? colors.primaryBorder : colors.border }]}>
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (!v.trim()) setBefore(null);
            }}
            placeholder={placeholder ?? t("inbox.messagePlaceholder")}
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            editable={!disabled && !busy}
            multiline
            maxFontSizeMultiplier={maxFontScale.dense}
            onContentSizeChange={(e) => setHeight(Math.min(MAX, Math.max(MIN, e.nativeEvent.contentSize.height + 4)))}
            accessibilityLabel={t("inbox.messagePlaceholder")}
            // An empty box is always one line (some platforms report a tall content size for an empty field).
            style={[styles.input, { color: colors.text, height: text ? height : MIN }]}
          />
          {canRewrite ? (
            <PressableScale
              onPress={() => {
                haptics.selection();
                setAiOpen((o) => !o);
              }}
              accessibilityLabel={t("inbox.rewriteWithAi")}
              accessibilityState={{ expanded: aiOpen }}
              hitSlop={8}
              style={[styles.sparkle, { backgroundColor: aiOpen ? colors.primarySubtle : "transparent" }]}
            >
              <Sparkles size={18} color={colors.primary} strokeWidth={ICON_STROKE} />
            </PressableScale>
          ) : null}
        </View>
        <Animated.View style={sendStyle}>
          <PressableScale
            onPress={send}
            disabled={!ready || busy != null}
            accessibilityLabel={t("inbox.send")}
            accessibilityState={{ disabled: !ready }}
            style={[styles.send, { backgroundColor: colors.primaryFill }]}
          >
            <ArrowUp size={20} color={colors.onPrimary} strokeWidth={ICON_STROKE + 0.75} />
          </PressableScale>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, paddingHorizontal: space.md, gap: space.sm },
  row: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  field: { flex: 1, flexDirection: "row", alignItems: "flex-end", borderWidth: 1, borderRadius: radius.xl + 4, paddingLeft: space.md, paddingRight: space.xs },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingTop: 10, paddingBottom: 10, textAlignVertical: "top", outlineWidth: 0 },
  sparkle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 1 },
  ai: { alignItems: "center", gap: space.sm, paddingRight: space.md },
  chipWrap: { justifyContent: "center" },
  spinner: { position: "absolute", right: -2, top: -6 },
  clip: { width: 36, height: 40, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  file: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: space.sm + 2, borderRadius: radius.pill, borderWidth: 1, maxWidth: 240 },
  fileName: { flexShrink: 1 },
});
