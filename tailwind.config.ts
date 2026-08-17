import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FBF8F1",
        white: "#FFFEFA",
        ink: "#25312D",
        muted: "#68736E",
        line: "#DDD9CF",
        coral: { DEFAULT: "#B84D3A", dark: "#963D30", soft: "#F2D8D0" },
        moss: { DEFAULT: "#648571", dark: "#466655", soft: "#DCE7DF" },
        sky: { DEFAULT: "#769EAE", soft: "#DDE9ED" },
      },
      borderRadius: {
        field: "0.625rem",
        panel: "0.875rem",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
