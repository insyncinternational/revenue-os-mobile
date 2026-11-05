import { StyleSheet, View } from "react-native";
import { t, type TranslationKey } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { openContactForm, openDealForm, openMeetingForm, openTaskForm } from "@/lib/navigate";
import { useCan, useModuleEnabled } from "@/session/workspace";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
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

/** Size of each round button: also used by the loading skeletons so nothing moves when the screen loads. */
export const QUICK_ACTION_SIZE = 52;

/**
 * The shortcuts as one white card holding a row of round buttons (the banking-app pattern): a brand-tinted
 * circle with the icon, and a short one-line label under it. Lighter than a tile each, and it reads as one group.
 */
export function QuickActions({ actions }: { actions: Action[] }) {
  const { colors } = useTheme();
  if (!actions.length) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, boxShadow: colors.cardShadowSoft }]}>
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
            scaleTo={0.94}
            style={styles.action}
          >
            <View style={[styles.circle, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon size={22} color={colors.text} strokeWidth={ICON_STROKE + 0.25} />
            </View>
            <Text variant="caption" weight="semibold" tone="secondary" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t(a.label)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", justifyContent: "space-around", paddingVertical: space.lg, paddingHorizontal: space.xs, borderRadius: radius.xl + 4 },
  action: { flex: 1, alignItems: "center", gap: space.sm, paddingHorizontal: 2 },
  circle: { width: QUICK_ACTION_SIZE, height: QUICK_ACTION_SIZE, borderRadius: QUICK_ACTION_SIZE / 2, alignItems: "center", justifyContent: "center" },
});
