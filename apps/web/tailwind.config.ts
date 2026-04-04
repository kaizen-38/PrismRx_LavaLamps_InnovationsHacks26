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
        // ── Midnight Archive Surfaces ──────────────────────────────────────
        surface: {
          bg:      '#070B11',
          raised:  '#0B111A',
          panel:   '#101826',
          panel2:  '#131D2D',
          panel3:  '#172335',
        },
        // ── Legacy navy (keep for compat with existing components) ─────────
        navy: {
          950: '#070B11',
          900: '#0B111A',
          800: '#101826',
          700: '#172335',
          600: '#1E2D45',
          500: '#2A3F5F',
        },
        // ── Accent colors ──────────────────────────────────────────────────
        prism: {
          cyan:   '#5BE7FF',
          violet: '#8F7CFF',
          gold:   '#FFCB7A',
          mint:   '#62E7B7',
          amber:  '#FFC062',
          coral:  '#FF7D72',
          ice:    '#C4F4FF',
        },
        // ── Coverage semantic status ───────────────────────────────────────
        status: {
          covered:     '#62E7B7',  // mint
          conditional: '#FFC062',  // amber
          preferred:   '#5BE7FF',  // cyan
          nonpreferred:'#FF7D72',  // coral
          not_covered: '#FF7D72',  // coral
          unclear:     '#7C8DA6',  // muted
        },
        friction: {
          low:    '#62E7B7',
          medium: '#FFC062',
          high:   '#FF7D72',
        },
      },

      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono:  ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      backgroundImage: {
        // Fine grid overlay
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 48V0H48' stroke='%23172335' stroke-width='0.4'/%3E%3C/svg%3E\")",
        // Radial glows
        'glow-cyan-top': 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,231,255,0.12) 0%, transparent 70%)',
        'glow-violet-bottom': 'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(143,124,255,0.1) 0%, transparent 70%)',
        'glow-gold-center': 'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(255,203,122,0.06) 0%, transparent 60%)',
        // Hero gradient mesh
        'hero-gradient': 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(91,231,255,0.08) 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(143,124,255,0.08) 0%, transparent 50%)',
      },

      animation: {
        'fade-up':      'fadeUp 0.4s ease-out forwards',
        'fade-in':      'fadeIn 0.3s ease-out forwards',
        'float-slow':   'floatSlow 6s ease-in-out infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'pulse-glow':   'pulseGlow 3s ease-in-out infinite',
        'shimmer':      'shimmer 1.8s linear infinite',
      },

      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },

      boxShadow: {
        'glow-cyan':   '0 0 24px rgba(91,231,255,0.25), 0 0 48px rgba(91,231,255,0.08)',
        'glow-violet': '0 0 24px rgba(143,124,255,0.22), 0 0 48px rgba(143,124,255,0.08)',
        'card':        '0 1px 2px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.4)',
        'card-hover':  '0 2px 4px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.5)',
        'card-doc':    '0 2px 8px rgba(0,0,0,0.6), 4px 4px 0 0 rgba(164,183,211,0.04), 8px 8px 0 0 rgba(164,183,211,0.02)',
      },

      borderRadius: {
        '4xl': '2rem',
      },

      letterSpacing: {
        tightest: '-0.02em',
        editorial: '-0.01em',
      },
    },
  },
  plugins: [],
}

export default config
