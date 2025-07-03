
# How to Make Your App Live (Deploy)

You're ready to go live! Here's how to connect your app to your real Firebase database and deploy it to a public URL.

## Part 1: Connect to Your Live Firebase Database

Your app needs its secret keys to talk to the database.

**Step 1: Get Your Firebase Config Keys**
*   Go to the [Firebase Console](https://console.firebase.google.com/) and open your new production project.
*   Navigate to the **Project Settings** by clicking the gear icon ⚙️ next to "Project Overview".
*   In your Project Settings, scroll down to the "Your apps" card.
*   Click the Web icon (`</>`) to see your web app's configuration. If you don't have one, create one.
*   Keep this page open. You'll need to copy the keys.

**Step 2: Create a `.env.local` File**
*   In the root directory of this project, create a new file and name it exactly `.env.local`.

**Step 3: Add Your Keys to the File**
*   Copy the entire code block below and paste it into your new `.env.local` file.
*   Go back to the Firebase Console tab and copy each key's value (the part in quotes) and paste it into the `.env.local` file, replacing the placeholder text.

```
# .env.local - IMPORTANT: This file contains your project's secret keys.
# Do not share it publicly.

NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="1:..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-..."
```

**Step 4: Restart Your Application**
*   **Important:** Stop your development server (Ctrl+C in the terminal) and restart it with `npm run dev`. This is required for the new keys to load.

## Part 2: Deploy to a Public URL

Now that your app is connected to the database, you can make it live.

**Step 1: Install and Login to Firebase Tools**
*   **Install:** If you haven't already, run this in your terminal:
    ```bash
    npm install -g firebase-tools
    ```
*   **Login:**
    ```bash
    firebase login
    ```

**Step 2: Prepare for Hosting**
*   Run this command in your project's root directory:
    ```bash
    firebase init hosting
    ```
*   You will be asked a few questions:
    *   `Use an existing project`: **Select this** and choose your new production project.
    *   `What do you want to use as your public directory?`: **Type `.next` and press Enter.**
    *   `Configure as a single-page app?`: **Type `N` (No) and press Enter.**
    *   `Set up automatic builds with GitHub?`: **Type `N` (No) for now.**

**Step 3: Build and Deploy!**
*   Run these two final commands:
    ```bash
    npm run build
    firebase deploy --only hosting
    ```

After it finishes, the terminal will show you your **Hosting URL**. That's the live link to your application!
