/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
    "./src/renderer/index.html",
    "./src/web/**/*.{js,ts,jsx,tsx}",
    "./src/web/index.html",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f8f9ff',
          100: '#e8ecff',
          500: '#667eea',
          600: '#5a6fd8',
          700: '#4c63d2',
        },
        secondary: {
          500: '#764ba2',
          600: '#6a4394',
        },
      },
    },
  },
  plugins: [],
}

