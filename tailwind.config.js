/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      colors: {
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'text-color': 'var(--text)',
      },
      backgroundColor: {
        'primary': 'var(--primary)',
      },
      textColor: {
        'primary': 'var(--primary)',
        'text-color': 'var(--text)',
      },
      borderColor: {
        'primary': 'var(--primary)',
      },
      ringColor: {
        'primary': 'var(--primary)',
      },
    },
  },
  plugins: [],
}