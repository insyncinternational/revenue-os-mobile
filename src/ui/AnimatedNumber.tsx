import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { Text, type TextProps } from "./Text";

/**
 * A number that counts up to its value the first time it appears, and glides to new values after a refresh.
 * One short JS animation per number (≤ 700 ms) — cheap; with Reduce Motion it just shows the value.
 */
export function AnimatedNumber({ value, format = String, duration = 700, ...text }: TextProps & { value: number; format?: (n: number) => string; duration?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) {
      from.current = value;
      return;
    }
    const start = from.current;
    const t0 = Date.now();
    let frame = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setShown(start + (value - start) * (1 - (1 - p) ** 3));
      if (p < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  const current = reduce ? value : shown;
  const rounded = Number.isInteger(value) ? Math.round(current) : current;
  return (
    <Text numeric accessibilityLabel={format(value)} {...text}>
      {format(rounded)}
    </Text>
  );
}
