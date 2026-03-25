/** @type {import('tailwindcss').Config} */
// export default {
//   content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
//   theme: {
//     extend: {
//       colors: {
//         'fb-dark': '#1B3C2F',   // Forest Green
//         'fb-light': '#4E937A',  // Sage Green
//         'fb-coral': '#E97451',  // Orange/Coral
//         'fb-mint': '#E0F2E9',   // Light Background
//       }
//     },
//   },
//   plugins: [],
// }
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Matches the "FoodBridge" brand identity in your screenshots
        'fb-dark': '#1B4332',   // Deep Forest Green
        'fb-mid': '#2D6A4F',    // Mid Green
        'fb-leaf': '#40916C',   // Leaf Green
        'fb-coral': '#E76F51',  // Action Orange
        'fb-mint': '#D8F3DC',   // Light Mint Background
        'fb-pale': '#F0FAF4',   // Softest Background
      },
      fontFamily: {
        // Based on the 'DM Sans' used in your HTML prototype
        'sans': ['DM Sans', 'sans-serif'],
      }
    },
  },
  plugins: [],
}