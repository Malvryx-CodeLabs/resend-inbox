/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#f8fafc",
        paper: "#000000",
        mist: "#18181b",
        line: "#27272a",
        pine: "#2dd4bf",
        flame: "#fb7185",
        gold: "#fbbf24",
        sky: "#60a5fa"
      }
    }
  },
  plugins: []
};
