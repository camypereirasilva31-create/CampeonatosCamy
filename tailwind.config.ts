import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0B1E3F",
          light: "#132B57",
          dark: "#071429",
        },
        royal: {
          DEFAULT: "#2B4FE0",
          light: "#4C6BF0",
          dark: "#1D38A8",
        },
        steel: {
          50: "#F5F6F8",
          100: "#E8EAEE",
          200: "#D3D7DE",
          400: "#8D95A5",
          600: "#5B6472",
          800: "#333A46",
        },
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
