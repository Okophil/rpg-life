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
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
        },
        'bg-dark': '#0f0f0f',
        surface: {
          DEFAULT: '#1a1a1a',
          light: '#262626',
        },
        text: {
          DEFAULT: '#f5f5f5',
          muted: '#a3a3a3',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        xp: '#fbbf24',
      },
    },
  },
  plugins: [],
}
