/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#151714",
        paper: "#f7f7f2",
        mist: "#e7ece8",
        line: "#d7ddd7",
        pine: "#0f766e",
        flame: "#d64a2f",
        gold: "#b0831c",
        sky: "#2f6fbd"
      }
    }
  },
  plugins: []
};
