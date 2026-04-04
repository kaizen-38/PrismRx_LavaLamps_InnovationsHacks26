import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { FloatingNav } from '@/components/layout/FloatingNav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'PrismRx — Policy Intelligence for Medical Benefit Drugs',
  description:
    'Turn fragmented payer policies into structured coverage intelligence. Compare criteria, inspect evidence, and spot policy drift.',
  keywords: ['drug policy', 'prior authorization', 'payer coverage', 'medical benefit', 'formulary', 'coverage matrix'],
  openGraph: {
    title: 'PrismRx — Policy Intelligence',
    description: 'Coverage is written in fragments. PrismRx turns it into signal.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmMono.variable} dark`} suppressHydrationWarning>
      <body
        className="min-h-screen font-sans antialiased"
        style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
      >
        <FloatingNav />
        <main>{children}</main>
        <footer
          className="mt-24 py-8"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div
            className="mx-auto max-w-screen-xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
          >
            <span>© 2026 PrismRx · Innovation Hacks 2.0 · LavaLamps Team</span>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
              Public payer documents · Synthetic cases only · No PHI
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
