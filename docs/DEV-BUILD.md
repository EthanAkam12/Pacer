# Making a development build

Expo Go can't track GPS while the screen is off, and it can't connect to heart-rate straps. A **development build** is your own version of the Pacely app, with its own icon, that can do both. You install it once, and then it loads your code from your PC just like Expo Go does.

These steps build it in the cloud with **EAS** (Expo's build service), so you don't need Android Studio. The free plan is enough.

## Android

### 1. Make an Expo account (once)

Sign up for free at https://expo.dev/signup.

### 2. Install the EAS tool and log in (once)

Stop the Expo server first (**Ctrl + C**). Then in Command Prompt:

```
npm install -g eas-cli
cd C:\Users\Ethan\Desktop\pacer-app
eas login
eas init
```

- `eas login` asks for your Expo email and password.
- `eas init` asks to create a project. Press **Y**. It adds a project ID to `app.json`. That's expected.
- Then copy the `"projectId"` line from `app.json` and send it to Claude, so it gets saved on GitHub too. Otherwise the next `git pull` may complain that `app.json` has changed.

### 3. Start the build

```
eas build --profile development --platform android
```

- If it asks to generate an Android keystore, press **Y**.
- The build runs on Expo's computers. It usually takes 10 to 20 minutes, sometimes longer on the free plan. You can close the window; the build carries on, and you can watch it at https://expo.dev.
- When it finishes, it shows a QR code and a link.

### 4. Install it on your phone

1. Scan the QR code with your phone's camera (or open the link on the phone).
2. Download the `.apk` file and open it.
3. If Android warns about installing unknown apps, tap **Settings** and allow your browser to install apps, then go back and tap **Install**.

The Pacely app now appears on your home screen with the yellow speech-bubble icon.

### 5. Run your code in it

From now on, start the server with `npm run dev` instead of `npm run go`:

```
cd C:\Users\Ethan\Desktop\pacer-app
npm run dev
```

Open the **Pacely** app (not Expo Go). It should find your server. If it doesn't, scan the QR code in Command Prompt with your phone's camera.

### 6. Set the phone permissions

These matter for tracking with the screen off:

- **Location:** when Pacely asks, allow it. Then go to **Settings > Apps > Pacely > Permissions > Location** and choose **Allow all the time**.
- **Nearby devices:** allow it, so Pacely can find heart-rate straps.
- **Battery:** go to **Settings > Apps > Pacely > Battery** and choose **Unrestricted**. Without this, some phones (especially Samsung) stop Pacely in your pocket.

### 7. Test it

1. Turn Practice mode **off** and start a short distance run.
2. Lock the phone and walk around the block.
3. You should see a "Pacely is tracking your run" notification, and the coach should keep talking.
4. To test a heart-rate strap, put it on (straps only wake up when they touch skin), then tap **Connect** on the Run tab.

### When to build again

You only need a new build when something **native** changes: the app icon or splash screen, permissions in `app.json`, or a new library that has phone code. Claude will tell you when that happens. Normal code changes just need `git pull` and `npm run dev`.

## iPhone

An iPhone build needs a paid Apple Developer account ($99 a year). With one:

```
eas device:create
eas build --profile development --platform ios
```

`eas device:create` gives you a link to open on the iPhone so it's allowed to install the build. After the build, open the link it gives you on the iPhone to install it. Then run `npm run dev` as above.
