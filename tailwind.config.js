import { readFileSync } from "node:fs";

// Warna dibangun dari design/tokens.json (sumber tunggal 39 token). Nilainya
// dibaca dari variable CSS `--c-<nama>` (triplet RGB) yang diisi per tema di
// src/app/styles/themes.css, sehingga modifier opacity Tailwind
// (mis. border-border/40) tetap bekerja. JANGAN kembalikan ke hex statis.
const tokens = JSON.parse(
  readFileSync(new URL("./design/tokens.json", import.meta.url), "utf8"),
);

const cssVar = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

const tokenColors = Object.fromEntries(
  tokens.color.tokens.map(({ name }) => [name, cssVar(name)]),
);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // Mode terang/gelap dibaca dari data-mode di <html> (themePreference.js).
  darkMode: ["selector", '[data-mode="dark"]'],
  theme: {
    extend: {
      colors: {
        ...tokenColors,
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        sm: "0.25rem",
        md: "0.75rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
        card: "var(--radius-card)",
        control: "var(--radius-control)",
        pill: "var(--radius-pill)",
      },
      spacing: {
        xs: "4px",
        base: "8px",
        sm: "12px",
        md: "24px",
        gutter: "24px",
        lg: "48px",
        xl: "80px",
        "margin-mobile": "16px",
        "margin-desktop": "32px",
      },
      fontFamily: {
        head: ["var(--font-head)"],
        body: ["var(--font-body)"],
        num: ["var(--font-num)"],
      },
      fontSize: {
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
}
