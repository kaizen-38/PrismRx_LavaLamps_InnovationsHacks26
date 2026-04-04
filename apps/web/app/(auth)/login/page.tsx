'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Login page
// Demo mode: lets the user pick a role (analyst / coordinator) and stores it
// via AuthContext → localStorage. ENABLE_AUTH=true → redirect to Auth0.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
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

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      window.location.href = returnTo
    }
  }, [user, returnTo])

  const handleLogin = () => {
    if (ENABLE_AUTH) {
      window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      return
    }
    demoLogin(selectedRole)
    // redirect happens via the useEffect above once user state updates
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 text-3xl font-bold mb-2">
            <span className="text-white">Prism</span>
            <span className="text-cyan-500">Rx</span>
          </div>
          <p className="text-slate-500 text-sm">Coverage Intelligence Platform</p>
        </div>

        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8 space-y-5">
          {/* Demo mode banner */}
          {!ENABLE_AUTH && (
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-300 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Demo mode — Auth0 is disabled. Choose a role below.
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold text-slate-100 mb-1">Sign in</h1>
            <p className="text-sm text-slate-500">
              Matrix is public. Sign in to access the Simulator and Change Radar.
            </p>
          </div>

          {/* Role selector — only shown in demo mode */}
          {!ENABLE_AUTH && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select role
              </p>
              <RoleOption
                role="analyst"
                label="Analyst"
                description="View radar, friction details, export evidence packs."
                selected={selectedRole === 'analyst'}
                onSelect={() => setSelectedRole('analyst')}
              />
              <RoleOption
                role="coordinator"
                label="Coordinator"
                description="Run simulations, voice briefs, and all analyst features."
                selected={selectedRole === 'coordinator'}
                onSelect={() => setSelectedRole('coordinator')}
              />
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold py-3 transition-colors text-sm"
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
            <p className="text-center text-xs text-slate-600">
              Secured by Auth0. No PHI is processed or stored.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-700 font-mono">
          Public payer documents · Synthetic cases only · No PHI
        </p>
      </div>
    </div>
  )
}

// ── RoleOption (selectable card) ──────────────────────────────────────────────

function RoleOption({
  role,
  label,
  description,
  selected,
  onSelect,
}: {
  role: UserRole
  label: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  const dotColor = role === 'coordinator' ? 'bg-violet-400' : 'bg-cyan-400'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
        selected
          ? 'border-cyan-600/60 bg-cyan-500/10'
          : 'border-navy-600 bg-navy-800/50 hover:border-navy-500'
      }`}
    >
      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <div>
        <p className={`text-xs font-semibold ${selected ? 'text-cyan-300' : 'text-slate-300'}`}>
          {label}
        </p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      {selected && (
        <svg className="ml-auto shrink-0 w-4 h-4 text-cyan-400 self-center" fill="currentColor" viewBox="0 0 20 20">
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
