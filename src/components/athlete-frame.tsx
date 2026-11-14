"use client";

import { usePathname } from "next/navigation";

export function AthleteFrame({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = pathname.startsWith("/train/") || /^\/workout\/[^/]+\/[^/]+$/.test(pathname);
  if (bare) return <div className="min-h-dvh bg-canvas">{children}</div>;

  return (
    <div className="min-h-dvh">
      {header}
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
