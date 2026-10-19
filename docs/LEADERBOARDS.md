# Switching on the leaderboards (Firestore)

Ranks work straight away on the phone. The **global leaderboards** need Firebase's database, called **Firestore**, switched on once. It's free for this.

## 1. Create the database

1. Go to https://console.firebase.google.com and click your **Pacely** project.
2. In the left menu, open **Build** (or **Databases & Storage**) and click **Firestore Database**.
3. Click **Create database**.
4. If it asks for an edition, choose **Standard**. Leave the database ID as `(default)`. Click **Next**.
5. For **Location**, pick one near you, such as `europe-west2 (London)` or `eur3 (Europe)`. You can't change this later. Click **Next**.
6. Choose **Start in production mode** and click **Create**. Wait for it to finish.

## 2. Add the security rules

The rules stop people changing anyone else's entry or posting impossible times.

1. On the Firestore page, click the **Rules** tab at the top.
2. Click in the box, press **Ctrl + A** to select everything, and press **Delete**.
3. Paste in the rules. They're in the `firestore.rules` file in your `pacer-app` folder (open it with Notepad), and Claude can paste them in the chat too.
4. Click **Publish**.

## 3. Try it

Everyone picks a username after creating their account; that's their name on the leaderboards. Open the **Ranks** tab: your entry appears on the boards after your next real run (practice runs don't count).

You can see everyone's entries in the Firebase console under **Firestore Database > Data**.
