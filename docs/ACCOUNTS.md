# Switching on accounts (Firebase)

Pacer uses **Firebase Authentication** (from Google) for accounts. It stores the email and password safely and sends the verification and password-reset emails for you. The free plan is plenty.

Until this is set up, the app skips sign-in so you can keep testing.

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Create a project** (or **Add project**).
3. Name it `Pacer` and click **Continue**.
4. When it asks about Google Analytics, switch it **off**, then click **Create project**. Wait for it to finish and click **Continue**.

## 2. Switch on email and password sign-in

1. In the menu on the left, open **Build** (or **Security**) and click **Authentication**, then **Get started**.
2. On the **Sign-in method** tab, click **Email/Password**.
3. Switch on the **first** switch (Email/Password). Leave "Email link (passwordless sign-in)" off.
4. Click **Save**.

## 3. Get the app's connection details

1. Click the **cog** next to "Project overview" at the top left, then **Project settings**.
2. Scroll down to **Your apps** and click the **web** icon, which looks like `</>`.
3. For the nickname, type `Pacer app`. Leave "Firebase Hosting" unticked. Click **Register app**.
4. You'll see some code with `const firebaseConfig = { ... }`. Copy the lines for `apiKey`, `authDomain`, `projectId` and `appId`, and send them to Claude.

These details are safe to share. They only identify your project; they don't give anyone access to it.

## 4. Make the emails look nice (optional)

1. In **Authentication**, open the **Templates** tab.
2. Click **Email address verification**, then the pencil icon.
3. Change **Sender name** to `Pacer` and the subject to something like `Verify your email for Pacer`. Click **Save**.

Do the same for **Password reset** if you like.

## 5. Try it

Once Claude has added the details, get the new code and start the app (in Command Prompt, with the server stopped):

```
cd C:\Users\Ethan\Desktop\pacer-app
git pull
npm run go
```

The app now opens on the sign-in screen. Tap **Create an account**, use a real email address you can check, and tap the link in the email. The first email often lands in spam or junk.

You can see everyone who has signed up in the Firebase console under **Authentication > Users**. You can also delete test accounts there.
