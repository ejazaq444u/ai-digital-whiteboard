/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        student: ['"Patrick Hand"', '"Kalam"', 'cursive'],
        classroom: ['"Caveat"', 'cursive'],
        cursive: ['"Cedarville Cursive"', 'cursive'],
        print: ['"Architects Daughter"', 'cursive'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        board: {
          bg: '#1a1f2c',
          dark: '#0f172a',
          grid: '#334155',
          panel: '#1e293b',
          border: '#334155',
          accent: '#38bdf8'
        }
      }
    },
  },
  plugins: [],
}
