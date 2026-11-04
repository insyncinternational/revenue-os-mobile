import { StyleSheet, View } from "react-native";
import { t, type TranslationKey } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { openContactForm, openDealForm, openMeetingForm, openTaskForm } from "@/lib/navigate";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space, type Palette } from "@/theme/tokens";
import { CalendarPlus, ICON_STROKE, KanbanSquare, ListTodo, UserPlus, type IconComponent } from "@/ui/icons";
import { PressableScale } from "@/ui/PressableScale";
import { Text } from "@/ui/Text";

type Action = { key: string; label: TranslationKey; icon: IconComponent; onPress: () => void };

/** The things you can start in one tap that this user may create, in a fixed order. Same checks as each screen's own "+" button. */
export function useQuickActions(): Action[] {
  const contacts = useCan("contacts_create");
  const crm = useModuleEnabled("crm");
  const tasks = useCan("tasks_create");
  const canBook = useCan("meetings_edit");
  const meetingsOn = useModuleEnabled("meetings");
  const meetings = canBook && meetingsOn;
  const all: (Action | false)[] = [
    contacts && { key: "contact", label: "today.quick.contact", icon: UserPlus, onPress: () => openContactForm() },
    contacts && crm && { key: "deal", label: "today.quick.deal", icon: KanbanSquare, onPress: () => openDealForm() },
    tasks && crm && { key: "task", label: "today.quick.task", icon: ListTodo, onPress: () => openTaskForm() },
    meetings && { key: "meeting", label: "today.quick.meeting", icon: CalendarPlus, onPress: () => openMeetingForm() },
  ];
  return all.filter((a): a is Action => a !== false);
}

/** Each shortcut in its own colour, so the row reads at a glance (and the screen isn't all one brand colour). */
const TONE: Record<string, { bg: keyof Palette; fg: keyof Palette }> = {
  contact: { bg: "primarySubtle", fg: "primary" },
  deal: { bg: "primarySubtle", fg: "primary" },
  task: { bg: "primarySubtle", fg: "primary" },
  meeting: { bg: "primarySubtle", fg: "primary" },
};

/**
 * One row of white tiles (like a modern app's shortcuts): new contact, deal, task, meeting — each with its icon on
 * a soft tile of its own colour.
 */
export function QuickActions({ actions }: { actions: Action[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <PressableScale
            key={a.key}
            onPress={() => {
              haptics.selection();
              a.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={t(a.label)}
            style={[styles.action, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}
          >
            <View style={[styles.tile, { backgroundColor: colors[(TONE[a.key] ?? TONE.deal!).bg] }]}>
              <Icon size={22} color={colors[(TONE[a.key] ?? TONE.deal!).fg]} strokeWidth={ICON_STROKE + 0.25} />
            </View>
            <Text variant="caption" weight="semibold" numberOfLines={2} style={styles.label}>
              {t(a.label)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm + 2 },
  action: { flex: 1, alignItems: "center", gap: space.sm, paddingTop: space.md + 2, paddingBottom: space.md, paddingHorizontal: space.xs, borderRadius: radius.xl },
  tile: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  label: { textAlign: "center" },
});
