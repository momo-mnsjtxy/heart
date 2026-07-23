import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        mist: "var(--mist)",
        foam: "var(--foam)",
        teal: {
          DEFAULT: "var(--teal)",
          deep: "var(--teal-deep)",
          mid: "var(--teal-mid)",
          soft: "var(--teal-soft)",
        },
        sand: {
          DEFAULT: "var(--sand)",
          deep: "var(--sand-deep)",
        },
        crisis: {
          DEFAULT: "var(--crisis)",
          soft: "var(--crisis-soft)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
