"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { assignmentRefreshMs } from "@/lib/storage/limits";

export function RefreshAssignment() {
  const router = useRouter();
  useEffect(() => {
    const tick = () => router.refresh();
    const id = window.setInterval(tick, assignmentRefreshMs);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, [router]);
  return null;
}
