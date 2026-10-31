import { useEffect, useState } from "react";

/** The value, `delay` ms after it stopped changing (search boxes: one request per pause, not per key). */
export function useDebounced<T>(value: T, delay = 250): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return settled;
}
