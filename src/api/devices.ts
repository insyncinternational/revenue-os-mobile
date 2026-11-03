import { api, request } from "./client";

export const devicesApi = {
  register: (body: { token: string; platform: "ios" | "android"; app_version?: string | null; device_name?: string | null }) => api.post<{ ok: true }>("/mobile/devices", body),
  /** Uses the given session token so it still works while signing out. */
  remove: (token: string, sessionToken: string) =>
    request<{ ok: true }>("/mobile/devices", { method: "DELETE", body: { token }, auth: false, headers: { Authorization: `Bearer ${sessionToken}` }, timeoutMs: 5000 }),
};
