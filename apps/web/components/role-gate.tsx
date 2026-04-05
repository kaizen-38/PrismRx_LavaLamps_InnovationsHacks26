'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — RoleGate & AccessSheet
//
// AccessSheet — wraps a gated page. Shows an inline access prompt instead
//   of a hard redirect when the user lacks the required role. Preserves
//   returnTo so login lands back on the intended page.
//
//   <AccessSheet capability="simulate" returnTo="/simulate"
//     title="Policy Fit Simulator" description="Coordinator access required."
//     fallbackHref="/matrix" fallbackLabel="Continue browsing matrix"
//   >
//     <PageContent />
//   </AccessSheet>
//
// RoleGate — wraps small inline elements (buttons, sections).
//   inline=true: just hides the children when access is denied.
//   inline=false: shows AccessDeniedBlock.
// ─────────────────────────────────────────────────────────────────────────────

import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/auth0'

// ── AccessSheet ───────────────────────────────────────────────────────────────
//
// Page-level gate. Shows friendly access prompt if user can't access,
// renders children if they can.

interface AccessSheetProps {
  capability: string
  returnTo: string
  title: string
  description: string
  requiredRole: 'coordinator' | 'analyst'
  /** Where to redirect if user cancels instead of signing in */
  fallbackHref: string
  fallbackLabel: string
  children: React.ReactNode
}

export function AccessSheet({
  capability,
  returnTo,
  title,
  description,
  requiredRole,
  fallbackHref,
  fallbackLabel,
  children,
}: AccessSheetProps) {
  const { user, loading, can } = useAuth()

  if (loading) return <LoadingPage />

  if (can(capability)) return <>{children}</>

  const loginUrl = `/login?returnTo=${encodeURIComponent(returnTo)}`
  const roleLabel = requiredRole === 'coordinator' ? 'Coordinator' : 'Analyst'
  const roleColor = requiredRole === 'coordinator' ? 'text-violet-600' : 'text-cyan-600'
  const roleBg    = requiredRole === 'coordinator' ? 'bg-violet-50 border-violet-200' : 'bg-cyan-50 border-cyan-200'

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16"
      style={{ background: 'var(--bg-page)' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-mid)', boxShadow: '0 8px 24px rgba(15,23,42,0.06)' }}
      >
        {/* Icon */}
        <div
          className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-soft)', border: '1px solid var(--line-soft)' }}
        >
          <LockIcon />
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.015em', marginBottom: '0.5rem' }}>
          {title}
        </h2>

        {/* Description */}
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: '34ch', margin: '0 auto 1.5rem' }}>
          {description}
        </p>

        {/* Role badge */}
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold mb-6 ${roleBg} ${roleColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${requiredRole === 'coordinator' ? 'bg-violet-500' : 'bg-cyan-500'}`} />
          {roleLabel} access
        </div>

        {/* Wrong-role message */}
        {user && (
          <div
            className="rounded-xl px-4 py-3 mb-5 text-sm text-left"
            style={{ background: 'var(--bg-soft)', border: '1px solid var(--line-soft)' }}
          >
            <p style={{ color: 'var(--ink-body)', fontWeight: 500, marginBottom: 2 }}>
              You&apos;re signed in as <span className="capitalize">{user.role}</span>
            </p>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
              This feature requires a {roleLabel} account.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {!user ? (
            <a
              href={loginUrl}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
              style={{ background: 'var(--accent-blue)' }}
            >
              Sign in as {roleLabel}
            </a>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
              Contact your admin to upgrade your role.
            </p>
          )}

          <a
            href={fallbackHref}
            className="w-full flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-colors"
            style={{ border: '1px solid var(--line-mid)', color: 'var(--ink-body)', background: 'var(--bg-surface)' }}
          >
            {fallbackLabel}
          </a>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-xs font-mono" style={{ color: 'var(--ink-faint)' }}>
          Coverage matrix and citations are always public.
        </p>
      </div>
    </div>
  )
}

// ── RoleGate — inline element gate ───────────────────────────────────────────

interface RoleGateProps {
  capability?: string
  role?: UserRole
  returnTo?: string
  inline?: boolean
  children: React.ReactNode
}

export default function RoleGate({ capability, role, returnTo, inline = false, children }: RoleGateProps) {
  const { user, loading, can } = useAuth()

  if (loading) return inline ? null : <LoadingPlaceholder />

  const allowed = capability
    ? can(capability)
    : role
    ? user?.role === role
    : true

  if (allowed) return <>{children}</>
  if (inline) return null

  return <AccessDeniedBlock capability={capability} role={role} returnTo={returnTo} />
}

// ── AccessDeniedBlock — small inline denied state ─────────────────────────────

function AccessDeniedBlock({ capability, role, returnTo }: { capability?: string; role?: UserRole; returnTo?: string }) {
  const { user } = useAuth()
  const loginUrl = `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
  const requiredRole = capability === 'simulate' ? 'coordinator' : capability === 'changes' ? 'analyst' : role ?? 'analyst'

  return (
    <div
      className="rounded-xl px-8 py-12 text-center"
      style={{ border: '1px dashed var(--line-mid)', background: 'var(--bg-soft)' }}
    >
      <div
        className="mx-auto mb-4 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-mid)' }}
      >
        <LockIcon />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-strong)', marginBottom: 6 }}>
        {requiredRole === 'coordinator' ? 'Coordinator' : 'Analyst'} access required
      </h3>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', maxWidth: '30ch', margin: '0 auto 1.25rem' }}>
        {user
          ? `You're signed in as ${user.role}. This requires ${requiredRole} access.`
          : `Sign in with a ${requiredRole} account to use this feature.`}
      </p>
      {!user && (
        <a
          href={loginUrl}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--accent-blue)' }}
        >
          Sign in to continue
        </a>
      )}
    </div>
  )
}

// ── RouteGuard — hard redirect (use sparingly) ────────────────────────────────

export function RouteGuard({ capability, role, returnTo, children }: { capability?: string; role?: UserRole; returnTo: string; children: React.ReactNode }) {
  const { user, loading, can } = useAuth()
  if (loading) return <LoadingPage />

  const allowed = capability ? can(capability) : role ? user?.role === role : true
  if (allowed) return <>{children}</>

  if (typeof window !== 'undefined') {
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`
  }
  return <LoadingPage />
}

// ── Loading states ────────────────────────────────────────────────────────────

function LoadingPlaceholder() {
  return <div className="shimmer h-10 rounded-lg w-full" />
}

function LoadingPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
      <div className="flex flex-col items-center gap-3" style={{ color: 'var(--ink-muted)' }}>
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span style={{ fontSize: 13 }}>Checking access…</span>
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
  )
}
