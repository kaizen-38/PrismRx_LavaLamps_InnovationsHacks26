'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — NavBar
// Sticky top nav with brand, nav links, and auth section (Sign in / role pill).
// Extracted from layout.tsx so it can be a client component with auth state.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/auth0'
import { ENABLE_AUTH } from '@/lib/auth0'

export default function NavBar() {
  const pathname = usePathname()
  const { user, loading, demoLogin, logout } = useAuth()
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Prism</span>
            <span className="text-cyan-500">Rx</span>
          </span>
          <span className="hidden sm:block text-xs font-mono text-slate-500 border border-navy-700 rounded px-1.5 py-0.5">
            Coverage Intelligence
          </span>
        </a>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink href="/matrix" active={pathname === '/matrix'}>
            Matrix
          </NavLink>
          <NavLink href="/simulate" active={pathname?.startsWith('/simulate')} locked={!user || !canUse(user?.role, 'simulate')}>
            Simulator
          </NavLink>
          <NavLink href="/radar" active={pathname?.startsWith('/radar')} locked={!user || !canUse(user?.role, 'radar')}>
            Change Radar
          </NavLink>
        </nav>

        {/* Auth section */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Compliance pill — hidden when user is logged in to save space */}
          {!user && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 border border-navy-700 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Public data · Synthetic cases
            </span>
          )}

          {loading ? (
            <div className="w-20 h-7 rounded-lg shimmer" />
          ) : user ? (
            /* Role pill + logout */
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-navy-600 bg-navy-800 hover:bg-navy-700 px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <RoleDot role={user.role} />
                <span className="text-slate-200 capitalize">{user.role}</span>
                <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showRoleMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowRoleMenu(false)} />
                  <div className="absolute right-0 mt-1.5 z-40 w-52 rounded-xl border border-navy-700 bg-navy-900 shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-navy-700">
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    {/* Demo mode: role switcher */}
                    {!ENABLE_AUTH && (
                      <>
                        <p className="px-3 pt-2 text-[10px] text-slate-600 uppercase tracking-wider">Switch demo role</p>
                        {(['analyst', 'coordinator'] as UserRole[]).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => { demoLogin(role); setShowRoleMenu(false) }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-navy-800 ${
                              user.role === role ? 'text-cyan-400' : 'text-slate-400'
                            }`}
                          >
                            <RoleDot role={role} />
                            <span className="capitalize">{role}</span>
                            {user.role === role && <span className="ml-auto text-[10px] text-cyan-600">active</span>}
                          </button>
                        ))}
                        <div className="border-t border-navy-700 mt-1" />
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => { logout(); setShowRoleMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-navy-800 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Sign in button */
            <a
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-700/60 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

// ── NavLink ───────────────────────────────────────────────────────────────────

function NavLink({
  href,
  active,
  locked,
  children,
}: {
  href: string
  active?: boolean
  locked?: boolean
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
        active
          ? 'text-slate-100 bg-navy-800'
          : 'text-slate-400 hover:text-slate-100 hover:bg-navy-800'
      }`}
    >
      {children}
      {locked && <LockIcon />}
    </a>
  )
}

// ── Role indicator dot ────────────────────────────────────────────────────────

function RoleDot({ role }: { role: UserRole }) {
  const color =
    role === 'coordinator'
      ? 'bg-violet-400'
      : role === 'analyst'
      ? 'bg-cyan-400'
      : 'bg-slate-500'
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
}

// ── Lock icon ─────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg className="w-3 h-3 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function canUse(role: UserRole | undefined, capability: string): boolean {
  if (!role) return false
  const ROLE_CAPS: Record<UserRole, string[]> = {
    guest:       [],
    analyst:     ['matrix', 'radar', 'export'],
    coordinator: ['matrix', 'radar', 'export', 'simulate', 'voice', 'cases'],
  }
  return ROLE_CAPS[role]?.includes(capability) ?? false
}
