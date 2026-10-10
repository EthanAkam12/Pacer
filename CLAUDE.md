# Pacer

## What this project is

Pacer is a voice running-coach app for iPhone and Android. It's built with React Native, Expo and Expo Router, in TypeScript. It tracks pace, distance and heart rate during a run and talks to the runner. It tells them their splits, whether they're ahead of or behind a target pace, when they're slowing down, how far is left to the finish, and gives encouragement. It also supports interval workouts (run, walk and rest steps) and keeps a run history on the phone.

## What has been done so far

1. **Web prototype.** A single HTML page proved the idea: GPS distance, a voice coach using the browser's speech API, a Bluetooth heart-rate strap, and a demo mode. It was then replaced by the native app because browsers stop GPS when the screen locks.
2. **Native app.** Built as an Expo project, with all the files listed in this document:
   - **Run tab:** Distance run or interval workout, optional target pace, coach update frequency (0.5 or 1 km), Bluetooth heart-rate strap connection, voice on/off, practice mode, optional max heart rate.
   - **Live run screen:** Current pace (rolling 20 seconds), distance, time, average pace and heart rate, a progress bar to the finish (distance mode) or the current interval with a countdown (interval mode), a coach speech bubble, and Pause/Resume and Finish buttons.
   - **Coaching engine (`src/session.ts`):**
     - km splits, with ahead/behind target
     - Halfway, 400 m to go and 100 m to go
     - "You're slowing down" when current pace is more than 12% slower than target (or average) for 15 seconds or more, then "back on pace"
     - Stopped-moving nudge
     - High heart-rate warning above 93% of max
     - Interval changeovers with a 10-second / 100 m warning and rep results
     - Encouragement every 4 or more quiet minutes
   - **Intervals tab:** Three presets (Beginner run/walk, 400 m repeats, Run 5 walk 1) and a workout builder (steps by time or distance, repeat count, optional warm-up and cool-down). Each workout shows a coloured strip of its steps.
   - **History tab:** Totals for the last 7 days and all time (practice runs excluded), and a list of runs. The run detail screen shows a route sketch (react-native-svg), stats, splits with the fastest highlighted, interval results, and a delete button.
   - **Background GPS:** Uses `expo-location` and `expo-task-manager`. Falls back to on-screen tracking if background permission is denied or when running in Expo Go.
   - **Heart rate:** Uses `react-native-ble-plx` with the standard BLE Heart Rate service (0x180D / 0x2A37). It's loaded lazily so the app still opens in Expo Go.
   - **Practice mode:** A simulated runner at 5× speed, including a mid-run slowdown and late fade in reps, so every coaching cue can be heard indoors.
   - **Storage:** Runs, workouts and settings are saved on the phone with AsyncStorage.
3. **Testing so far.** All files pass a TypeScript syntax check. The coaching engine was run headless with stubbed native modules, through a 3 km run and an interval workout. Every cue fired correctly, and both runs saved with splits and intervals. **It has not yet been run on a real device**, so expect small fixes such as library version differences, typing tweaks and permission edge cases.

## Development

- `npm install`, then `npx expo start` and test in Expo Go with Practice mode on.
- `npm run typecheck` runs `tsc --noEmit`.
- Background GPS and heart-rate straps need a development build (`npx expo run:android` or EAS), not Expo Go.
- `com.example.pacer` in `app.json` is a placeholder bundle ID.

## Notes

- Routes live in the root `app/` folder; shared code lives in `src/`. Imports are relative (`../../src/...`), not the `@/` alias.
- `src/tracking.ts` must be imported at app start because it defines the background task. `app/_layout.tsx` does this.
- `src/heartRate.ts` loads `react-native-ble-plx` lazily with `require` on purpose, so the app still opens in Expo Go.
- Not yet tested on a real device.
- Ideas for later: Apple Watch / Health Connect heart rate, a map view with `react-native-maps`, coach voice and personality options, cloud sync.
