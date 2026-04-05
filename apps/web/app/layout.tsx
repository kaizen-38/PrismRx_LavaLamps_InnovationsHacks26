import type { Metadata } from 'next'
import { Inter, Newsreader, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import AppChrome from '@/components/layout/site-layouts'

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
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  )
}
