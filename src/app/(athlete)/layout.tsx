import Link from "next/link";
import { AthleteFrame } from "@/components/athlete-frame";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireRole } from "@/lib/auth/current-user";

const links = [
  ["Esplora", "/explore"],
  ["Scheda", "/workout"],
  ["Storico", "/history"],
  ["Impostazioni", "/settings"],
] as const;

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ATHLETE");

  return (
    <AthleteFrame
      header={
        <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/explore" className="text-lg font-extrabold">
              FIT <span className="text-accent">AI</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm font-semibold sm:inline">{user.name}</span>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <nav aria-label="Area atleta" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-3">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-base font-semibold">
                {label}
              </Link>
            ))}
          </nav>
        </header>
      }
    >
      {children}
    </AthleteFrame>
  );
}
