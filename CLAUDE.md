# Pacer: voice running coach app

## What it is

Pacer is a running app for iPhone and Android, built with React Native, Expo, Expo Router and TypeScript. It tracks pace, distance and heart rate during a run, and a voice coach talks to the runner. The coach tells them their splits, whether they're ahead of or behind a target pace, when they're slowing down, and how far is left to the finish, and gives encouragement. The app also supports interval workouts (run, walk and rest steps) and keeps a run history on the phone.

The owner is Ethan, who is new to coding. He works on Windows 11 with Node v26 and uses Command Prompt, not PowerShell. Explain steps simply, give exact commands, and say which window to type them in.

## Current status

**Working:** the app runs on Ethan's phone in Expo Go. The Run tab, Practice mode, the live run screen, the voice coach, History and Intervals all load.

- **Project location:** `C:\Users\Ethan\Desktop\pacer`
- **How to start it:**

  ```
  cd C:\Users\Ethan\Desktop\pacer
  npx expo start --go --tunnel
  ```

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
| `app/_layout.tsx` | Root stack. Imports `src/tracking` at startup to register the background location task. |
| `app/(tabs)/_layout.tsx` | Bottom tabs: Run, Intervals, History (Ionicons) |
| `app/(tabs)/index.tsx` | Run setup: distance or intervals, distance chips, target pace, split frequency, heart-rate strap, voice and practice toggles, max HR, Start |
| `app/(tabs)/workouts.tsx` | Interval workout list, "Use for next run", Edit, Build new |
| `app/(tabs)/history.tsx` | Last 7 days and all-time totals (practice runs excluded), list of runs |
| `app/run.tsx` | Live run screen, always on a cobalt background: current pace, stats, progress lane or interval countdown, coach bubble, Pause/Resume, Finish |
| `app/run-detail/[id].tsx` | Run details: stats, route sketch (react-native-svg), interval results, splits with fastest highlighted, delete |
| `app/workout/edit.tsx` | Workout builder: name, warm-up, steps (run/walk/rest, by time or distance), repeats, cool-down, preview strip |
| `src/session.ts` | **Coaching engine.** A singleton `session` handles distance, pace, splits, intervals and everything the coach says. Includes practice-mode simulation. |
| `src/tracking.ts` | GPS: background updates via TaskManager, with `watchPositionAsync` as the fallback |
| `src/heartRate.ts` | BLE heart-rate strap (service 0x180D, characteristic 0x2A37). Loaded lazily so Expo Go doesn't crash. |
| `src/speech.ts` | expo-speech wrapper. Important lines queue; encouragement is skipped if the coach is already talking. |
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
- **Saving:** runs of 30 seconds or more, or 50 m or more, are saved with a route thinned to about 400 points.

## Known limitations and next steps

- **Expo Go limits:** no background GPS (the screen must stay on) and no heart-rate straps. Both need a development build: `npx expo run:android` with Android Studio, or `eas build --profile development`. Change `com.example.pacer` in `app.json` to a real bundle ID first.
- **Not yet tested on a real outdoor run:** GPS accuracy, speech while backgrounded, and battery use.
- **Ideas:**
  - Coach voice and personality options
  - Apple Watch / Health Connect heart rate
  - Map view (react-native-maps)
  - Pace and distance charts over time
  - Cloud sync and accounts
  - Personal bests
  - Custom app icon and splash screen
