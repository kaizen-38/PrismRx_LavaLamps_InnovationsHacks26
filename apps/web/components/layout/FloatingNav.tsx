'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, FlaskConical, Radio, BookOpen, ChevronDown } from 'lucide-react'

const NAV_LINKS = [
  { href: '/matrix',   label: 'Matrix',      icon: LayoutGrid  },
  { href: '/simulate', label: 'Simulator',   icon: FlaskConical },
  { href: '/radar',    label: 'Change Radar', icon: Radio       },
]

export function FloatingNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4"
      style={{ pointerEvents: 'none' }}
    >
      <nav
        className="flex items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300"
        style={{
          pointerEvents: 'auto',
          background: scrolled
            ? 'rgba(11,17,26,0.88)'
            : 'rgba(11,17,26,0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(164,183,211,0.1)',
          boxShadow: scrolled
            ? '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)'
            : '0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-3 group">
          <div className="relative flex items-center">
            {/* Prism shape */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="flex-shrink-0">
              <polygon
                points="11,2 20,18 2,18"
                fill="none"
                stroke="url(#prism-grad)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <line x1="11" y1="2" x2="11" y2="18" stroke="rgba(91,231,255,0.3)" strokeWidth="0.8" />
              <line x1="2" y1="18" x2="20" y2="18" stroke="rgba(143,124,255,0.2)" strokeWidth="0.8" />
              <defs>
                <linearGradient id="prism-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5BE7FF" />
                  <stop offset="100%" stopColor="#8F7CFF" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight" style={{ color: '#E8EEF8' }}>
            Prism<span style={{ color: '#5BE7FF' }}>Rx</span>
          </span>
          <span
            className="hidden sm:block text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              color: '#7C8DA6',
              background: 'rgba(23,35,53,0.8)',
              border: '1px solid rgba(164,183,211,0.12)',
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '0.04em',
            }}
          >
            beta
          </span>
        </Link>

        {/* Separator */}
        <div className="w-px h-4 mx-1" style={{ background: 'rgba(164,183,211,0.12)' }} />

        {/* Nav links */}
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors duration-150"
              style={{
                color: active ? '#E8EEF8' : '#7C8DA6',
                background: active ? 'rgba(23,35,53,0.8)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = '#A6B4C8'
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = '#7C8DA6'
              }}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:block">{label}</span>
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'rgba(91,231,255,0.06)',
                    border: '1px solid rgba(91,231,255,0.15)',
                  }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                />
              )}
            </Link>
          )
        })}

        {/* Separator */}
        <div className="w-px h-4 mx-1" style={{ background: 'rgba(164,183,211,0.12)' }} />

        {/* Compliance pill */}
        <span
          className="hidden md:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-xl"
          style={{
            color: '#62E7B7',
            background: 'rgba(98,231,183,0.08)',
            border: '1px solid rgba(98,231,183,0.15)',
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#62E7B7] animate-pulse" />
          Public · Synthetic
        </span>
      </nav>
    </motion.header>
  )
}
