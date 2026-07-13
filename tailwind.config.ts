import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        clay: {
          pink: "#FFB4C6",
          "pink-soft": "#FFD6E0",
          mint: "#A8E6C9",
          "mint-soft": "#D3F5E3",
          sky: "#A0D8F1",
          "sky-soft": "#CFEEFB",
          butter: "#FFE39A",
          "butter-soft": "#FFF3C9",
          lavender: "#D4C1F9",
          glass: "#F7F5FB",
          base: "#EDEBF5",
          ink: "#3A3550",
        },
      },
      boxShadow: {
        // Outer inflated shadow — bikin elemen keliatan "ngambang" empuk
        clay: `
          8px 8px 16px rgba(163, 155, 190, 0.35),
          -8px -8px 16px rgba(255, 255, 255, 0.85),
          inset 1px 1px 2px rgba(255, 255, 255, 0.4)
        `,
        // Button state - lebih tegas biar keliatan "clickable"
        "clay-btn": `
          6px 6px 12px rgba(163, 155, 190, 0.4),
          -6px -6px 12px rgba(255, 255, 255, 0.9),
          inset 2px 2px 3px rgba(255, 255, 255, 0.6)
        `,
        // Pressed/active state - shadow-nya kebalik jadi inset, kesan "kepencet"
        "clay-pressed": `
          inset 6px 6px 12px rgba(163, 155, 190, 0.4),
          inset -6px -6px 12px rgba(255, 255, 255, 0.7)
        `,
        // Buat card gede, lebih soft & jauh
        "clay-lg": `
          14px 14px 28px rgba(163, 155, 190, 0.3),
          -14px -14px 28px rgba(255, 255, 255, 0.8),
          inset 2px 2px 4px rgba(255, 255, 255, 0.5)
        `,
        // Buat elemen kecil (icon badge, chip)
        "clay-sm": `
          4px 4px 8px rgba(163, 155, 190, 0.35),
          -4px -4px 8px rgba(255, 255, 255, 0.85)
        `,
      },
      borderRadius: {
        clay: "1.75rem",
        "clay-lg": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;