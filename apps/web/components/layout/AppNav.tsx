'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { spring } from '@/lib/motion/presets'

const NAV_TABS = [
  { href: '/workspace', label: 'Workspace' },
  { href: '/matrix',    label: 'Matrix'    },
  { href: '/simulate',  label: 'Simulator' },
  { href: '/radar',     label: 'Radar'     },
]

interface AppNavProps {
  payerCount: number
  drugCount:  number
}

export function AppNav({ payerCount, drugCount }: AppNavProps) {
  const pathname = usePathname()

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-between"
      style={{
        height: 52,
        padding: '0 1.5rem',
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(18px) saturate(150%)',
        WebkitBackdropFilter: 'blur(18px) saturate(150%)',
        borderBottom: '1px solid rgba(231,237,245,0.9)',
        boxShadow: '0 1px 8px rgba(15,23,42,0.05)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
          <polygon
            points="9,1.5 16.5,15.5 1.5,15.5"
            fill="none"
            stroke="url(#appnav-g)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="appnav-g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2B50FF" />
              <stop offset="100%" stopColor="#0F766E" />
            </linearGradient>
          </defs>
        </svg>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', letterSpacing: '-0.02em' }}>
          PrismRx
        </span>
      </Link>

      {/* Tabs */}
      <nav className="flex items-center gap-0.5">
        {NAV_TABS.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="relative px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors duration-150"
              style={{ color: active ? '#111827' : '#64748B', fontSize: 13 }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#374151' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#64748B' }}
            >
              {active && (
                <motion.div
                  layoutId="appnav-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#ECF1FF' }}
                  transition={spring.hover}
                />
              )}
              <span className="relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Dataset badge */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{ fontSize: 12, color: '#64748B' }}
      >
        <span
          style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: '#0F766E', flexShrink: 0,
          }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '-0.01em' }}>
          {payerCount} payers · {drugCount} drugs indexed
        </span>
      </div>
    </header>
  )
}
