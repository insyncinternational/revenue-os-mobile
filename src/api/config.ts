/**
 * Where the backend lives. Set EXPO_PUBLIC_API_URL in .env (see .env.example):
 *   - web preview / iOS simulator: http://localhost:4000
 *   - a real phone on the same Wi-Fi: http://<your PC's LAN IP>:4000
 *   - production: the Render origin directly (not the web app's /backend proxy).
 */
const raw = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export const API_ORIGIN = raw.replace(/\/+$/, "");

/** Every request times out after this long (ms). */
export const REQUEST_TIMEOUT_MS = 15_000;
