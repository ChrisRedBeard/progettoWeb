"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/app/(public)/login/actions";

type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
};

export function AuthForm({
  action,
  submitLabel,
  fields,
  hidden,
  children,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  fields: Field[];
  hidden?: Record<string, string>;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {hidden
        ? Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
        : null}
      {fields.map((field) => (
        <label key={field.name} className="block text-base font-semibold">
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-lg text-ink outline-none"
          />
        </label>
      ))}
      {children}
      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-accent text-lg font-bold text-white disabled:opacity-60"
      >
        {pending ? "Attendere…" : submitLabel}
      </button>
    </form>
  );
}
