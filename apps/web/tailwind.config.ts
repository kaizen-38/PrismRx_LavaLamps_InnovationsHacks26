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
        // ── Surfaces (Paperlight Archive) ──────────────────────────────────
        canvas:  '#FAFAF7',
        page:    '#F6F8FB',
        surface: '#FFFFFF',
        soft:    '#F3F6FB',
        'soft-2':'#EEF3F8',

        // ── Ink ────────────────────────────────────────────────────────────
        ink: {
          strong:  '#111827',
          body:    '#334155',
          muted:   '#64748B',
          faint:   '#94A3B8',
        },

        // ── Lines ──────────────────────────────────────────────────────────
        line: {
          soft:   '#E7EDF5',
          mid:    '#D6E0EB',
          strong: '#C6D4E1',
        },

        // ── Accent ─────────────────────────────────────────────────────────
        accent: {
          blue:      '#2B50FF',
          'blue-d':  '#1D4ED8',
          'blue-s':  '#ECF1FF',
          teal:      '#0F766E',
          'teal-s':  '#EAF8F4',
          amber:     '#B45309',
          'amber-s': '#FFF6E8',
          coral:     '#C2410C',
          'coral-s': '#FFF1EB',
          rose:      '#BE123C',
          'rose-s':  '#FFF0F4',
        },
      },

      fontFamily: {
        sans:  ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        mono:  ['var(--font-ibm-plex-mono)', 'SF Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        'display-xl': ['88px', { lineHeight: '0.96', letterSpacing: '-0.045em', fontWeight: '600' }],
        'display-l':  ['72px', { lineHeight: '0.98', letterSpacing: '-0.04em',  fontWeight: '600' }],
        'h1':         ['56px', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '600' }],
        'h2':         ['40px', { lineHeight: '1.08', letterSpacing: '-0.03em',  fontWeight: '600' }],
        'h3':         ['30px', { lineHeight: '1.14', letterSpacing: '-0.02em',  fontWeight: '600' }],
        'h4':         ['24px', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '600' }],
        'body-l':     ['19px', { lineHeight: '1.55', letterSpacing: '-0.01em',  fontWeight: '400' }],
        'body':       ['17px', { lineHeight: '1.6',  letterSpacing: '-0.011em', fontWeight: '400' }],
        'body-s':     ['15px', { lineHeight: '1.55', letterSpacing: '-0.008em', fontWeight: '400' }],
        'label':      ['13px', { lineHeight: '1.35', letterSpacing: '0.02em',   fontWeight: '600' }],
        'mono-meta':  ['12px', { lineHeight: '1.35', letterSpacing: '0.02em',   fontWeight: '500' }],
      },

      boxShadow: {
        xs: '0 4px 14px rgba(15, 23, 42, 0.04)',
        sm: '0 8px 24px rgba(15, 23, 42, 0.06)',
        md: '0 20px 50px rgba(15, 23, 42, 0.09)',
        lg: '0 32px 80px rgba(15, 23, 42, 0.10)',
      },

      borderRadius: {
        card:  '20px',
        modal: '28px',
        input: '14px',
      },

      maxWidth: {
        reading: '68ch',
        content: '1280px',
        dense:   '1360px',
        page:    '1440px',
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
    },
  },
  plugins: [],
}

export default config
