/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        krypta: {
          // Base (muda com o tema)
          black:        'rgb(var(--krypta-bg) / <alpha-value>)',
          white:        'rgb(var(--krypta-fg) / <alpha-value>)',
          
          // Acentos (variam levemente por tema)
          purple:       'rgb(var(--krypta-purple) / <alpha-value>)',
          'purple-bright': 'rgb(var(--krypta-purple-bright) / <alpha-value>)',
          lilac:        'rgb(var(--krypta-lilac) / <alpha-value>)',
          violet:       'rgb(var(--krypta-violet) / <alpha-value>)',
          magenta:      'rgb(var(--krypta-magenta) / <alpha-value>)',
          cyan:         'rgb(var(--krypta-cyan) / <alpha-value>)',
          dark:         'rgb(var(--krypta-dark) / <alpha-value>)',
          deep:         'rgb(var(--krypta-deep) / <alpha-value>)',
          plasma:       'rgb(var(--krypta-plasma) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'glow':        '0 0 20px rgba(var(--krypta-purple) / 0.5)',
        'glow-strong': '0 0 45px rgba(var(--krypta-purple) / 0.9)',
        'glow-plasma': '0 0 24px rgba(var(--krypta-plasma) / 0.7)',
        'glow-cyan':   '0 0 20px rgba(var(--krypta-cyan) / 0.6)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(var(--krypta-purple) / 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--krypta-purple) / 0.07) 1px, transparent 1px)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}