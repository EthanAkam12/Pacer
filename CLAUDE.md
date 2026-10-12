# Pacer: voice running coach app

## What it is

Pacer is a running app for iPhone and Android, built with React Native, Expo, Expo Router and TypeScript. It tracks pace, distance and heart rate during a run, and a voice coach talks to the runner. The coach tells them their splits, whether they're ahead of or behind a target pace, when they're slowing down, and how far is left to the finish, and gives encouragement. The app also supports interval workouts (run, walk and rest steps) and keeps a run history on the phone.

The owner is Ethan, who is new to coding. He works on Windows 11 with Node v26 and uses Command Prompt, not PowerShell. Explain steps simply, give exact commands, and say which window to type them in.

## Current status

**Working:** the app runs on Ethan's phone in Expo Go. The Run tab, Practice mode, the live run screen, the voice coach, History and Intervals all load.

- **Code:** GitHub `EthanAkam12/Pacer`, branch `claude/transfer-chat-to-code-wcjs0u`. Ethan gets changes with `git pull` (see `docs/GET-THE-CODE.md`).
- **Project location:** `C:\Users\Ethan\Desktop\pacer-app` (a Git clone). The old `C:\Users\Ethan\Desktop\pacer` folder is a backup from before GitHub.
- **How to start it:**

  ```
  cd C:\Users\Ethan\Desktop\pacer-app
  npm run go
  ```

  `npm run go` is `npx expo start --go --tunnel` (Expo Go). `npm run dev` is `npx expo start --dev-client --tunnel` (development build, see `docs/DEV-BUILD.md`).

  Then scan the QR code with Expo Go on the phone. Add `-c` to clear the cache after big changes.
- **Why `--go`:** `expo-dev-client` is installed, so without `--go` the QR code targets a development build and Expo Go closes immediately.
- **Why `--tunnel`:** a normal LAN connection hung on the loading screen, probably because of Windows Firewall or the router. `@expo/ngrok` is installed and handles the tunnel.

## Setup history (problems already solved)

- **`create-expo-app` failed at first:** it was typed into the Node.js REPL instead of Command Prompt.
- **Template folders:** the template's `app`, `components`, `hooks` and `constants` folders were deleted and replaced with this project's `app/`, `src/` and `app.json`.
- **Installed with `npx expo install`:**
  - expo-location, expo-task-manager, expo-speech
  - @react-native-async-storage/async-storage
  - react-native-svg, react-native-ble-plx, expo-dev-client
  - @expo/vector-icons (missing from the new template, which caused "Unable to resolve")
  - react-native-safe-area-context, react-native-screens, expo-status-bar
- **ngrok error:** "Install @expo/ngrok and try again" appeared even after installing it. Re-running the command fixed it.
- **Typing while the server runs:** letters are read as Expo shortcuts. **i** tried to open the iOS simulator and asked for Xcode. Always press Ctrl + C and wait for the `pacer>` line before running other commands.

## Project structure

