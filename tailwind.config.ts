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
        ec: {
          "dark-blue": "#2649A5",
          "light-blue": "#0050D2",
          mint: "#75E7BC",
          red: "#F75880",
          turquoise: "#7BD7DB",
          violet: "#AC78E0",
          yellow: "#FFCF31",
          "dark-green": "#005E47",
          "light-green": "#7BCA65",
          black: "#000000",
          "grey-80": "#3B3B3B",
          "grey-70": "#979797",
          "grey-60": "#CCCCCC",
          "grey-40": "#EEEEEE",
          "light-grey": "#F7F7F7",
          "medium-grey": "#E2E2E2",
          surface: "#FFFFFF",
          error: "#E02E2A",
          warning: "#EF6C00",
          info: "#0088D1",
          success: "#2F7D31",
        },
      },
      fontFamily: {
        barlow: ["Barlow", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      maxWidth: {
        content: "1304px",
      },
    },
  },
  plugins: [],
};
export default config;
