import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireRole } from "@/lib/auth/current-user";

const links = [
  ["Lobby", "/lobby"],
  ["Dirette", "/lobby/live"],
  ["Inviti", "/invites"],
  ["Esercizi", "/exercises"],
  ["Schede", "/workouts"],
] as const;

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COACH");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-line bg-panel lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/lobby" className="text-lg font-extrabold">
            FIT <span className="text-accent">AI</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Coach</span>
        </div>
        <nav aria-label="Area coach" className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>
        <header className="flex items-center justify-end gap-2 border-b border-line px-4 py-3">
          <span className="mr-auto text-sm font-semibold">{user.name}</span>
          <ThemeToggle />
          <SignOutButton />
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
