/**
 * Customer sign-in on this phone. Separate from staff sign-in (session/sessionStore.ts): a customer signs in to
 * a business's portal with a code from their email or a password, and may be a customer of several businesses
 * (one session each). The sessions, with their tokens, live only in the Keychain / Keystore.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { portalAuthApi, setPortalSessionEnded, type PortalToken } from "@/api/portal";
import { expoPushToken } from "@/push/push";
import { clearQueryCache, clearQueryCacheAfterLeave } from "@/query/persist";
import { queryClient } from "@/query/queryClient";
import { useBrandColor } from "@/theme/brandStore";
import type { PortalBranding, PortalCustomer, PortalSignedIn } from "@/types/portal";

export type PortalSession = { slug: string; token: string; expiresAt: string | null; customer: PortalCustomer; branding: PortalBranding | null };

const KEY = "ros.portal.sessions";
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
/** Refresh when less than this is left (customer sessions last 7 days). */
const REFRESH_AHEAD_MS = 2 * 24 * 60 * 60_000;

type Saved = { sessions: PortalSession[]; active: string | null };

async function load(): Promise<Saved> {
  try {
    const raw = Platform.OS === "web" ? globalThis.sessionStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY, OPTIONS);
    if (!raw) return { sessions: [], active: null };
    const parsed = JSON.parse(raw) as Saved;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [], active: parsed.active ?? null };
  } catch {
    return { sessions: [], active: null };
  }
}

async function save(s: Saved): Promise<void> {
  const raw = JSON.stringify(s);
  try {
    if (Platform.OS === "web") globalThis.sessionStorage?.setItem(KEY, raw);
    else if (s.sessions.length) await SecureStore.setItemAsync(KEY, raw, OPTIONS);
    else await SecureStore.deleteItemAsync(KEY, OPTIONS);
  } catch {
    // Keychain unavailable right now: the session still works until the app closes.
  }
}

type State = Saved & {
  status: "loading" | "ready";
  hydrate: () => Promise<void>;
  signIn: (slug: string, result: PortalSignedIn) => Promise<void>;
  /** A fresh token for the active business (after a password change, which ends the old ones). */
  adopt: (result: PortalToken) => Promise<void>;
  switchTo: (slug: string) => void;
  /** Signs out of one business (the active one by default); the next one becomes active. */
  signOut: (slug?: string) => Promise<void>;
};

export const usePortalSession = create<State>((set, get) => ({
  sessions: [],
  active: null,
  status: "loading",

  async hydrate() {
    const saved = await load();
    set({ ...saved, active: saved.active && saved.sessions.some((s) => s.slug === saved.active) ? saved.active : (saved.sessions[0]?.slug ?? null), status: "ready" });
    // Keep sessions alive: refresh the ones close to expiring (best effort; a dead one is removed by onEnded).
    for (const s of get().sessions) {
      if (s.expiresAt && Date.parse(s.expiresAt) - Date.now() < REFRESH_AHEAD_MS) {
        void portalAuthApi
          .refresh(s.token)
          .then((r) => {
            const sessions = get().sessions.map((x) => (x.slug === s.slug ? { ...x, token: r.token, expiresAt: r.expires_at } : x));
            set({ sessions });
            return save({ sessions, active: get().active });
          })
          .catch(() => undefined);
      }
    }
  },

  async signIn(slug, r) {
    const key = slug.trim().toLowerCase();
    const session: PortalSession = { slug: key, token: r.token, expiresAt: r.expires_at, customer: r.customer, branding: r.branding };
    const sessions = [...get().sessions.filter((s) => s.slug !== key), session];
    // Another business's data must never show under this one.
    clearQueryCache(queryClient);
    set({ sessions, active: key });
    await save({ sessions, active: key });
  },

  async adopt(r) {
    const active = get().active;
    const sessions = get().sessions.map((s) => (s.slug === active ? { ...s, token: r.token, expiresAt: r.expires_at } : s));
    set({ sessions });
    await save({ sessions, active });
  },

  switchTo(slug) {
    if (get().active === slug || !get().sessions.some((s) => s.slug === slug)) return;
    clearQueryCache(queryClient);
    set({ active: slug });
    void save({ sessions: get().sessions, active: slug });
  },

  async signOut(slug) {
    const target = slug ?? get().active;
    const session = get().sessions.find((s) => s.slug === target);
    // Stop this business's notifications on this phone, then end the session on the server (both best effort).
    if (session) {
      void expoPushToken()
        .catch(() => null)
        .then((push) => portalAuthApi.logout(session.token, push))
        .catch(() => undefined);
    }
    const sessions = get().sessions.filter((s) => s.slug !== target);
    const active = get().active === target ? (sessions[0]?.slug ?? null) : get().active;
    if (sessions.length) {
      // Another business stays signed in: its screens must never show this one's data, so clear first.
      clearQueryCache(queryClient);
      set({ sessions, active });
    } else {
      // The last one: switch to sign-in first, then clear, so the page fades out instead of going blank.
      useBrandColor.getState().setWorkspace(null);
      set({ sessions, active });
      clearQueryCacheAfterLeave(queryClient);
    }
    await save({ sessions, active });
  },
}));

/** The business the customer is looking at, if signed in to any. */
export function useActivePortal(): PortalSession | null {
  return usePortalSession((s) => s.sessions.find((x) => x.slug === s.active) ?? null);
}

/** The active customer token (for requests); "" when signed out. */
export function portalToken(): string {
  const s = usePortalSession.getState();
  return s.sessions.find((x) => x.slug === s.active)?.token ?? "";
}

// The server ended a session (signed out elsewhere, blocked, portal switched off): drop it on this phone.
setPortalSessionEnded((token) => {
  const s = usePortalSession.getState().sessions.find((x) => x.token === token);
  if (s) void usePortalSession.getState().signOut(s.slug);
});
