'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutGrid, FlaskConical, Radio, LogIn, LogOut, User } from 'lucide-react'
import { spring } from '@/lib/motion/presets'

const NAV_LINKS = [
  { href: '/matrix',   label: 'Matrix',       icon: LayoutGrid   },
  { href: '/simulate', label: 'Simulator',     icon: FlaskConical },
  { href: '/radar',    label: 'Change Radar',  icon: Radio        },
]

interface AuthUser {
  name?: string
  email?: string
  picture?: string
}

function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}

export function FloatingNav() {
  const pathname        = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const { user, loading } = useAuth()

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

        {/* Auth section */}
        {!loading && (
          user ? (
            <div className="flex items-center gap-1">
              {/* User avatar / name */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 9999,
                  fontSize: 12, color: '#334155',
                }}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name ?? 'User'}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1px solid #E7EDF5' }}
                  />
                ) : (
                  <User className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                )}
                <span className="hidden sm:block" style={{ fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name?.split(' ')[0] ?? user.email}
                </span>
              </div>
              <a
                href="/api/auth/logout"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 9999,
                  fontSize: 12, fontWeight: 500,
                  color: '#64748B',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111827'; (e.currentTarget as HTMLElement).style.background = '#F3F6FB' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:block">Sign out</span>
              </a>
            </div>
          ) : (
            <a
              href="/api/auth/login"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 16px', borderRadius: 9999,
                background: '#2B50FF',
                fontSize: 13, fontWeight: 600, color: '#FFFFFF',
                textDecoration: 'none', letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1D4ED8'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#2B50FF'}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in
            </a>
          )
        )}
      </nav>
    </motion.header>
  )
}
