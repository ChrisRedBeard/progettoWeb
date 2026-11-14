import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "./actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "";

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-panel p-6 sm:p-8">
      <h1 className="text-3xl font-extrabold">Crea il tuo account</h1>
      <p className="mt-2 text-base text-muted">Scegli se alleni gli altri o ti alleni tu.</p>
      <div className="mt-6">
        <AuthForm
          action={registerAction}
          submitLabel="Crea account"
          hidden={callbackUrl ? { callbackUrl } : undefined}
          fields={[
            { name: "name", label: "Nome", type: "text", autoComplete: "name" },
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
          ]}
        >
          <fieldset>
            <legend className="text-base font-semibold">Ruolo</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="flex min-h-14 items-center gap-2 rounded-xl border border-line px-3 text-base">
                <input type="radio" name="role" value="ATHLETE" defaultChecked required />
                Atleta
              </label>
              <label className="flex min-h-14 items-center gap-2 rounded-xl border border-line px-3 text-base">
                <input type="radio" name="role" value="COACH" required />
                Coach
              </label>
            </div>
          </fieldset>
        </AuthForm>
      </div>
      <p className="mt-5 text-sm text-muted">
        Hai già un account?{" "}
        <Link href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="font-bold text-accent">
          Entra
        </Link>
      </p>
    </section>
  );
}
