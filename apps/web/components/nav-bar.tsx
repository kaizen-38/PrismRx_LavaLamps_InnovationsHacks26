'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — NavBar
//
// Two header modes:
//  MarketingHeader  → landing page (/), /about
//  WorkspaceHeader  → all app pages (matrix, simulate, changes, compare, etc.)
//
// WorkspaceHeader is role-aware:
//  guest:       Matrix | Sources
//  coordinator: Matrix | Simulator | Sources
//  analyst:     Matrix | Change Radar | Sources
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/auth0'
import { ENABLE_AUTH } from '@/lib/auth0'

export default function NavBar() {
  const pathname = usePathname()
  const isMarketing = pathname === '/' || pathname === '/about'
  return isMarketing ? <MarketingHeader pathname={pathname} /> : <WorkspaceHeader pathname={pathname} />
}

// ── MarketingHeader ───────────────────────────────────────────────────────────

function MarketingHeader({ pathname }: { pathname: string }) {
  const { user } = useAuth()

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{ borderBottom: '1px solid var(--line-soft)', background: 'rgba(250,250,247,0.85)' }}
    >
      <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
            Prism<span className="text-cyan-500">Rx</span>
          </span>
        </a>

        {/* Center nav — marketing destinations */}
        <nav className="hidden md:flex items-center gap-1">
          <MktLink href="/matrix"  active={pathname === '/matrix'}>Coverage Matrix</MktLink>
          <MktLink href="/sources" active={pathname === '/sources'}>Sources</MktLink>
          <MktLink href="/about"   active={pathname === '/about'}>About</MktLink>
        </nav>

        {/* Right — sign in or account */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <a
              href="/matrix"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors"
              style={{ background: 'var(--accent-blue)', color: '#fff' }}
            >
              Open workspace →
            </a>
          ) : (
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors"
              style={{
                border: '1px solid var(--line-mid)',
                background: 'var(--bg-surface)',
                color: 'var(--ink-body)',
              }}
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

// ── WorkspaceHeader ───────────────────────────────────────────────────────────

function WorkspaceHeader({ pathname }: { pathname: string }) {
  const { user, loading, demoLogin, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  // Role-aware nav items
  const canSimulate = !loading && (user?.role === 'coordinator')
  const canChanges  = !loading && (user?.role === 'analyst' || user?.role === 'coordinator')

  return (
    <header className="sticky top-0 z-40 border-b border-navy-700 bg-navy-950/95 backdrop-blur-md">
      <div className="mx-auto max-w-screen-2xl px-6 h-14 flex items-center justify-between">

        {/* Brand */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-white">Prism</span>
            <span className="text-cyan-500">Rx</span>
          </span>
          <span className="hidden sm:block text-xs font-mono text-slate-500 border border-navy-700 rounded px-1.5 py-0.5">
            Coverage Intelligence
          </span>
        </a>

        {/* Role-aware nav */}
        <nav className="flex items-center gap-1">
          <WsLink href="/matrix"  active={pathname === '/matrix' || pathname?.startsWith('/policy') || pathname === '/compare'}>
            Matrix
          </WsLink>
          {canSimulate && (
            <WsLink href="/simulate" active={pathname?.startsWith('/simulate') ?? false}>
              Simulator
            </WsLink>
          )}
          {canChanges && (
            <WsLink href="/changes" active={pathname === '/changes' || pathname === '/radar'}>
              Change Radar
            </WsLink>
          )}
          <WsLink href="/sources" active={pathname === '/sources'}>
            Sources
          </WsLink>
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <div className="w-20 h-7 rounded-lg shimmer" />
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(v => !v)}
                className="flex items-center gap-2 rounded-lg border border-navy-600 bg-navy-800 hover:bg-navy-700 px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <RoleDot role={user.role} />
                <span className="text-slate-200 capitalize">{user.role}</span>
                <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
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
                            onClick={() => { demoLogin(role); setShowMenu(false) }}
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
                      onClick={() => { logout(); setShowMenu(false) }}
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
              className="flex items-center gap-1.5 rounded-lg border border-cyan-700/60 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-400 transition-colors"
            >
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Link components ───────────────────────────────────────────────────────────

function MktLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm transition-colors duration-150"
      style={{
        color: active ? 'var(--ink-strong)' : 'var(--ink-muted)',
        background: active ? 'var(--bg-soft)' : 'transparent',
        fontWeight: active ? 500 : 400,
      }}
    >
      {children}
    </a>
  )
}

function WsLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
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

function RoleDot({ role }: { role: UserRole }) {
  const color = role === 'coordinator' ? 'bg-violet-400' : role === 'analyst' ? 'bg-cyan-400' : 'bg-slate-500'
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
}
