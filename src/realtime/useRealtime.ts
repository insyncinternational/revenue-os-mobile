/**
 * Live updates over Socket.IO (the same server as the web). The app connects only while it is in the
 * foreground, authenticates with a fresh two-minute ticket on every (re)connect (POST /auth/ws-ticket — the
 * session token itself never goes into the socket), joins the active workspace's room, and turns events into
 * cache refreshes. Events carry ids only; data is always re-read through the normal API.
 */
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { api } from "@/api/client";
import { API_ORIGIN } from "@/api/config";
import { keys } from "@/query/keys";
import { useSession } from "@/session/sessionStore";

type InboxUpdated = { base_id: number; item_id: string | null; channel: string; kind: "message" | "status" };

export function useRealtime(): void {
  const qc = useQueryClient();
  const baseId = useSession((s) => s.activeBaseId);
  const socketRef = useRef<Socket | null>(null);
  const baseRef = useRef(baseId);

  // One socket for the signed-in session; it lives while the app is in the foreground.
  useEffect(() => {
    const socket = io(API_ORIGIN, {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15_000,
      // A fresh ticket for every attempt (tickets last two minutes).
      auth: (cb) => {
        api
          .post<{ token: string }>("/auth/ws-ticket")
          .then((r) => cb({ token: r.token }))
          .catch(() => cb({}));
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (baseRef.current) socket.emit("join_workspace", { base_id: baseRef.current });
      // Anything missed while disconnected: refresh what's on screen.
      void qc.invalidateQueries({ queryKey: ["inbox"] });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    });

    socket.on("inbox:updated", (e: InboxUpdated) => {
      if (e.base_id !== baseRef.current) return;
      void qc.invalidateQueries({ queryKey: keys.inbox.all(e.base_id) });
      if (e.item_id) void qc.invalidateQueries({ queryKey: keys.inbox.conversation(e.base_id, e.item_id) });
    });

    // An AI agent action was parked for approval or decided elsewhere (the web, another phone).
    socket.on("ai_actions:update", (e: { base_id: number }) => {
      if (e.base_id !== baseRef.current) return;
      void qc.invalidateQueries({ queryKey: keys.approvals.actions(e.base_id) });
    });

    socket.on("notification", () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      // New AI drafts arrive as notifications (no socket event of their own).
      if (baseRef.current) void qc.invalidateQueries({ queryKey: keys.approvals.drafts(baseRef.current) });
    });

    const connectIfActive = (state: string) => {
      if (state === "active") {
        if (!socket.connected) socket.connect();
      } else if (socket.connected) {
        socket.disconnect();
      }
    };
    connectIfActive(AppState.currentState ?? "active");
    const sub = AppState.addEventListener("change", connectIfActive);

    return () => {
      sub.remove();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [qc]);

  // Switching workspace moves the socket to that workspace's room.
  useEffect(() => {
    baseRef.current = baseId;
    const socket = socketRef.current;
    if (socket?.connected) socket.emit("join_workspace", { base_id: baseId ?? null });
  }, [baseId]);
}
