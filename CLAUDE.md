# Pacely: voice running coach app

## What it is

Pacely is a running app for iPhone and Android, built with React Native, Expo, Expo Router and TypeScript. It tracks pace, distance and heart rate during a run, and a voice coach talks to the runner. The coach tells them their splits, whether they're ahead of or behind a target pace, when they're slowing down, and how far is left to the finish, and gives encouragement. The app also supports interval workouts (run, walk and rest steps) and keeps a run history on the phone.

The owner is Ethan, who is new to coding. He works on Windows 11 with Node v26 and uses Command Prompt, not PowerShell. Explain steps simply, give exact commands, and say which window to type them in.

## Name

The app was renamed from **Pacer** to **Pacely** (another app on the stores is called Pacer). Everything people see says Pacely, including the icon and splash artwork (`PACELY` lettering redrawn in Inter Display Bold). Hidden identifiers stay as they were, because changing them would break things: bundle ID `com.ethanakam.pacer`, EAS slug/project `@ethanakam/pacer`, storage keys `pacer.*`, the location task name, Firebase project `pacer-82fc9`, and the GitHub repo `EthanAkam12/Pacer`. The URL scheme is `pacely` (invite links `pacely://add/<username>`), with `pacer` kept as a second scheme for older builds.

## Current status

**Working:** the standalone preview build (with expo-updates) is installed on Ethan's Android phone and opens without the PC; new JavaScript goes out with `npm run publish`. Earlier it ran in Expo Go and the development build. The Run tab, Practice mode, the live run screen, the voice coach, History and Intervals all load.

- **Code:** GitHub `EthanAkam12/Pacer`, branch `claude/transfer-chat-to-code-wcjs0u`. Ethan gets changes with `git pull` (see `docs/GET-THE-CODE.md`).
- **Project location:** `C:\Users\Ethan\Desktop\pacer-app` (a Git clone). The old `C:\Users\Ethan\Desktop\pacer` folder is a backup from before GitHub.
- **How to start it:**

  ```
  cd C:\Users\Ethan\Desktop\pacer-app
  npm run go
  ```

  `npm run go` is `npx expo start --go --tunnel` (Expo Go). `npm run dev` is `npx expo start --dev-client --tunnel` (development build, see `docs/DEV-BUILD.md`).

  Then scan the QR code with Expo Go on the phone. Add `-c` to clear the cache after big changes.
- **Getting new code:** `npm run update` (fetch, hard-reset to the GitHub branch, `npm install`). Plain `git pull` failed once because `npm install` on Ethan's PC (newer npm) changes `package-lock.json`. After updating, fully close Expo Go and scan the QR code fresh rather than reopening from "Recently opened".
- **Standalone app:** `eas build -p android --profile preview` makes an APK with the code inside (works without the PC; replaces the dev build, same app ID). `npm run publish` (`eas update --channel preview --auto`) sends new JavaScript to it with expo-updates; runtime version follows the app version. See `docs/STANDALONE.md`.
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
- **Development build installed (Android):** first EAS build succeeded and is installed on Ethan's phone. Installing the APK needed a parent to switch on "Apps from unknown sources" in Google Family Link (child profile → device → settings). Answer **n** to "Install and run the Android build on an emulator?" after `eas build`. The APK is large, so download on Wi-Fi.
- **Typing while the server runs:** letters are read as Expo shortcuts. **i** tried to open the iOS simulator and asked for Xcode. Always press Ctrl + C and wait for the `pacer>` line before running other commands.

## Project structure

