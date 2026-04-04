import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── PrismRx Brand Palette ──────────────────────────────
        // Deep navy background family
        navy: {
          950: '#0a0f1e',  // page background
          900: '#0d1528',  // surface / card background
          800: '#111f38',  // elevated surface
          700: '#1e2d4d',  // border / divider
          600: '#2a3f6b',  // muted border
          500: '#3d5a8a',  // subtle text on dark
        },
        // Cyan — primary interactive / accent
        cyan: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',  // primary brand cyan
          600: '#0891b2',
          700: '#0e7490',
        },
        // Violet — secondary accent / highlights
        violet: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',  // primary brand violet
          700: '#6d28d9',
          800: '#5b21b6',
        },
        // Coverage status semantic colors
        status: {
          covered:     '#10b981',
          conditional: '#f59e0b',
          preferred:   '#3b82f6',
          nonpreferred:'#f97316',
          not_covered: '#ef4444',
          unclear:     '#6b7280',
        },
        // Friction severity colors
        friction: {
          low:    '#10b981',
          medium: '#f59e0b',
          high:   '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-navy': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='40' height='40' fill='none'/%3E%3Cpath d='M0 40V0H40' stroke='%231e2d4d' stroke-width='0.5'/%3E%3C/svg%3E\")",
        'glow-cyan': 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(6,182,212,0.15) 0%, transparent 70%)',
        'glow-violet': 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(124,58,237,0.1) 0%, transparent 70%)',
      },
      animation: {
        'fade-up':       'fadeUp 0.4s ease-out forwards',
        'fade-in':       'fadeIn 0.3s ease-out forwards',
        'slide-right':   'slideRight 0.35s cubic-bezier(0.32,0.72,0,1) forwards',
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':       'shimmer 1.8s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      boxShadow: {
        'glow-cyan':   '0 0 20px rgba(6,182,212,0.25)',
        'glow-violet': '0 0 20px rgba(124,58,237,0.25)',
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover':  '0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(6,182,212,0.1)',
      },
    },
  },
  plugins: [],
}

export default config
