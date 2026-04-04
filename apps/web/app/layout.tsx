import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

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
        {/* Top nav — minimal, keeps focus on content */}
        <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-950/80 backdrop-blur-md">
          <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-white">Prism</span>
                <span className="text-cyan-500">Rx</span>
              </span>
              <span className="hidden sm:block text-xs font-mono text-slate-500 border border-navy-700 rounded px-1.5 py-0.5">
                Coverage Intelligence
              </span>
            </a>

            <nav className="flex items-center gap-1">
              <NavLink href="/matrix">Matrix</NavLink>
              <NavLink href="/simulate">Simulator</NavLink>
              <NavLink href="/radar">Change Radar</NavLink>
            </nav>

            <div className="flex items-center gap-3">
              {/* Compliance pill */}
              <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 border border-navy-700 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Public data · Synthetic cases
              </span>
            </div>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-24 border-t border-navy-700 py-8">
          <div className="mx-auto max-w-screen-2xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <span>
              © 2026 PrismRx · Innovation Hacks 2026 · Anton RX Track
            </span>
            <span className="font-mono">
              Public payer documents · Synthetic cases only · No PHI
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}

function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-navy-800 transition-colors duration-150"
    >
      {children}
    </a>
  )
}
