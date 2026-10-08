# MyStudyAI - mobile app (Expo / React Native)

Native Android + iOS version of the web app in `../frontend`. It talks to the same backend in `../backend`,
so accounts and data are shared. Sign-in goes through the backend too: the app holds no Supabase key.

## Run it

```bash
cd mobile
npm install
cp .env.example .env      # then fill it in
npx expo start            # scan the QR code with Expo Go, or press w for the web preview
```

`.env` (all values are public client settings, never the service-role key):

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_URL` | the backend. A phone cannot reach `localhost`: use your computer's LAN IP, e.g. `http://192.168.1.20:5000/api`, or your deployed URL |
| `EXPO_PUBLIC_SKIP_LOGIN` | `true` opens straight on Home as a guest |
| `EXPO_PUBLIC_UI_PREVIEW` | `true` runs on built-in sample data with no Supabase / backend (development only, nothing is saved) |

Restart with `npx expo start -c` after changing `.env`.

## Build installable apps (EAS)

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android   # APK you can install directly
eas build --profile production --platform all
```

The EAS project is already linked (`app.json` -> `extra.eas.projectId`). Set the env values above as EAS
secrets / `env` in `eas.json` so the build knows your API URL.

Voice input (speech-to-text) uses `expo-speech-recognition`, a native module: it works in EAS / development
builds but not inside Expo Go (those screens show a hint). Text-to-speech works everywhere.

## Layout

```
App.js                      providers + navigator
src/navigation/AppNavigator tabs (Home, Explore, Record, Socials, Games) + stack of every other screen
src/screens/*               one file per area (Auth, Home, Flashcards, Quiz, Library, Tools, Voice, ...)
src/components/*            UI kit (Ui.js), Screen wrapper, charts, social cards, markdown
src/services/api.js         the same API client as the web app (fetch; sign-in goes through the backend)
src/context/*               Auth, Theme, I18n (en / hi / es), Toast
src/dev/previewApi.js       sample-data backend for EXPO_PUBLIC_UI_PREVIEW
```
