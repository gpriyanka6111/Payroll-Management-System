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
