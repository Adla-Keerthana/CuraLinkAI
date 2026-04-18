/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0070f3",
          hover: "#0056b3",
        },
        secondary: "#7928ca",
      },
    },
  },
  plugins: [],
}
