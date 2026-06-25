/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zinc: { 950: '#09090b' },
        // Marca
        violet: { DEFAULT: '#8b5cf6', 600: '#7c3aed', 400: '#a78bfa', 300: '#c4b5fd' },
        // Dorado — SOLO logros / metas / logo / Monedita
        gold: { DEFAULT: '#f5c84b', light: '#fde68a', dark: '#c79a3a' },
        // Sistema funcional
        income:  '#34d399',
        expense: '#fb7185',
        warning: '#fbbf24',
        // Superficies
        bg:    '#09090b',
        card:  '#18181b',
        card2: '#161619',
        'mn-border':      '#1f1f23',
        'mn-border-soft': '#27272a',
        // Plata (Monedita)
        silver: { light: '#f8f9fb', DEFAULT: '#d0d5dc', dark: '#9aa0ab', face: '#2b2f38' },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        num:  ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala levemente subida — cascadea en toda la app sin tocar JSX
        'xs':   ['0.8125rem', { lineHeight: '1.25rem' }],   // 13px (era 12px)
        'sm':   ['0.9375rem', { lineHeight: '1.5rem'  }],   // 15px (era 14px)
        'base': ['1rem',      { lineHeight: '1.625rem'}],   // 16px (sin cambio)
      },
      borderRadius: {
        mn:    '14px',
        'mn-lg': '18px',
        'mn-xl': '20px',
      },
      boxShadow: {
        card:         '0 1px 3px rgba(0,0,0,.4)',
        pop:          '0 18px 36px -12px rgba(0,0,0,.6)',
        'violet-glow':'0 10px 30px -8px rgba(124,58,237,.6)',
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
