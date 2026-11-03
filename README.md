# Revenue OS mobile

The phone app for agency staff and client users (Expo SDK 58, React Native, Expo Router). Plan and audit:
`../MOBILE_APP_PLAN.md`, `../MOBILE_AUDIT_2026-11-01.md`.

## Run it

```bash
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://localhost:4000 (a real phone: http://<PC LAN IP>:4000)
npm start                   # Expo dev server; press w for the web preview
```

The backend (`../revenue-os-backend`) must be running. The web preview is for quick checks; swipes, push,
haptics and the keyboard need a phone.

## Checks (run before calling anything done)

```bash
npm run typecheck
npm run lint
npm test
npm run doctor
CONTRACT_EMAIL=… CONTRACT_PASSWORD=… CONTRACT_BASE_ID=… npm run contract   # API shapes vs. what the app expects
npm run i18n:sync                                                          # Azerbaijani strings from the web dictionary
```

The web app changes often in other work; `npm run contract` is how API drift is caught.

## Preview and store builds (EAS)

`eas.json` has two profiles: **preview** (installable test builds: Android APK, iOS ad-hoc) and
**production** (store builds; the build number goes up on its own). Before the first build:

1. **Expo account:** `npx eas-cli@latest login`, then `npx eas-cli@latest init`. This links the project
   and writes `extra.eas.projectId` into the app config. **Phone push needs this id**: without it the app
   never registers for notifications.
2. **App identifiers:** set `ios.bundleIdentifier` and `android.package` in `app.json` (for example
   `com.<company>.revenueos`). They can't change once the app is in the stores, so decide them on purpose.
3. **API address:** add `EXPO_PUBLIC_API_URL` (the backend's public origin) as an EAS environment variable
   for the preview and production environments.
4. **Store accounts:** Apple Developer ($99/year) for iOS installs beyond the simulator, and Google Play
   ($25 once) for the Play Store. Android preview APKs install without Play.

```bash
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

## Layout

- `src/app` — screens (Expo Router). Everything else lives outside it.
- `src/api` — one module per backend area; `src/types` — response shapes.
- `src/features/<area>` — hooks, pure logic (unit tested) and area components.
- `src/ui` — the design system; `src/theme` — tokens copied from the web (`styles/ds/tokens.css`).
- `scripts/` — the contract check and the Azerbaijani string sync.
