/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        krypta: {
          // ========== NÚCLEO (roxo/violeta - uso principal) ==========
          purple:   '#6131C9',   // violeta vibrante (linha 4)
          violet:   '#51008D',   // violeta profundo (linha 4)
          magenta:  '#540089',   // magenta profundo (linha 5)
          dark:     '#2E0853',   // roxo escuro (linha 4)
          deep:     '#1a0533',   // roxo mais escuro (base)
          indigo:   '#242356',   // índigo profundo (linha 2)
          navy:     '#323267',   // navy azulado (linha 2)
          
          // ========== TONS CLAROS (lilás) ==========
          lilac:    '#B4A0C8',   // lilás médio (linha 4)
          lavender: '#D0CCE4',   // lavanda clara (linha 5)
          pale:     '#C8BFD4',   // roxo pálido (linha 4)
          
          // ========== PLASMA/GLOW (violeta claro para brilho) ==========
          plasma:   '#8B87D2',   // plasma azul-violeta (linha 2)
          glow:     '#C0C8E8',   // brilho pálido (linha 2)
          
          // ========== AZUIS (usar RARAMENTE - só detalhes) ==========
          blue:     '#3484AD',   // azul (linha 1)
          teal:     '#349FB6',   // teal (linha 1)
          cyan:     '#8BCBD4',   // teal claro (linha 1 - usado só em micro detalhes)
          
          // ========== BASE ==========
          black:    '#000000',
          white:    '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'glow':        '0 0 20px rgba(97, 49, 201, 0.55)',
        'glow-strong': '0 0 45px rgba(97, 49, 201, 0.95)',
        'glow-plasma': '0 0 24px rgba(139, 135, 210, 0.7)',
        'glow-violet': '0 0 28px rgba(81, 0, 141, 0.7)',
        'glow-inner':  'inset 0 0 30px rgba(97, 49, 201, 0.18)',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(97,49,201,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(97,49,201,0.07) 1px, transparent 1px)",
        'radial-purple': "radial-gradient(circle at 50% 0%, rgba(46,8,83,0.7) 0%, #000000 70%)",
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}