'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — RoleGate
//
// Wraps content that requires a specific role/capability.
// Shows a lock prompt instead of crashing or hiding silently.
//
// Usage:
//   <RoleGate capability="simulate" returnTo="/simulate">
//     <SimulatorForm ... />
//   </RoleGate>
//
//   <RoleGate role="analyst" inline>
//     <ExportButton />   ← just hidden if wrong role, no redirect
//   </RoleGate>
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/auth0'

interface RoleGateProps {
  /** Capability string checked via hasCapability() */
  capability?: string
  /** Role required (alternative to capability) */
  role?: UserRole
  /** Return path after login */
  returnTo?: string
  /**
   * inline=true: just hide the children instead of showing the full block.
   * Use for small UI elements like buttons.
   */
  inline?: boolean
  children: React.ReactNode
}

export default function RoleGate({
  capability,
  role,
  returnTo,
  inline = false,
  children,
}: RoleGateProps) {
  const { user, loading, can } = useAuth()

  if (loading) {
    return inline ? null : <LoadingPlaceholder />
  }

  const allowed = capability
    ? can(capability)
    : role
    ? user?.role === role || (role === 'analyst' && user?.role === 'coordinator')
    : true

  if (allowed) return <>{children}</>

  if (inline) return null

  return <AccessDeniedBlock capability={capability} role={role} returnTo={returnTo} />
}

// ── AccessDeniedBlock ─────────────────────────────────────────────────────────

function AccessDeniedBlock({
  capability,
  role,
  returnTo,
}: {
  capability?: string
  role?: UserRole
  returnTo?: string
}) {
  const { user } = useAuth()
  const loginUrl = `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`

  const requiredRole = capability
    ? capability === 'simulate'
      ? 'coordinator'
      : 'analyst'
    : role ?? 'analyst'

  return (
    <div className="rounded-xl border border-dashed border-navy-600 bg-navy-900/50 px-8 py-16 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center">
        <LockIcon />
      </div>

      <h3 className="text-slate-200 font-semibold mb-1">
        {requiredRole === 'coordinator' ? 'Coordinator' : 'Analyst'} access required
      </h3>

      <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
        {user
          ? `You're signed in as ${user.role}. This feature requires a ${requiredRole} account.`
          : `Sign in with a ${requiredRole} account to access this feature.`}
      </p>

      {!user ? (
        <a
          href={loginUrl}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          Sign in to continue
        </a>
      ) : (
        <p className="text-xs text-slate-600 font-mono">
          Contact your administrator to upgrade your role.
        </p>
      )}
    </div>
  )
}

// ── Route guard (full-page redirect version) ──────────────────────────────────
//
// Use this at the top of protected pages for a hard redirect:
//
//   <RouteGuard capability="simulate" returnTo="/simulate">
//     <PageContent />
//   </RouteGuard>

interface RouteGuardProps {
  capability?: string
  role?: UserRole
  returnTo: string
  children: React.ReactNode
}

export function RouteGuard({ capability, role, returnTo, children }: RouteGuardProps) {
  const { user, loading, can } = useAuth()

  if (loading) return <LoadingPage />

  const allowed = capability
    ? can(capability)
    : role
    ? user?.role === role || (role === 'analyst' && user?.role === 'coordinator')
    : true

  if (allowed) return <>{children}</>

  // Client-side redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
  }

  return <LoadingPage />
}

// ── Skeleton / loading states ─────────────────────────────────────────────────

function LoadingPlaceholder() {
  return <div className="shimmer h-10 rounded-lg w-full" />
}

function LoadingPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-6 py-20 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Checking access…</span>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg className="w-6 h-6 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  )
}
