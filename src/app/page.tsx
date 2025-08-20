import { LoginForm } from '@/components/auth/login-form';

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-secondary p-4">
        <div className="flex items-center justify-center mb-6">
            <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 2 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12 text-primary"
            >
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
            </svg>
            <span className="ml-4 text-5xl font-bold text-primary">WorkRoll</span>
        </div>
        <LoginForm />
    </div>
  );
}
