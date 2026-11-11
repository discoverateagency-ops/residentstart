import { redirect } from "next/navigation";
import { getSession, dashboardPath } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const s = await getSession();
  if (s) redirect(dashboardPath(s.role));
  const { role } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-6"><Logo size={44} withTagline /></div>
        <div className="card">
          <h1 className="text-2xl mb-4">Create account</h1>
          <SignupForm initialRole={role === "buyer" ? "buyer" : "investor"} />
        </div>
      </div>
    </main>
  );
}