| Path | Purpose |
|---|---|
| `app/_layout.tsx` | Root stack inside `AuthProvider`. `Stack.Protected` guards: app screens need a verified user with a username, the username screen shows when verified without one, `(auth)` screens show when signed out, verify shows when signed in but unverified. If Firebase isn't configured, sign-in is skipped. Imports `src/tracking` at startup to register the background location task. |
| `app/(auth)/sign-in.tsx`, `sign-up.tsx`, `verify.tsx`, `forgot.tsx`, `username.tsx` | Sign in; create account (email, password at least 8 characters, confirm); "check your email" screen that polls for verification and can resend (60 s cooldown); password reset email; choose a username (required after verifying) |
| `app/change-username.tsx`, `src/usernameForm.tsx` | Change username from Settings; the shared username form |
| `app/(tabs)/settings.tsx` | Account (email, change password via reset email, sign out, delete account with password), leaderboards (username, show me on leaderboards), coach, max heart rate, heart-rate updates, about |
| `app/(tabs)/_layout.tsx` | Bottom tabs: Run, Intervals, History, Ranks, Settings (Ionicons) |
| `app/(tabs)/ranks.tsx` | Distance picker (Overall, Mile, 5K, 10K, Half, Marathon). Rank card (badge, best time, progress and target for the next division; Overall also shows all five distance badges), "how ranks work" ladder for that distance, leaderboard (Overall: this week, all time, top ranked; distance: fastest times with each runner's badge for that distance) with your own position |
| `app/(tabs)/index.tsx` | Run setup: distance or intervals, distance chips, target pace, split frequency, heart-rate strap and heart-rate updates, coach card, voice and practice toggles, Start. Resolves the coach's voice before starting. |
| `app/(tabs)/workouts.tsx` | Interval workout list, "Use for next run", Edit, Build new |
| `app/(tabs)/history.tsx` | Last 7 days and all-time totals, personal bests, distance-per-week chart, average-pace trend chart, list of runs (practice runs are left out of totals, PBs and charts) |
| `app/run.tsx` | Live run screen, always on a cobalt background: current pace, stats, progress lane or interval countdown, coach bubble, Pause/Resume, Finish |
| `app/run-detail/[id].tsx` | Run details: stats, route sketch (react-native-svg), best efforts with PB trophies, pace-per-split chart, interval results, splits with fastest highlighted, delete |
| `app/coach.tsx` | Pick a named coach (shows traits, a sample line and the phone voice it will use), speaking speed, optional voice override, tip for downloading better voices. Tapping plays a sample. |
| `app/workout/edit.tsx` | Workout builder: name, warm-up, steps (run/walk/rest, by time or distance), repeats, cool-down, preview strip |
| `src/session.ts` | **Coaching engine.** A singleton `session` handles distance, pace, splits, intervals and everything the coach says. Includes practice-mode simulation. |
| `src/tracking.ts` | GPS: background updates via TaskManager, with `watchPositionAsync` as the fallback |
| `src/heartRate.ts` | BLE heart-rate strap (service 0x180D, characteristic 0x2A37). Loaded lazily so Expo Go doesn't crash. |
| `src/speech.ts` | expo-speech wrapper. Important lines queue; others are skipped (and `speak` returns false) if the coach is already talking. Lists English voices, filters out Apple's novelty/robotic voices, works out gender and quality, and picks the best voice for a coach (`bestVoiceFor`, `voiceFor`). |
| `src/coach.ts` | Phrasebooks per style (friendly, tough, calm, cheeky, minimal) and the named coaches (`PERSONAS`: Laura, Dave, Maya, Jack, Sam) with traits, voice gender/accents, rate and pitch. `personaFor` also maps old style names. |
| `src/firebase.ts` | Firebase app + Auth with AsyncStorage persistence. Config from `EXPO_PUBLIC_FIREBASE_*` or the values in the file; `authConfigured` is false until set. |
| `src/auth.tsx` | `AuthProvider`/`useAuth` (incl. `username`, `setUsername`), unique usernames (Firestore `usernames/{lowercase}` → uid, saved as the account's displayName; falls back to no uniqueness check if Firestore isn't set up), sign up (sends verification email), sign in, resend, reset password, sign out, delete account (re-authenticates), plain-English error messages |
| `src/ranks.ts` | Speed-based ranks per distance (`RANKED`: mile, 5K, 10K, half, marathon): Bronze, Silver, Gold, Emerald, Platinum, Diamond (each III/II/I) and Elite, from the best time at that distance in the last year. Thresholds are a 5K table scaled by Riegel (exponent 1.06) and rounded. Overall rank = best distance rank. `ladder`, `stepFor`, `distanceRank`, `allRanks`, `rankFor` |
| `src/badge.tsx` | `RankBadge`: SVG shield in the tier's colours with the division numeral |
| `src/leaderboard.ts` | Firestore leaderboards: `profiles/{uid}` (name = username, tier = overall rank, rankScore, totalKm, best1000…best42195) and `weeks/{monday}/entries/{uid}` (name, tier, km). Boards: week, total, rank (rankScore), best{key}. `syncMyEntry` uploads from local runs (practice excluded), `fetchBoard` returns the top 50 plus your own position (count query), `removeMyEntry` |
| `firestore.rules` | Firestore security rules (own entry only, verified email, field and plausibility checks). Pasted into the Firebase console by hand. |
| `src/records.ts` | Best efforts (fastest 1 km, 1 mile, 5 km, 10 km, half, marathon within any run), personal bests, new-PB detection |
| `src/charts.tsx` | Bar and line charts (react-native-svg). Tap or drag to read a value. |
| `src/storage.ts` | AsyncStorage: runs, workouts (seeded with presets) and settings |
| `src/intervals.ts` | Presets, labels, spoken step names, time estimates |
| `src/format.ts` | Pace, time and date formatting, spoken forms, parsing, haversine distance |
| `src/theme.ts` | Light and dark palettes, kind colours, run-screen colours |
| `src/ui.tsx` | Shared components: Screen, Title, Card, Segmented, Chip, Button, Field, ToggleRow, Stat, StepStrip |
| `src/types.ts` | Shared types |
| `src/hooks.ts` | `useRunSnapshot`, `useHr` |

## How the coach works (`src/session.ts`)

- **Current pace:** distance covered over roughly the last 20 seconds of samples.
- **GPS filtering:** fixes with accuracy worse than 35 m are skipped, moves under 3 m are treated as standing still, and jumps faster than 9 m/s are ignored.
- **Distance runs:**
  - Splits every 0.5 or 1 km, with time ahead of or behind target
  - Halfway, 400 m to go and 100 m to go
  - Slowing-down warning when current pace is more than 12% slower than target (or average) for 15 seconds, at most once a minute, then "back on pace"
  - Stopped-moving nudge
- **Intervals:**
  - Announces each step ("Interval 4 of 16. Run 400 metres. Go!")
  - 10-second / 100 m warnings before changeovers
  - Rep results
  - Slowing warnings in run steps, compared with target pace or the rep's first 30 seconds
- **Heart rate:** warning above 93% of max (default 190).
- **Encouragement:** after 4 or more minutes with 60 seconds of quiet.
- **Practice mode:** `SIM_SPEED = 5` runs the clock five times faster, with a scripted slowdown and late fade so every cue can be heard.
- **Coaches:** Settings store a persona id. At run start the Run tab resolves the persona's style, voice (best match on the phone unless overridden), rate and pitch into the `Plan`. Numbers are always spoken; only the wording changes. Sam ("minimal") has no encouragement.
- **Pace wording:** said the way runners say it, e.g. "5 30 per kilometre", "5 oh 5 per kilometre".
- **Heart-rate updates:** `plan.hrEvery` is `off`, `split` (with split messages, and with rep results in intervals), `t30`/`t60`/`t120`/`t300` (seconds) or `d500`/`d1000` (metres; merged into the split message when they land together). Lines say how hard it is ("Heart rate 152, steady") from the share of max HR. The high heart-rate warning always runs.
- **Personal bests:** the session keeps a distance-over-time track for the whole run. At the finish it works out best efforts, compares them with earlier runs (practice runs only compete with practice runs) and announces the longest new PB.
- **Rank-up:** at the finish, ranks before and after the run are compared (practice runs against practice runs). The coach announces an overall rank-up (or first rank), otherwise the longest distance whose rank went up.
- **Saving:** runs of 30 seconds or more, or 50 m or more, are saved with a route thinned to about 400 points, plus `bests` and `pbs`.

## Known limitations and next steps

- **Expo Go limits:** no background GPS (the screen must stay on), no heart-rate straps, and Expo Go shows its own icon and splash. All of these need a development build. `eas.json` is set up, and `docs/DEV-BUILD.md` has step-by-step instructions (EAS cloud build, no Android Studio). Bundle ID is `com.ethanakam.pacer`.
- **App icon and splash:** Ethan's artwork: runner silhouette on blue hills with "PACER" (`assets/images/icon.png`, cropped from a 364 px original and upscaled, so a larger original would be sharper). Android uses it at 58% on an edge-extended background (`adaptive-icon.png` + `adaptive-bg.png`) so the circle mask doesn't cut the text. Splash is the rounded artwork on #021225. Changing them needs a new development build.
- **Not yet tested on a real outdoor run:** GPS accuracy, speech while backgrounded, and battery use.
- **Accounts:** live. Firebase project `pacer-82fc9` (Email/Password sign-in enabled); config is in `src/firebase.ts`. Not yet tested end to end on a phone. Runs are still stored only on the phone, not per account.
- **Leaderboards:** code is done; Firestore must be created and `firestore.rules` published (`docs/LEADERBOARDS.md`). Entries are uploaded after each real run and when the Ranks tab opens. Times come from the phone, so a determined cheat could still post fake (but plausible) numbers. Usernames are unique but not filtered for bad words.
- **Voices:** on-device text-to-speech only. More natural options would need a cloud voice service (paid) behind a server.
- **Ideas:**
  - Apple Watch / Health Connect heart rate
  - Map view (react-native-maps)
  - Cloud sync and accounts
