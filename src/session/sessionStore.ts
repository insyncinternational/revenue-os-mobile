/**
 * Who is signed in, whether they may use the app right now, and which workspace is active.
 *
 * The token is held in memory for requests and persisted only in the Keychain / Keystore; the user, token
 * expiry and active workspace are cached in MMKV so the app renders instantly on launch.
 */
import { create } from "zustand";
import { authApi, type SignedIn } from "@/api/auth";
import { setAuthHandlers, type RefreshOutcome } from "@/api/client";
import { ApiError, type ApiErrorKind } from "@/api/errors";
import { readJson, storage, StorageKeys, writeJson } from "@/lib/storage";
import { unregisterPush } from "@/push/push";
import { clearQueryCache, clearQueryCacheAfterLeave } from "@/query/persist";
import { queryClient } from "@/query/queryClient";
import type { User } from "@/types/session";
import { clearTodayWidget } from "@/widgets/widgetSync";
import { useAppLock } from "./appLock";
import { gateFor, type SessionGate } from "./gate";
import { clearToken, loadToken, saveToken } from "./tokenStore";
import { useBrandColor } from "@/theme/brandStore";

export type SessionStatus = "loading" | "signedOut" | "signedIn";
export type { SessionGate };

/** Refresh in the background when the token has less than this left (tokens last 30 days). */
const REFRESH_AHEAD_MS = 7 * 24 * 60 * 60_000;

type SessionState = {
  status: SessionStatus;
  gate: SessionGate;
  token: string | null;
  expiresAt: string | null;
  user: User | null;
  activeBaseId: number | null;
  /** Why the last session ended (shown once on the sign-in screen). */
  endedReason: ApiErrorKind | null;
  hydrate: () => Promise<void>;
  signIn: (result: SignedIn) => Promise<void>;
  setUser: (user: User) => void;
  /** A fresh session token from the server (after a password change, which ends the old one). */
  adoptToken: (token: string, expiresAt: string | null) => Promise<void>;
  setGate: (gate: SessionGate) => void;
  setActiveBase: (baseId: number | null) => void;
  refresh: () => Promise<RefreshOutcome>;
  signOut: (reason?: ApiErrorKind) => Promise<void>;
};

/** The workspace a person used last on this phone (an id only; kept across sign-outs). */
const lastBaseKey = (userId: number) => `session.lastBase.${userId}`;

export const useSession = create<SessionState>((set, get) => {
  const cachedUser = readJson<User>(StorageKeys.user) ?? null;
  return {
    status: "loading",
    gate: gateFor(cachedUser),
    token: null,
    expiresAt: storage.getString(StorageKeys.expiresAt) ?? null,
    user: cachedUser,
    activeBaseId: storage.getNumber(StorageKeys.activeBaseId) ?? null,
    endedReason: null,

    async hydrate() {
      const token = await loadToken();
      if (!token || !get().user) {
        set({ token: null, status: "signedOut" });
        return;
      }
      set({ token, status: "signedIn" });
      const exp = get().expiresAt;
      if (exp && Date.parse(exp) - Date.now() < REFRESH_AHEAD_MS) void get().refresh();
    },

    async signIn({ token, user, expires_at }) {
      await saveToken(token);
      writeJson(StorageKeys.user, user);
      if (expires_at) storage.set(StorageKeys.expiresAt, expires_at);
      // A different person signing in on this phone must never see the previous person's data; the same
      // person goes back to the workspace they used last.
      if (get().user?.id !== user.id) clearQueryCache(queryClient);
      const last = storage.getNumber(lastBaseKey(user.id)) ?? null;
      if (last == null) storage.remove(StorageKeys.activeBaseId);
      else storage.set(StorageKeys.activeBaseId, last);
      // The password (or Google) just proved who this is: no Face ID right after signing in.
      useAppLock.getState().unlock();
      set({ token, user, expiresAt: expires_at, activeBaseId: last, status: "signedIn", gate: gateFor(user), endedReason: null });
    },

    setUser(user) {
      writeJson(StorageKeys.user, user);
      set({ user, gate: gateFor(user) });
    },

    setGate(gate) {
      if (get().gate !== gate) set({ gate });
    },

    setActiveBase(baseId) {
      if (get().activeBaseId === baseId) return;
      const userId = get().user?.id;
      if (baseId == null) {
        storage.remove(StorageKeys.activeBaseId);
        if (userId) storage.remove(lastBaseKey(userId));
      } else {
        storage.set(StorageKeys.activeBaseId, baseId);
        if (userId) storage.set(lastBaseKey(userId), baseId);
      }
      set({ activeBaseId: baseId });
    },

    async adoptToken(token, expiresAt) {
      await saveToken(token);
      if (expiresAt) storage.set(StorageKeys.expiresAt, expiresAt);
      set({ token, expiresAt });
    },

    async refresh() {
      const token = get().token;
      if (!token) return "ended";
      try {
        const result = await authApi.refresh(token);
        await saveToken(result.token);
        writeJson(StorageKeys.user, result.user);
        if (result.expires_at) storage.set(StorageKeys.expiresAt, result.expires_at);
        set({ token: result.token, user: result.user, expiresAt: result.expires_at, gate: gateFor(result.user) });
        return "ok";
      } catch (e) {
        // "Too many requests" is temporary too: signing out on it ended a session that was still valid.
        if (e instanceof ApiError && (e.kind === "network" || e.kind === "timeout" || e.kind === "server" || e.kind === "rateLimited")) return "transient";
        return "ended";
      }
    },

    async signOut(reason) {
      const token = get().token;
      // Stop this phone's notifications for the account, then sign out on the server (both best effort:
      // offline sign-out still clears the phone).
      if (token) {
        void unregisterPush(token)
          .catch(() => undefined)
          .finally(() => void authApi.logout(token).catch(() => undefined));
      }
      await clearToken();
      storage.remove(StorageKeys.user);
      storage.remove(StorageKeys.expiresAt);
      storage.remove(StorageKeys.activeBaseId);
      // The lock belongs to whoever turned it on; the next person signing in here starts without it.
      useAppLock.getState().setEnabled(false);
      clearTodayWidget();
      // The sign-in screen is GrowthReach.ai's, not the last agency's (its colour came back on the button).
      useBrandColor.getState().setWorkspace(null);
      set({ token: null, user: null, expiresAt: null, activeBaseId: null, status: "signedOut", gate: "ok", endedReason: reason ?? null });
      // After the switch to sign-in, so the page being left fades out with its content instead of going blank.
      clearQueryCacheAfterLeave(queryClient);
    },
  };
});

setAuthHandlers({
  getToken: () => useSession.getState().token,
  refresh: () => useSession.getState().refresh(),
  onSessionEnded: (err) => {
    if (useSession.getState().status === "signedIn") void useSession.getState().signOut(err.kind);
  },
  onBlocked: (err) => {
    useSession.getState().setGate(err.kind === "paused" ? "paused" : "verifyEmail");
  },
});
