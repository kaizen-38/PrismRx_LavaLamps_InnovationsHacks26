'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — NavBar
// Adaptive: light on landing (/), dark on all app pages.
// Compare is contextual (launched from matrix/policy), not a primary nav item.
// Open-by-default: all links public. Auth gates actions only.
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

  const isLanding = pathname === '/'
  const dark = !isLanding

  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
      dark
        ? 'border-navy-700 bg-navy-950/90'
        : 'border-line-soft bg-surface/80'
    }`}>
      <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center justify-between">

        {/* Brand */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight">
            <span className={dark ? 'text-white' : 'text-ink-strong'}>Prism</span>
            <span className="text-cyan-500">Rx</span>
          </span>
          <span className={`hidden sm:block text-xs font-mono rounded px-1.5 py-0.5 border ${
            dark ? 'text-slate-500 border-navy-700' : 'text-ink-muted border-line-mid'
          }`}>
            Coverage Intelligence
          </span>
        </a>

        {/* Primary nav — Matrix, Simulator, Change Radar, Sources.
            Compare is contextual (launched from matrix cells), not top-level. */}
        <nav className="flex items-center gap-1">
          <NavLink href="/matrix"   active={pathname === '/matrix'}                         dark={dark}>Matrix</NavLink>
          <NavLink href="/simulate" active={pathname?.startsWith('/simulate') ?? false}     dark={dark}>Simulator</NavLink>
          <NavLink href="/changes"  active={pathname === '/changes' || pathname === '/radar'} dark={dark}>Change Radar</NavLink>
          <NavLink href="/sources"  active={pathname === '/sources'}                        dark={dark}>Sources</NavLink>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <div className="w-20 h-7 rounded-lg shimmer" />
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(v => !v)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  dark
                    ? 'border-navy-600 bg-navy-800 hover:bg-navy-700 text-slate-200'
                    : 'border-line-mid bg-soft hover:bg-soft-2 text-ink-body'
                }`}
              >
                <RoleDot role={user.role} />
                <span className="capitalize">{user.role}</span>
                <svg className={`w-3 h-3 ${dark ? 'text-slate-500' : 'text-ink-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showRoleMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowRoleMenu(false)} />
                  <div className="absolute right-0 mt-1.5 z-40 w-56 rounded-xl border border-navy-700 bg-navy-900 shadow-xl overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-navy-700">
                      <p className="text-xs font-semibold text-slate-300">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    {!ENABLE_AUTH && (
                      <>
                        <p className="px-3 pt-2 pb-1 text-[10px] text-slate-600 uppercase tracking-wider">Switch demo role</p>
                        {(['analyst', 'coordinator'] as UserRole[]).map(role => (
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
                        <div className="border-t border-navy-700" />
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
            <a
              href="/login"
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                dark
                  ? 'border-cyan-700/60 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400'
                  : 'border-accent-blue/30 bg-accent-blue-s hover:bg-blue-100 text-accent-blue'
              }`}
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

function NavLink({ href, active, dark, children }: { href: string; active?: boolean; dark: boolean; children: React.ReactNode }) {
  if (dark) {
    return (
      <a
        href={href}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
          active ? 'text-slate-100 bg-navy-800' : 'text-slate-400 hover:text-slate-100 hover:bg-navy-800'
        }`}
      >
        {children}
      </a>
    )
  }
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 ${
        active ? 'text-ink-strong bg-soft' : 'text-ink-muted hover:text-ink-strong hover:bg-soft'
      }`}
    >
      {children}
    </a>
  )
}

function RoleDot({ role }: { role: UserRole }) {
  const color = role === 'coordinator' ? 'bg-violet-400' : role === 'analyst' ? 'bg-cyan-400' : 'bg-slate-500'
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
}
