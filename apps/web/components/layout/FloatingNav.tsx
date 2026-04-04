'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutGrid, ClipboardCheck, Radio } from 'lucide-react'
import { spring } from '@/lib/motion/presets'

const NAV_LINKS = [
  { href: '/matrix',   label: 'Coverage',    icon: LayoutGrid     },
  { href: '/simulate', label: 'Case Review', icon: ClipboardCheck },
  { href: '/radar',    label: 'Changes',     icon: Radio          },
]

export function FloatingNav() {
  const pathname  = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center pt-3 px-4 pointer-events-none"
    >
      <nav
        className="pointer-events-auto flex items-center gap-0.5 px-2 py-1.5 rounded-full transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(18px) saturate(150%)',
          WebkitBackdropFilter: 'blur(18px) saturate(150%)',
          border: `1px solid ${scrolled ? '#D6E0EB' : '#E7EDF5'}`,
          boxShadow: scrolled
            ? '0 8px 24px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.05)'
            : '0 4px 14px rgba(15,23,42,0.04)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 mr-1">
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
            <polygon
              points="9,1.5 16.5,15.5 1.5,15.5"
              fill="none"
              stroke="url(#pnav-g)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="pnav-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2B50FF" />
                <stop offset="100%" stopColor="#0F766E" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827', letterSpacing: '-0.02em' }}>
            PrismRx
          </span>
        </Link>

        {/* Divider */}
        <div className="h-4 w-px mx-1" style={{ background: '#E7EDF5' }} />

        {/* Nav links */}
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors duration-150"
              style={{ color: active ? '#111827' : '#64748B' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#111827' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#64748B' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#ECF1FF' }}
                  transition={spring.hover}
                />
              )}
              <Icon className="w-3.5 h-3.5 flex-shrink-0 relative z-10" />
              <span className="hidden sm:block relative z-10 font-medium" style={{ fontSize: 13 }}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Divider */}
        <div className="h-4 w-px mx-1" style={{ background: '#E7EDF5' }} />

        {/* CTA */}
        <Link href="/matrix">
          <motion.span
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-white cursor-pointer"
            style={{ background: '#2B50FF', fontSize: 13, letterSpacing: '-0.01em' }}
            whileHover={{ background: '#1D4ED8' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.16 }}
          >
            Open App
          </motion.span>
        </Link>
      </nav>
    </motion.header>
  )
}
