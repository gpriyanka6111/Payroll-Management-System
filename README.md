
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Tech Stack

This project is built with a modern, type-safe, and performant stack:

- **Framework:** [Next.js](https://nextjs.org/) (with App Router)
- **UI Library:** [React](https://react.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Forms:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **AI/Generative:** [Genkit](https://firebase.google.com/docs/genkit)
- **Date Utilities:** [date-fns](https://date-fns.org/)

## Running the Application

To run this application locally, you will need to run two separate processes in two different terminals.

### 1. Run the Web Application

This command starts the Next.js development server.

```bash
npm run dev
```

By default, the application will be available at [http://localhost:9002](http://localhost:9002).

### 2. Run the AI Flows (Genkit)

This command starts the Genkit development server to handle AI-related requests. This is only necessary if the application uses AI features.

```bash
npm run genkit:watch
```

This will start the Genkit UI, typically on `http://localhost:4000`.

## Connecting to a Live Firebase Database

To make your app accessible to others, you must connect it to a live Firebase database in the cloud. The trial database only runs on your machine.

**The code is already set up for this!** You just need to provide your project's unique keys.

Here’s how to do it:

**Step 1: Create a Firebase Project**

*   Go to the [Firebase Console](https://console.firebase.google.com/).
*   Click "Add project" and follow the on-screen instructions.
*   Once your project is created, navigate to the "Project Settings" (click the gear icon ⚙️).

**Step 2: Get Your Firebase Config Keys**

*   In your Project Settings, scroll down to the "Your apps" card.
*   Click the Web icon (`</>`) to create a new web app for your project.
*   Give it a nickname (e.g., "Paypall App") and register the app.
*   Firebase will show you your configuration keys (like `apiKey`, `authDomain`, etc.). Keep this page open.

**Step 3: Create a `.env.local` file**

*   In the root directory of this project, create a new file named `.env.local`.
*   Copy the code block below into your new `.env.local` file.

**Step 4: Add Your Keys to the File**

*   Go back to the Firebase console page with your config keys.
*   Copy each key's value and paste it into the `.env.local` file, replacing the placeholder text.

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

**Step 5: Restart Your Application**

*   After saving the `.env.local` file, you must stop and restart the development server (`npm run dev`) for the changes to take effect.

That's it! Your application will now be connected to your live Firebase project, ready for deployment.


## Deployment to Firebase

Once you have connected your app to a live database (see above), you can deploy it to a public URL using Firebase Hosting.

### 1. Install and Login to the Firebase CLI

You'll need the Firebase Command Line Interface (CLI) to deploy the app.

1.  **Install the Firebase CLI:** If you don't have it, install it globally:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

### 2. Initialize Firebase Hosting

In your project's root directory, run:
```bash
firebase init hosting
```
When prompted:
- Select "Use an existing project" and choose the Firebase project you just configured.
- For your public directory, enter **`.next`**.
- When asked to configure as a single-page app, say **No**.

### 3. Build and Deploy

Finally, build your application and deploy it to Hosting:
```bash
npm run build
firebase deploy --only hosting
```

After the command finishes, the CLI will give you the live URL for your application!
