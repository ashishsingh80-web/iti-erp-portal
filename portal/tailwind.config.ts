import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101417",
        mist: "#f5f3ee",
        clay: "#d96a31",
        pine: "#0f766e",
        leaf: "#24533d"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-space)", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 50px rgba(16, 20, 23, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
