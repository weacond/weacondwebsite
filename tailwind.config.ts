import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          gray: "#86868b",
          dark: "#1d1d1f",
          blue: "#0071e3",
        },
      },
    },
  },
  plugins: [],
};
export default config;
