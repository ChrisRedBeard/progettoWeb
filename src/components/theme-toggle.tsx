"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold"
      aria-pressed={dark}
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
      }}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {dark ? "Tema chiaro" : "Tema scuro"}
    </button>
  );
}
