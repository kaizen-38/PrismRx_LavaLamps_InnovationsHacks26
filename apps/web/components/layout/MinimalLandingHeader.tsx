'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function MinimalLandingHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50 pointer-events-none"
    >
      <div
        className="pointer-events-auto mx-auto flex items-center justify-between transition-all duration-300"
        style={{
          maxWidth: 1280,
          padding: scrolled ? '0.75rem 1.5rem' : '1rem 1.5rem',
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(18px) saturate(150%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(150%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(231,237,245,0.8)' : '1px solid transparent',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polygon
              points="9,1.5 16.5,15.5 1.5,15.5"
              fill="none"
              stroke="url(#mlh-g)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="mlh-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2B50FF" />
                <stop offset="100%" stopColor="#0F766E" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.02em' }}>
            PrismRx
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/matrix">
            <span
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
              style={{ color: '#64748B', fontSize: 13 }}
            >
              See coverage matrix
            </span>
          </Link>
          <Link href="/workspace">
            <motion.span
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white cursor-pointer"
              style={{ background: '#2B50FF', fontSize: 13 }}
              whileHover={{ background: '#1D4ED8' }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              Open workspace
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.span>
          </Link>
        </div>
      </div>
    </motion.header>
  )
}
