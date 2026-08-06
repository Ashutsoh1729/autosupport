import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sign in
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Welcome back. Sign in to your workspace.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
          >
            Sign up
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
          >
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
