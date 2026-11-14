import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="min-h-11 rounded-xl px-3 text-sm font-semibold text-muted">
        Esci
      </button>
    </form>
  );
}
