import { create } from "zustand";

/**
 * The agency colour the app is themed with: the active workspace's branding (set when its access loads),
 * or — in the UI gallery only — a preview colour. Null = GrowthReach.ai colours.
 */
export const useBrandColor = create<{ workspace: string | null; preview: string | null; setWorkspace: (c: string | null) => void; setPreview: (c: string | null) => void }>(
  (set) => ({
    workspace: null,
    preview: null,
    setWorkspace: (workspace) => set({ workspace }),
    setPreview: (preview) => set({ preview }),
  })
);
