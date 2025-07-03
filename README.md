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

## Deployment to Firebase

To deploy your application to a live URL that others can access, you can use Firebase Hosting.

### 1. Set up a Firebase Project

If you haven't already, create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/).

### 2. Configure Environment Variables

Your application connects to Firebase using environment variables. The file `src/lib/firebase.ts` reads these values. For a live deployment, you must ensure these variables point to your **live Firebase project**, not a local or trial one.

You will need to create a `.env.local` file in the root of your project and add the configuration keys from your Firebase project's settings. It should look like this:

```
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="1:..."
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-..."
```

> **Important:** Using a live Firebase project with a real Firestore database is crucial. The local trial database only runs on your machine and won't be accessible to others once the site is deployed.

### 3. Deploy using the Firebase CLI

You'll need the Firebase Command Line Interface (CLI) to deploy the app.

1.  **Install the Firebase CLI:** If you don't have it, install it globally:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase:**
    ```bash
    firebase login
    ```

3.  **Initialize Firebase Hosting:** In your project's root directory, run:
    ```bash
    firebase init hosting
    ```
    When prompted, select "Use an existing project" and choose the Firebase project you set up in step 1. When it asks for your public directory, enter `.next`. When asked to configure as a single-page app, say No.

4.  **Build and Deploy:**
    ```bash
    npm run build
    firebase deploy --only hosting
    ```

After the command finishes, the CLI will give you the live URL for your application!
