## Purpose
This file guides AI coding agents working on the ImageBackgroundRemover repo — a Create React App frontend with a Capacitor native wrapper that uses the remove.bg API for background removal.

## Quick Architecture Summary
- **Frontend:** `src/` (React, CRA). Main app in `src/App.js` and UI component in `src/components/BackgroundRemover.js`.
- **Native wrapper:** `android/` (Capacitor Android project). Capacitor plugins used: `@capacitor/camera`, `@capacitor/filesystem`.
- **Build output / deploy:** `build/` contains the CRA production build; `public/` contains static assets.

## Key Files To Inspect (high-value)
- `src/components/BackgroundRemover.js` — core logic: upload (web) or Camera (native), call to remove.bg via `axios`, binary -> base64 handling, native save via `Filesystem`.
- `src/App.js` — mounts `BackgroundRemover` and sets the app title.
- `package.json` — scripts and Capacitor/native deps. Use `npm start`, `npm run build`, `npm test`.
- `android/` — native Android project. Use `npx cap sync` / `npx cap open android` to work in Android Studio.

## How Background Removal Works (important patterns)
- The component reads an image as a `data:` URL for web or `Camera.getPhoto({ resultType: CameraResultType.DataUrl })` for native.
- It converts the base64 data URL to a `Blob` and sends it as `formData.append('image_file', blob, 'image.png')` to `https://api.remove.bg/v1.0/removebg`.
- Axios request uses `responseType: 'arraybuffer'`. The response is converted to a base64 data URL and shown in the UI.
- Native vs Web branching is done with `Capacitor.isNativePlatform()` — follow that pattern when adding platform-specific behavior.

## Environment & Secrets
- The code expects an environment variable `REACT_APP_REMOVE_BG_API_KEY`. It is referenced in `BackgroundRemover.js` as `process.env.REACT_APP_REMOVE_BG_API_KEY`.
- Example `.env` (do not commit API keys):
```
REACT_APP_REMOVE_BG_API_KEY=sk_live_xxx
```

## Common Commands (Windows PowerShell)
- Install deps:
```powershell
npm install
```
- Run development web app:
```powershell
npm start
```
- Run tests:
```powershell
npm test
```
- Build production web bundle:
```powershell
npm run build
```
- Capacitor native steps (after `npm run build` if syncing web assets):
```powershell
npx cap sync android
npx cap open android
```

## Debugging Tips (repo-specific)
- Web debugging: `npm start` and use browser devtools. Check console for API error text returned by remove.bg (component attempts to decode JSON errors from arraybuffer responses).
- Native testing: use `npx cap open android` -> Android Studio emulator / device. Camera and Filesystem behavior must be tested on a device or emulator with Play services.
- If background removal fails, the component sets a descriptive `error` state and logs details to console; inspect network requests to `https://api.remove.bg` and ensure `X-Api-Key` header is present.

## Where to Change/Extend Functionality
- Replace/extend the external API in `src/components/BackgroundRemover.js`. The API URL and request shape are centralized there (`API_URL`, `formData` construction).
- To add a different provider that returns JSON with a URL instead of binary, update `responseType` and conversion logic in the same file.
- To add platform-specific UX (e.g., native share), follow `Capacitor.isNativePlatform()` branching and use relevant Capacitor plugins in `package.json`.

## Project Conventions & Gotchas
- Environment var prefix: CRA requires `REACT_APP_` prefix for env vars available at runtime.
- Do not `eject` CRA unless necessary; repo uses standard `react-scripts` flow.
- Binary handling: the component expects image binary in the HTTP response and converts using `Uint8Array` -> `btoa`. If you change the provider, validate response content-type before conversion.
- File saving on native: uses `Filesystem.writeFile` with `Directory.Downloads`. Update Android permissions in `android/app/src/main/AndroidManifest.xml` if you change storage behavior.

## Tests & CI notes
- There are no project-specific unit tests beyond CRA scaffold. Use `npm test` for the default test runner. For component-level tests, mock `@capacitor/*` plugins and network requests (axios).

## Pull Request Guidance for AI agents
- Keep changes minimal and file-scoped. If you modify `BackgroundRemover.js`, run `npm start` locally and verify the UI flow.
- When adding native-capacitor code, update the README and include step-by-step native sync commands in the PR description.

If anything here is unclear or you want this file expanded (examples, code snippets, or CI pipeline hints), say which section to expand.
