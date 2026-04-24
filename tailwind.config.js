/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🏰 Medieval Dark Souls Palette
        parchment: {
          DEFAULT: '#f5e6c8',
          dark: '#d4c4a0',
        },
        gold: {
          DEFAULT: '#c9a227',
          light: '#e6c86a',
        },
        bronze: '#8b7355',
        blood: '#8b2635',
        forest: {
          DEFAULT: '#2d4a3e',
          dark: '#1a2e26',
        },
        stone: {
          DEFAULT: '#4a4a4a',
          light: '#6a6a6a',
        },
        midnight: {
          DEFAULT: '#1a1625',
          light: '#2a2535',
        },
        // Legacy colors (keeping for compatibility)
        primary: {
          DEFAULT: '#c9a227',
          dark: '#8b7355',
        },
        'bg-dark': '#1a1625',
        surface: {
          DEFAULT: '#2a2535',
          light: '#3a3545',
        },
        text: {
          DEFAULT: '#f5e6c8',
          muted: '#a09070',
        },
        success: '#2d4a3e',
        danger: '#8b2635',
        warning: '#c9a227',
        xp: '#e6c86a',
      },
      fontFamily: {
        medieval: ['Cinzel', 'Georgia', 'serif'],
        parchment: ['Crimson Text', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
