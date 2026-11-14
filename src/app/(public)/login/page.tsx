import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "";

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-panel p-6 sm:p-8">
      <h1 className="text-3xl font-extrabold">Bentornato</h1>
      <p className="mt-2 text-base text-muted">Entra con email e password.</p>
      <div className="mt-6">
        <AuthForm
          action={loginAction}
          submitLabel="Entra"
          hidden={callbackUrl ? { callbackUrl } : undefined}
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
          ]}
        />
      </div>
      <p className="mt-5 text-sm text-muted">
        Non hai un account?{" "}
        <Link
          href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}
          className="font-bold text-accent"
        >
          Registrati
        </Link>
      </p>
    </section>
  );
}
