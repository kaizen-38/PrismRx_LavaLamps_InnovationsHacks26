'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Login page (light theme)
// Demo mode: role picker → localStorage. ENABLE_AUTH=true → Auth0 Universal Login.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ENABLE_AUTH } from '@/lib/auth0'
import type { UserRole } from '@/lib/auth0'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/matrix'
  const { user, demoLogin } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole>('coordinator')

  useEffect(() => {
    if (user) window.location.href = returnTo
  }, [user, returnTo])

  const handleLogin = () => {
    if (ENABLE_AUTH) {
      window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      return
    }
    demoLogin(selectedRole)
  }

  return (
    <div
      className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-1 text-3xl font-bold mb-2">
            <span style={{ color: 'var(--ink-strong)' }}>Prism</span>
            <span className="text-cyan-500">Rx</span>
          </a>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Coverage Intelligence Platform</p>
        </div>

        <div
          className="rounded-2xl p-8 space-y-5"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-mid)', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}
        >
          {/* Demo mode banner */}
          {!ENABLE_AUTH && (
            <div
              className="rounded-xl px-3 py-2.5 text-xs flex items-center gap-2"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
              <svg className="w-3.5 h-3.5 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Demo mode — choose a role to explore protected features.
            </div>
          )}

          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-strong)', marginBottom: 4 }}>Sign in</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
              Matrix and citations are always public.
              Sign in to access the Simulator (coordinator) or Change Radar (analyst).
            </p>
          </div>

          {/* Role selector — demo mode only */}
          {!ENABLE_AUTH && (
            <div className="space-y-2">
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select role
              </p>
              <RoleOption
                role="coordinator"
                label="Coordinator"
                description="Run PA simulations, voice briefs, and evidence packs."
                selected={selectedRole === 'coordinator'}
                onSelect={() => setSelectedRole('coordinator')}
              />
              <RoleOption
                role="analyst"
                label="Analyst"
                description="View Change Radar, friction exports, and admin tools."
                selected={selectedRole === 'analyst'}
                onSelect={() => setSelectedRole('analyst')}
              />
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
            style={{ background: 'var(--accent-blue)' }}
          >
            {ENABLE_AUTH ? (
              <>
                <Auth0Icon />
                Continue with Auth0
              </>
            ) : (
              <>
                <DemoIcon />
                Enter as {selectedRole}
              </>
            )}
          </button>

          {ENABLE_AUTH && (
            <p className="text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
              Secured by Auth0. No PHI is processed or stored.
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>
          Public payer documents · Synthetic cases only · No PHI
        </p>

        <p className="mt-3 text-center text-xs" style={{ color: 'var(--ink-muted)' }}>
          <a href="/matrix" style={{ color: 'var(--accent-blue)' }}>Continue without signing in →</a>
        </p>
      </div>
    </div>
  )
}

// ── RoleOption ────────────────────────────────────────────────────────────────

function RoleOption({ role, label, description, selected, onSelect }: {
  role: UserRole; label: string; description: string; selected: boolean; onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
      style={{
        border: selected ? '1px solid var(--accent-blue)' : '1px solid var(--line-mid)',
        background: selected ? '#ECF1FF' : 'var(--bg-surface)',
      }}
    >
      <span
        className="mt-0.5 w-2 h-2 rounded-full shrink-0"
        style={{ background: role === 'coordinator' ? '#7C3AED' : '#0891B2', marginTop: 4 }}
      />
      <div className="flex-1">
        <p style={{ fontSize: 13, fontWeight: 600, color: selected ? 'var(--accent-blue)' : 'var(--ink-strong)', marginBottom: 2 }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{description}</p>
      </div>
      {selected && (
        <svg className="shrink-0 w-4 h-4 self-center" style={{ color: 'var(--accent-blue)' }} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function Auth0Icon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5l2.318 7.13H7.682L12 4.5zm-7.5 7.13l3.932-5.413-1.432 5.413H4.5zm15 0h-2.5L15.568 6.217 19.5 11.63zm-9.682 1.5h4.364L12 17.5l-2.182-4.37z" />
    </svg>
  )
}

function DemoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
}
