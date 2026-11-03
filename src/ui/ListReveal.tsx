import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** Only the first screenful slides in; rows further down (reached by scrolling) appear at once, never late. */
const ANIMATED_ROWS = 10;

/**
 * A list row that rises in, staggered, the first time a list opens (opacity and translate only, once per mount).
 * Always the same wrapper: FlashList recycles rows, and a row switching between a plain fragment (index 10+) and
 * the animated view used to be thrown away and rebuilt, replaying its rise.
 */
export function ListReveal({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Reveal index={index} animate={index < ANIMATED_ROWS}>
      {children}
    </Reveal>
  );
}
