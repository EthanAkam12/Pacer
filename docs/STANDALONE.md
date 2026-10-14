# Standalone app (works without your PC)

The development build loads its code from `npm run dev` on your PC, so it only works while that's running.
A **preview** build has the code packed inside, so it works any time, like a normal app.

## 1. Build it (once)

In **Command Prompt**:

```
cd C:\Users\Ethan\Desktop\pacer-app
npm run update
eas build -p android --profile preview
```

- Log in to Expo if it asks.
- Answer **n** to "Install and run the Android build on an emulator?"
- Wait about 10–20 minutes, then open the link on your phone (on Wi-Fi) and install the APK.

It replaces the development build on the phone (same app ID). To get the development build back,
reinstall it from expo.dev → pacer → Builds.

## 2. Send it new code (any time, no rebuild)

After `npm run update` has brought in new code:

```
npm run publish
```

Then on the phone, close Pacer fully and open it again (sometimes twice): it downloads the new code when it starts.

## When do I need a new build instead?

Only when a change adds a new native library (Claude will say "needs a new build"), or changes the
icon, splash or app.json permissions. Updates only reach builds with the same app version (1.0.0).
