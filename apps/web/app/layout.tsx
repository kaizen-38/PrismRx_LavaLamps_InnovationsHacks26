import type { Metadata } from 'next'
import { Inter, Newsreader, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { FloatingNav } from '@/components/layout/FloatingNav'

// ── Fonts ──────────────────────────────────────────────────────────────────
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'PrismRx — Drug Coverage Intelligence',
  description:
    'Turn fragmented payer policies into structured coverage intelligence. Compare criteria, inspect evidence, trace citations, and track policy drift.',
  keywords: ['drug policy', 'prior authorization', 'payer coverage', 'medical benefit', 'formulary'],
  openGraph: {
    title: 'PrismRx — Drug Coverage Intelligence',
    description: 'Compare coverage. Inspect criteria. Trace evidence. All in one workspace.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        style={{
          fontFamily: 'var(--font-sans)',
          background: 'var(--bg-canvas)',
          color: 'var(--ink-strong)',
          fontSize: '17px',
          lineHeight: 1.6,
        }}
      >
        <FloatingNav />
        <main>{children}</main>

        <footer
          style={{
            borderTop: '1px solid var(--line-soft)',
            marginTop: '6rem',
            padding: '2.5rem 0',
            background: 'var(--bg-canvas)',
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '13px',
              color: 'var(--ink-muted)',
            }}
          >
            <span>© 2026 PrismRx. All rights reserved.</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              Public documents only · Synthetic cases · No PHI
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
