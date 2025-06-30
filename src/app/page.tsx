import { LoginForm } from '@/components/auth/login-form';

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <LoginForm />
    </main>
  );
}
