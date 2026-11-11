import { redirect } from "next/navigation";
import { getSession, dashboardPath } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  const { next } = await searchParams;
  if (s) redirect(dashboardPath(s.role));
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-6"><Logo size={44} withTagline /></div>
        <div className="card">
          <h1 className="text-2xl mb-4">Log in</h1>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
