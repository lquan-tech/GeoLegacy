/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "#f8fafc",
          raised: "rgba(255, 255, 255, 0.82)",
          subtle: "rgba(15, 23, 42, 0.06)",
        },
        accent: {
          cyan: "#0891b2",
          fuchsia: "#c026d3",
        },
      },
      boxShadow: {
        glow: "0 0 18px rgba(8, 145, 178, 0.18)",
        panel: "0 18px 56px rgba(15, 23, 42, 0.16)",
      },
    },
  },
  plugins: [],
};
