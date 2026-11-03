import { useEffect, type RefObject } from "react";
import { useNavigation } from "expo-router";

/** The native stack's "opening/closing animation finished" event (typed here: its package isn't a direct dependency). */
type TransitionEvents = { addListener: (event: "transitionEnd", cb: (e: { data: { closing: boolean } }) => void) => () => void };

/** Fallback when the screen doesn't report the end of its opening animation. */
const FALLBACK_MS = 700;

/**
 * Focuses a field once the screen has finished opening — use instead of `autoFocus` on form sheets. With
 * `autoFocus` the keyboard opens while the sheet is still sliding up; the keyboard-aware scroll then measures the
 * field mid-animation and scrolls the form far past it, so you type into a field you can't see.
 */
export function useFocusAfterOpen(ref: RefObject<{ focus: () => void } | null>, enabled = true): void {
  const navigation = useNavigation() as unknown as TransitionEvents;
  useEffect(() => {
    if (!enabled) return;
    let done = false;
    const focus = () => {
      if (done) return;
      done = true;
      ref.current?.focus();
    };
    const unsubscribe = navigation.addListener("transitionEnd", (e) => {
      if (!e.data.closing) focus();
    });
    const timer = setTimeout(focus, FALLBACK_MS);
    return () => {
      done = true;
      unsubscribe();
      clearTimeout(timer);
    };
  }, [enabled, navigation, ref]);
}
