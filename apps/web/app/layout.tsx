import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import NavBar from '@/components/nav-bar'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PrismRx — Coverage Intelligence',
  description:
    'Turn fragmented medical-benefit drug policies into a searchable, comparable, and explainable workspace.',
  keywords: ['drug policy', 'prior authorization', 'payer coverage', 'medical benefit', 'formulary'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-navy-950 text-slate-100 font-sans antialiased">
        <Providers>
          <NavBar />
          <main>{children}</main>
          <footer className="mt-24 border-t border-navy-700 py-8">
            <div className="mx-auto max-w-screen-2xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
              <span>© 2026 PrismRx · Innovation Hacks 2026 · Anton RX Track</span>
              <span className="font-mono">Public payer documents · Synthetic cases only · No PHI</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
