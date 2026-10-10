# Getting the latest code onto your PC

The code now lives on GitHub (`EthanAkam12/Pacer`). Claude Code makes changes there, and you download them to your PC with Git.

## One-time setup

1. **Install Git.** Go to https://git-scm.com/download/win, download the installer, and click **Next** through every screen (the defaults are fine).
2. **Close and reopen Command Prompt** so it knows about Git.
3. **Stop the Expo server** if it's running: click the Command Prompt window, press **Ctrl + C**, and wait for the normal prompt.
4. **Download the code into a new folder.** Type these into Command Prompt, one line at a time:

   ```
   cd C:\Users\Ethan\Desktop
   git clone -b claude/transfer-chat-to-code-wcjs0u https://github.com/EthanAkam12/Pacer.git pacer-app
   cd pacer-app
   npm install
   ```

   If a browser window asks you to sign in to GitHub, sign in and allow access.

   Your old `pacer` folder stays where it is as a backup. From now on, use `pacer-app`.

5. **Start the app** the same way as before:

   ```
   npm run go
   ```

   This is a shortcut for `npx expo start --go --tunnel`. Scan the QR code with Expo Go.

## Every time Claude has made changes

Stop the server (**Ctrl + C**), then in Command Prompt:

```
cd C:\Users\Ethan\Desktop\pacer-app
git pull
npm install
npm run go
```

`git pull` downloads the new code. `npm install` adds any new libraries (it's quick when nothing changed).
