/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aviation: {
          navy: '#0b132b',
          charcoal: '#1c2541',
          blue: '#3a506b',
          lightBlue: '#5bc0be',
          warning: '#f4a261',
          critical: '#e76f51',
          healthy: '#2a9d8f'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