| Path | Purpose |
|---|---|
| `app/_layout.tsx` | Root stack inside `AuthProvider`. `Stack.Protected` guards: app screens need a verified user with a username, the username screen shows when verified without one, `(auth)` screens show when signed out, verify shows when signed in but unverified. If Firebase isn't configured, sign-in is skipped. Imports `src/tracking` at startup to register the background location task. |
| `app/(auth)/sign-in.tsx`, `sign-up.tsx`, `verify.tsx`, `forgot.tsx`, `username.tsx` | Sign in; create account (email, password at least 8 characters, confirm); "check your email" screen that polls for verification and can resend (60 s cooldown); password reset email; choose a username (required after verifying) |
| `app/change-username.tsx`, `src/usernameForm.tsx` | Change username from Settings; the shared username form |
| `app/(tabs)/settings.tsx` | Account (email, change password via reset email, sign out, delete account with password), leaderboards (username, show me on leaderboards), appearance (System/Light/Dark and 8 colour themes), coach and "lower music while the coach talks", headphones (open Bluetooth settings, test the coach's voice), max heart rate, heart-rate updates, about |
| `app/(tabs)/_layout.tsx` | Bottom tabs: Run, Intervals, History, Ranks, Settings (Ionicons) |
| `app/(tabs)/ranks.tsx` | Distance picker (Overall, Mile, 5K, 10K, Half, Marathon). Rank card (badge, best time, progress and target for the next division; Overall also shows all five distance badges), "how ranks work" ladder for that distance, leaderboard (Overall: this week, all time, top ranked; distance: fastest times with each runner's badge for that distance) with your own position |
| `app/(tabs)/index.tsx` | Weekly goal ring and streak with a Mon–Sun schedule strip (`WeekGoalCard`, tap → schedule), training plan "next session" card ("Today", or rest day with the planned day and "Start it now") or a link to plans, then run setup: distance or intervals, distance chips, target pace, split frequency, heart-rate strap and heart-rate updates, coach card, voice and practice toggles, Start. Resolves the coach's voice before starting. |
| `app/(tabs)/workouts.tsx` | Interval workout list, "Use for next run", Edit, Build new |
| `app/(tabs)/history.tsx` | Achievements link, Progress section (`src/progressStats.tsx`: range switch, fitness trend as 5K-equivalent, race predictions, this month vs last, km per month, pace trend, 12-week calendar), last 7 days and all-time totals, personal bests, distance-per-week chart, average-pace trend chart, list of runs (practice runs are left out of totals, PBs and charts) |
| `app/run.tsx` | Live run screen in the chosen theme (gradient background): smoothed current pace, stats, progress lane or interval countdown that glide between updates (Animated), pulsing live dot, coach bubble that fades in on each new line, Pause/Resume, Finish. Keeps the screen awake (expo-keep-awake). |
| `app/run-detail/[id].tsx` | Run details: Share button, plan tag, stats, route map (`src/map.tsx`), best efforts with PB trophies, pace-per-split chart, interval results, splits with fastest highlighted, delete |
| `app/coach.tsx` | Pick a named coach (shows traits, a sample line and the phone voice it will use), speaking speed, optional voice override, tip for downloading better voices. Tapping plays a sample. |
| `app/plans.tsx` | Training plans: active plan (progress, session days with link to schedule, Stop), other plans (Read the guide / Start or Switch; switching clears ticks), then the session checklist with planned dates (current and next week, "Show all weeks") |
| `app/plan/[id].tsx`, `src/planGuides.ts` | A plan's full guide (`GUIDES`): goal, who it's for, what you need, phases ("how it gets you there"), session types explained, a note per week with that week's sessions, tips, what's next, Start/Switch button. Opened from plan cards and "How this plan works" |
| `src/planAdapt.ts` | Keeping up with a plan: `log` of attempts on `PlanProgress` (session, run, done or stopped early, easier, feel), `struggling` (last two attempts since `adjustedAt` were too hard or stopped), `breakDays` (10+ days away), `restartFrom(week)` (unticks from that week), `acknowledge`, `easierSession` (90 s walk in the middle of runs of 8+ min; distance runs about 80%). UI: `PlanCheckIn` on the Run tab, "Too much today? Do the easier version" on the plan card, "How did that feel?" `FeelCard` on run details, "Repeat or go back a week" on Training plans |
| `app/schedule.tsx`, `src/schedule.ts` | Running schedule: days the runner can run (`settings.runDays`, 0 = Sunday, default all). `planDays` spreads a plan's runs per week over the free days; `scheduleSessions` dates unfinished sessions from today (missed ones roll forward, one per day); `weekDays` feeds the Mon–Sun strip on the Run tab's goal card (ran / planned / can't run) |
| `src/plus.ts`, `app/plus.tsx` | Pacely Plus: `PLUS_BENEFITS`, price (£3.99/month, £29.99/year shown as best value, 7-day trial), Free vs Plus comparison table (`COMPARE`), Plus ★ badge (`plus` on profiles and weekly entries, shown on leaderboards and runner profiles), `usePlus`/`hasPlus`/`setPlusFlag` (mirrors `settings.plus`, loaded in `app/_layout.tsx`). No payments yet: the Plus screen has a testing switch; turning it off resets Plus themes/coaches/ghost. `PlusLock` (in `src/ui.tsx`) replaces locked features. Never lock anything that was free |
| `src/customPlan.ts`, `app/custom-plan.tsx` | Plus: personal plan builder (`buildCustomPlan`: race distance/date, current 5K from `currentFitness` or typed, optional goal time, 3–4 runs a week; Riegel paces easy/tempo/reps/race, long run builds to a peak with cutback every 4th week and a taper; up to 20 weeks). Stored on `PlanProgress.custom` (`planFor(progress)` resolves it). `paceFactor` adjusts target paces from recent feel (easy −1.5%, hard/stopped +2.5%) |
| `src/ghost.ts` | Plus: ghost runner. `ghostTrack` (run.track or rebuilt from splits), `ghostCandidates`, `pickGhost(settings.ghost)`. The session announces the gap every 500 m and at the finish; run screen shows it; run details show the result |
| `src/advStats.ts`, `src/advStatsUi.tsx`, `app/review.tsx` | Plus: training load (minutes × intensity², acute 7-day vs chronic 28-day ratio with a verdict), VO2 max estimate (Daniels VDOT from best 5K-equivalent), heart-rate zone minutes (from splits), year in review |
| `src/gpx.ts` | Plus: GPX export (route points now carry `t`), shared via expo-file-system + expo-sharing, text fallback |
| `src/reminders.ts` | Run reminders with expo-notifications (lazy-required; needs a new build): weekly notification on plan/run days at `settings.reminderTime`, body names the next session; `syncReminders` runs on Run tab focus and only reschedules when something changed |
| `src/gear.ts`, `app/shoes.tsx`, `app/race.tsx` | Shoes (`Shoe`, km = startKm + runs with `shoeId`, ~700 km limit, retire) and race countdown (`Race`; `RaceCard` on the Run tab says whether the plan finishes in time). Both per account and in the cloud state doc |
| `src/routines.ts`, `app/routine/[id].tsx` | Spoken warm-up (5 min) and cool-down stretches, coach voice, countdown, switch-sides call |
| `src/stories.ts`, `src/storyKit.ts`, `src/season1.ts`, `app/stories.tsx` | Story runs. Season 1 "Outbreak" (6 episodes, `s1e1`–`s1e6`; old id `outbreak` aliases to `s1e1`) plus Plus specials (Heist, Mars). `storyAccess`: episode 1 free for everyone (ends on a cliffhanger); later episodes need Plus + the previous one finished, and unlock a week apart counted from finishing episode 1 (practice runs don't count) — so releases are automatic per runner. The coach teases the next episode at the finish. Each chapter is a timed walk/jog/sprint step with narration (`say`, `mid`); `storyWorkout` → interval workout, `plan.story` → story narration instead of step cues, no slowing warnings. New seasons = a new season file + entry in `SEASONS`, then `npm run publish` |
| `src/live.ts`, `app/safety.tsx`, `app/live/[uid].tsx` | Plus: live tracking for safety. `settings.liveShare` + `safetyContacts` (up to 5, from people you follow). `startLive` (run screen mount) writes `live/{uid}` (name, viewers, active, paused, lat/lon, trail ≤ 60, km, secs) at most every 20 s from session updates; `endLive` marks it finished. Contacts see "Live now" cards in the Friends feed (`liveForMe`, array-contains on viewers) and a live map screen (`watchLive`) |
| `src/coachReview.ts`, `app/weekly.tsx` | Plus: `reviewRun` (PBs, half-to-half pacing drift, strong finish, rep fade, vs similar recent runs, heart rate, load, consistency, a "Next:" suggestion) shown as the Coach review card on run details; `weeklyReport` (last full week vs the one before, notes, next week's km target ≤ +10%) on the Weekly report screen (History → Advanced stats, and a Monday link on the Run tab) |
| `src/geo.ts` | `geohash` (4 characters ≈ 40 × 20 km) and `placeName` (reverse geocode). Local leaderboard (Plus): `myArea` in leaderboard.ts takes the start of the latest outdoor run, writes `area`/`areaName` to the profile (separate merge write with `updatedAt`), `localProfiles(area)`; Ranks has an Everyone / Friends / Local switch; Settings toggle "Show me on my local leaderboard" |
| `app/achievements.tsx` | Grid of all achievements, unlocked first |
| `app/friends.tsx` | Social hub with tabs: Feed (cheer cards for friends running now, "well done" received, friends' runs with a 👏 Well done button), Friends (search by username, invite via share link `pacely://add/<username>` or QR code, following list), Challenges (invites to accept/decline, live, finished, New challenge) |
| `app/runner/[uid].tsx` | A runner's profile: rank, trophies, totals, Follow, Challenge, cheer card if running now, You vs them comparison, best times, recent runs |
| `app/challenge/new.tsx`, `app/challenge/[id].tsx` | Create a challenge (most distance / most runs / fastest 5K; 1 day to 1 month; invite by username or from following) and its standings, result and trophy |
| `app/add/[username].tsx` | Target of invite links and QR codes: shows the runner and a Follow button |
| `app/share/[id].tsx` | Shareable run card (gradient in the theme accent, route art, distance/time/pace, rank and PB chips), captured with react-native-view-shot and shared with expo-sharing |
| `app/workout/edit.tsx` | Workout builder: name, warm-up, steps (run/walk/rest, by time or distance), repeats, cool-down, preview strip |
| `src/session.ts` | **Coaching engine.** A singleton `session` handles distance, pace, splits, intervals and everything the coach says. Includes practice-mode simulation. |
| `src/tracking.ts` | GPS: background updates via TaskManager, with `watchPositionAsync` as the fallback |
| `src/heartRate.ts` | BLE heart-rate strap (service 0x180D, characteristic 0x2A37). Loaded lazily so Expo Go doesn't crash. |
| `src/speech.ts` | expo-speech wrapper. Ducks music around speech (`src/ducking.ts`) unless turned off. Voice listing gives up after 1.5 s so a silent speech engine can't block starting a run. Important lines queue; others are skipped (and `speak` returns false) if the coach is already talking. Lists English voices, filters out Apple's novelty/robotic voices, works out gender and quality, and picks the best voice for a coach (`bestVoiceFor`, `voiceFor`). |
| `src/coach.ts` | Phrasebooks per style (friendly, tough, calm, cheeky, wise, technical, minimal): every cue has several conversational versions (functions of the spoken numbers), and the engine's `vary()` avoids repeating the last one. Named coaches (`PERSONAS`: Laura, Dave, Maya, Jack, Charlie, Kai, Sam) with traits, voice gender/accents, rate and pitch. `personaFor` also maps old style names. |
| `src/firebase.ts` | Firebase app + Auth with AsyncStorage persistence. Config from `EXPO_PUBLIC_FIREBASE_*` or the values in the file; `authConfigured` is false until set. |
| `src/auth.tsx` | `AuthProvider`/`useAuth` (incl. `username`, `setUsername`), unique usernames (Firestore `usernames/{lowercase}` → uid, saved as the account's displayName; falls back to no uniqueness check if Firestore isn't set up), sign up (sends verification email), sign in, resend, reset password, sign out, delete account (re-authenticates), plain-English error messages |
| `src/cloud.ts` | Backup: runs at `users/{uid}/runs/{id}`, workouts + plan progress at `users/{uid}/data/state`. `startCloud(uid)` (called from AuthProvider) does a two-way merge and installs storage hooks that upload on save/delete |
| `src/progress.ts` | `weekStats` (this week's km vs goal, goal streak in weeks) and `ACHIEVEMENTS` (28) with `earned(runs, goalKm)` |
| `src/progressUi.tsx` | `GoalRing`, `WeekGoalCard`, `PlanSessionCard` |
| `src/plans.ts` | Training plans (`PLANS`: c25k (NHS Couch to 5K, 9 wk), 10k (8 wk), sub30 (6 wk), half (12 wk)); sessions are interval workouts or distance runs, ids `w3s2`, keyed on runs as `c25k:w3s2` |
| `src/social.ts` | Well done (`wellDone/{owner}/runs/{runId}/from/{uid}`), cheers (`cheers/{to}/items`, polled every 20 s by the run screen and read out by the coach via `session.announceCheer`), running status (`profiles.runningSince`), challenges (`challenges/{id}` with `members`/`invited`, `progress/{uid}` scores from local runs, winner recorded once after the end, trophies at `trophies/{uid}/won/{id}` and `profiles.trophies`) |
| `src/socialUi.tsx` | `FeedItem`, `CheerCard`, `TrophyCount` |
| `src/stats.ts` | Fitness (5K equivalent per run), predictions, month comparison, monthly km, calendar |
| `src/friends.ts` | Follow by username (`usernames` → uid), `users/{uid}/following/{them}`, public profiles (`profiles/{uid}` also has weekKm, weekKey, runs, recent[5] with run ids, streak, trophies, runningSince; written with merge) |
| `src/map.tsx` | `RunMap`: static map from CARTO/OpenStreetMap raster tiles (light/dark to match theme) placed by Web Mercator maths, route drawn with SVG on top. No SDK or API key |
| `src/ranks.ts` | Speed-based ranks per distance (`RANKED`: mile, 5K, 10K, half, marathon): Bronze, Silver, Gold, Emerald, Platinum, Diamond (each III/II/I) and Elite, from the best time at that distance in the last year. Thresholds are a 5K table scaled by Riegel (exponent 1.06) and rounded. Overall rank = best distance rank. `ladder`, `stepFor`, `distanceRank`, `allRanks`, `rankFor` |
| `src/badge.tsx` | `RankBadge`: SVG shield in the tier's colours with the division numeral |
| `src/leaderboard.ts` | Firestore leaderboards: `profiles/{uid}` (name = username, tier = overall rank, rankScore, totalKm, best1000…best42195) and `weeks/{monday}/entries/{uid}` (name, tier, km). Boards: week, total, rank (rankScore), trophies, best{key}. `syncMyEntry` uploads from local runs (practice excluded), `fetchBoard` returns the top 50 plus your own position (count query), `removeMyEntry` |
| `firestore.rules` | Firestore security rules (own entry only, verified email, field and plausibility checks). Pasted into the Firebase console by hand. |
| `src/records.ts` | Best efforts (fastest 1 km, 1 mile, 5 km, 10 km, half, marathon within any run), personal bests, new-PB detection |
| `src/charts.tsx` | Bar and line charts (react-native-svg). Tap or drag to read a value. |
| `src/storage.ts` | AsyncStorage. Runs, workouts and plan progress are per account (`pacer.runs.v1.<uid>`; legacy un-suffixed data moves to the first account that signs in); settings are per phone. Hooks for cloud upload, `onDataChanged`/`useDataVersion` to refresh screens after a cloud merge |
| `src/intervals.ts` | Presets, labels, spoken step names, time estimates |
| `src/format.ts` | Pace, time and date formatting, spoken forms, parsing, haversine distance |
| `src/theme.ts` | 8 colour themes (`THEMES`, default `ocean`): each defines dark bg/accent/walk and light bg/accent/walk; cards, lines, muted text, run-screen colours (`t.run`) and text-on-accent are mixed from those. Choice (`themeId`, `appearance`) lives in a small store (`setThemePrefs`, loaded from Settings in `app/_layout.tsx`); `useTheme()` re-renders on change. |
| `src/ducking.ts` | Lowers other apps' audio while the coach talks: plays a silent looping sound (`assets/sounds/silence.wav`) through expo-audio with `interruptionMode: 'duckOthers'` while speech is queued, pauses it 600 ms after the last line |
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
- **Training plans:** a plan session run carries `planSession`/`planLabel`; the coach introduces it. Every saved plan run (not practice) is logged with `recordAttempt`; finishing it (reached) ticks it off. Beginner plans (`gentle`: Couch to 5K, First 10K) skip slowing warnings; walking (slower than 9:00/km or stopped) for 20 s in a run step gets a `walkOk` line instead, at most every 2 minutes. Plan progress syncs newest-wins by `updatedAt`.
- **Achievements:** at the finish, newly earned achievements (at most two) are announced.
- **Rank-up:** at the finish, ranks before and after the run are compared (practice runs against practice runs). The coach announces an overall rank-up (or first rank), otherwise the longest distance whose rank went up.
- **Saving:** runs of 30 seconds or more, or 50 m or more, are saved with a route thinned to about 400 points (with times), a distance-over-time `track` (~300 points, for ghosts), `bests`, `pbs`, `shoeId`, and `ghostGap`.
- **Auto-pause:** GPS runs with `plan.autoPause`: no movement for 10 s (after GPS lock, not in rest steps) pauses the clock; moving 12 m from that spot resumes it.
- **Race mode (Plus):** `plan.raceGoal` {time, strategy even|negative}; `raceDue(d)` is the plan's time at distance d (negative = 2% slower first half, 2% faster second); split messages compare with it and add a projected finish; extra update at each half-km between splits; one "too fast" warning in the first 1.5 km; result said at the finish and saved as `raceGoal`/`raceStrategy`.
- **Treadmill:** `plan.treadmill` skips GPS; distance comes from `treadmillKmh` (walks 5 km/h, rests 0). No slowing warnings; saved with `treadmill: true` and empty `bests` (no records or ranks); distance can be corrected on run details.

## Known limitations and next steps

- **Expo Go limits:** no background GPS (the screen must stay on), no heart-rate straps, and Expo Go shows its own icon and splash. All of these need a development build. `eas.json` is set up, and `docs/DEV-BUILD.md` has step-by-step instructions (EAS cloud build, no Android Studio). Bundle ID is `com.ethanakam.pacer`. EAS project `@ethanakam/pacer` (projectId in `app.json` → `extra.eas`). Ethan's phone is Android. Microphone and overlay permissions are blocked in `app.json` (expo-audio adds RECORD_AUDIO by default; Pacely never records).
- **App icon and splash:** Ethan's artwork: runner silhouette on blue hills with "PACELY" (`assets/images/icon.png`, cropped from a 364 px original and upscaled, so a larger original would be sharper). Android uses it at 58% on an edge-extended background (`adaptive-icon.png` + `adaptive-bg.png`) so the circle mask doesn't cut the text. Splash is the rounded artwork on #021225. Changing them needs a new development build.
- **Not yet tested on a real outdoor run:** GPS accuracy, speech while backgrounded, and battery use.
- **Accounts:** live. Firebase project `pacer-82fc9` (Email/Password sign-in enabled); config is in `src/firebase.ts`. Not yet tested end to end on a phone. Runs are still stored only on the phone, not per account.
- **Leaderboards:** code is done; Firestore must be created and `firestore.rules` published (`docs/LEADERBOARDS.md`). Entries are uploaded after each real run and when the Ranks tab opens. Times come from the phone, so a determined cheat could still post fake (but plausible) numbers. Usernames are unique but not filtered for bad words.
- **Needs a new development build** for the share card (react-native-view-shot, expo-sharing). Everything else from the last batch is JavaScript only.
- **Free tasters:** story episode 1 free; free users see the coach review headline and first tip, with the rest locked.
- **Pacely Plus:** story runs (weekly season episodes), live tracking, race mode, coach reviews + weekly report, adaptive plans, local leaderboard, ghost runner, advanced stats, year in review, 5 extra plans, 4 bonus themes, coaches Rosie and Marcus, Light/Bold share cards; unlocked by a testing switch. GPX export is free. Payments not built: needs the Play Store (developer account owned by a parent, as Ethan is under 18), Google Play Billing (RevenueCat), a privacy policy, and a new build.
- **Needs a new build:** run reminders (expo-notifications). Everything else in the latest batch works through `npm run publish`.
- **Social trust:** scores, trophies and well-dones are written by each phone, protected by rules but not verified server-side. Cheers arrive within about 20 s (polling), with no push notifications (that would need Cloud Functions on the Blaze plan).
- **Firestore rules** must be re-published after changes to `firestore.rules` (last change: `live/{uid}` for live tracking and `plus` on profiles/weekly entries) (backups and following live under `users/{uid}`).
- **Music ducking:** built on expo-audio's audio focus (Android) and duckOthers audio session (iOS); not yet tested with real music on a phone.
- **Voices:** on-device text-to-speech only. More natural options would need a cloud voice service (paid) behind a server.
- **Ideas:**
  - Apple Watch / Health Connect heart rate
  - Map view (react-native-maps)
  - Cloud voices (paid TTS behind a server) for truly human-sounding coaches
