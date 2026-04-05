import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas:  '#F5F8FB',
        page:    '#EEF4F8',
        surface: '#FFFFFF',
        soft:    '#F7FAFC',
        'soft-2':'#EDF3F9',

        ink: {
          strong:  '#162033',
          body:    '#334155',
          muted:   '#60758C',
          faint:   '#8EA1B5',
        },

        line: {
          soft:   '#DDE6EF',
          mid:    '#CAD7E4',
          strong: '#B6C6D5',
        },

        accent: {
          cyan:      '#06B6D4',
          'cyan-d':  '#0891B2',
          'cyan-s':  '#ECFEFF',
          mint:      '#10B981',
          'mint-s':  '#ECFDF5',
          amber:     '#D97706',
          'amber-s': '#FFF7ED',
          coral:     '#EF4444',
          'coral-s': '#FFF1F2',
          violet:    '#7C3AED',
          'violet-s':'#F5F3FF',
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
