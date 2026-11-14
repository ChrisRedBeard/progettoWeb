import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-extrabold">
          FIT <span className="text-accent">AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold">
            Entra
          </Link>
          <Link href="/register" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-3 text-sm font-bold text-white">
            Registrati
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
