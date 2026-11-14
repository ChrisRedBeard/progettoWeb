import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        ink: "var(--ink)",
        panel: "var(--panel)",
        line: "var(--line)",
        muted: "var(--muted)",
        accent: "var(--accent)",
      },
    },
  },
  plugins: [],
};

export default config;
