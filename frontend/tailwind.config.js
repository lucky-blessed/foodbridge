/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'fb-dark': '#1B3C2F',   // Forest Green
        'fb-light': '#4E937A',  // Sage Green
        'fb-coral': '#E97451',  // Orange/Coral
        'fb-mint': '#E0F2E9',   // Light Background
      }
    },
  },
  plugins: [],
}