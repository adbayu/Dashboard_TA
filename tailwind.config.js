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
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ...tokenColors,

        // Alias sementara untuk halaman lama — hapus di Task 14.
        // Nama warna lama (Material 3) yang masih dipakai di src/ dipetakan ke
        // token semantik terdekat supaya halaman yang belum dimigrasi tetap
        // berwarna dan ikut berganti tema. Nama lama yang tak lagi dipakai
        // sudah dihapus.
        "on-surface": cssVar("text"),
        "on-surface-variant": cssVar("text-2"),
        "outline-variant": cssVar("border"),
        outline: cssVar("text-2"),
        "surface-container-lowest": cssVar("surface"),
        "surface-container-low": cssVar("surface-2"),
        "surface-container": cssVar("surface-2"),
        "surface-container-high": cssVar("surface-2"),
        "surface-container-highest": cssVar("surface-2"),
        "surface-variant": cssVar("surface-2"),
        background: cssVar("bg"),
        "inverse-primary": cssVar("primary"),
        "primary-fixed-dim": cssVar("primary"),
        secondary: cssVar("chart-1"),
        tertiary: cssVar("water-fg"),
        error: cssVar("bad-fg"),
        // Dipakai di panel gelap (sidebar, Masuk, Daftar): primary terlalu gelap
        // di mode terang, jadi dipetakan ke teks aktif sidebar yang selalu terang.
        "emerald-accent": cssVar("side-active-text"),
        "emerald-glow": cssVar("primary"),
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

        // Alias sementara untuk halaman lama — hapus di Task 14.
        headline: ["var(--font-head)"],
        "headline-xl": ["var(--font-head)"],
        "headline-lg": ["var(--font-head)"],
        "headline-md": ["var(--font-head)"],
        "body-lg": ["var(--font-body)"],
        "body-md": ["var(--font-body)"],
        "label-md": ["var(--font-body)"],
        "label-sm": ["var(--font-body)"],
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
      boxShadow: {
        glass: "0 8px 32px 0 rgba(15, 82, 56, 0.06)",
        "glass-elevated": "0 12px 40px 0 rgba(15, 82, 56, 0.12)",
        // Alias sementara untuk halaman lama — hapus di Task 14.
        // Masih dipakai di ui.jsx (shadow-emerald-glow); kini berbasis token primary.
        "emerald-glow": "0 4px 20px rgb(var(--c-primary) / 0.35)",
      },
    },
  },
  plugins: [],
}
