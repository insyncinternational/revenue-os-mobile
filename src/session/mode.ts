/**
 * Which part of the app a signed-in person is in:
 *  - "agency": an agency's own area (home, clients, credits, alerts) for agency staff;
 *  - "workspace": one workspace's tabs (Today, Inbox, Contacts, Pipeline) — a client's own, or one an agency
 *    member opened through "Open client".
 * `null` until decided: agency members start in their agency, everyone else in their workspace.
 * Remembered per person on this phone, so the app reopens where they left it.
 */
import { create } from "zustand";
import { readJson, writeJson } from "@/lib/storage";
import { useSession } from "./sessionStore";

export type AppMode = "agency" | "workspace";
type Saved = { mode: AppMode | null; agencyId: number | null };

const key = (userId: number) => `session.mode.${userId}`;
const EMPTY: Saved = { mode: null, agencyId: null };

type ModeState = Saved & {
  userId: number | null;
  /** Loads what this person used last (follows the signed-in user on its own; see the subscription below). */
  loadFor: (userId: number | null) => void;
  enterAgency: (agencyId: number) => void;
  enterWorkspace: () => void;
};

const savedFor = (userId: number | null): Saved => (userId ? (readJson<Saved>(key(userId)) ?? EMPTY) : EMPTY);
const firstUser = useSession.getState().user?.id ?? null;

export const useAppMode = create<ModeState>((set, get) => ({
  ...savedFor(firstUser),
  userId: firstUser,
  loadFor(userId) {
    if (get().userId === userId) return;
    const saved = savedFor(userId);
    set({ userId, mode: saved.mode, agencyId: saved.agencyId });
  },
  enterAgency(agencyId) {
    const next: Saved = { mode: "agency", agencyId };
    const userId = get().userId;
    if (userId) writeJson(key(userId), next);
    set(next);
  },
  enterWorkspace() {
    // The agency is kept: "Back to agency" returns to the same one.
    const next: Saved = { mode: "workspace", agencyId: get().agencyId };
    const userId = get().userId;
    if (userId) writeJson(key(userId), next);
    set(next);
  },
}));

// Signing in, out, or as someone else switches to that person's saved mode.
useSession.subscribe((s) => useAppMode.getState().loadFor(s.user?.id ?? null));
