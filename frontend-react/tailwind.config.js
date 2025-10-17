/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#6366F1', 
          'dark': '#4F46E5',
          'light': '#EEF2FF',
        },
        'accent': {
          DEFAULT: '#14b8a6', // A vibrant, rich teal (Tailwind's teal-500)
          'dark': '#0d9488',   // A slightly darker shade for hover (Tailwind's teal-600)
        },
        // NEW: Light color for background swoosh effect
        'accent-light': '#f5f3ff', // A very light violet (Tailwind's violet-50)
        'slate': { 
          500: '#64748B',
          800: '#1E293B',
        },
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}