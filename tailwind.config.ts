import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coral: "#FF9A8B",
        peach: "#FFC3A0",
        blueGray: "#7F9FB5",
        navy: "#1E3A5F",
        background: "#F8F9FA",
        textDark: "#2C3E50",
        textLight: "#6C757D",
        surfaceDark: "#0b1220",
        cardDark: "#111827",
        borderDark: "#1f2937",
      },
      backgroundImage: {
        'nyxion-gradient': 'linear-gradient(135deg, #FF9A8B 0%, #FFC3A0 50%, #7F9FB5 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255, 154, 139, 0.1) 0%, rgba(255, 195, 160, 0.1) 100%)',
      },
    },
  },
  plugins: [],
};
export default config;
