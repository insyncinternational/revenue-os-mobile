import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

/** Live online/offline state (the same signal that pauses queries). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true
  );
}
