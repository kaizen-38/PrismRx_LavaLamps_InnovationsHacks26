'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ENABLE_AUTH, type UserRole } from '@/lib/auth0'
import { cn } from '@/lib/utils'

type NavVariant = 'marketing' | 'workspace'

type ProtectedNavItem = {
  href: string
  label: string
  active: boolean
  capability?: string
  requiredRole?: Extract<UserRole, 'analyst' | 'coordinator'>
}

const marketingItems = [
  { href: '/matrix', label: 'Coverage Matrix' },
  { href: '/sources', label: 'Sources' },
  { href: '/about', label: 'About' },
]

export default function NavBar({ variant }: { variant: NavVariant }) {
  const pathname = usePathname()

  return variant === 'marketing' ? (
    <MarketingHeader pathname={pathname} />
  ) : (
    <WorkspaceHeader pathname={pathname} />
  )
}

function MarketingHeader({ pathname }: { pathname: string }) {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-40 border-b" style={headerShell}>
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-5 py-3 sm:px-6">
        <Brand lockup={false} />

        <nav className="hidden items-center gap-1 md:flex">
          {marketingItems.map((item) => (
            <HeaderLink key={item.href} href={item.href} active={pathname === item.href}>
              {item.label}
            </HeaderLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href="/matrix" className="workspace-signin workspace-signin--primary">
              Open workspace
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link href="/login" className="workspace-signin">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function WorkspaceHeader({ pathname }: { pathname: string }) {
  const { user, loading, demoLogin, logout, can } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [promptItem, setPromptItem] = useState<ProtectedNavItem | null>(null)

  const items = useMemo<ProtectedNavItem[]>(
    () => [
      {
        href: '/matrix',
        label: 'Coverage Matrix',
        active: pathname === '/matrix' || pathname.startsWith('/policy') || pathname === '/compare',
      },
      {
        href: '/simulate',
        label: 'Simulator',
        capability: 'simulate',
        requiredRole: 'coordinator',
        active: pathname.startsWith('/simulate'),
      },
      {
        href: '/changes',
        label: 'Change Radar',
        capability: 'changes',
        requiredRole: 'analyst',
        active: pathname === '/changes' || pathname === '/radar',
      },
      {
        href: '/sources',
        label: 'Sources',
        active: pathname === '/sources',
      },
      {
        href: '/about',
        label: 'About',
        active: pathname === '/about',
      },
    ],
    [pathname],
  )

  return (
    <>
      <header className="sticky top-0 z-40 border-b" style={headerShell}>
        <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-5 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Brand lockup />
            <div className="lg:hidden">{renderAuthAction({ user, loading, logout, setShowMenu, showMenu })}</div>
          </div>

          <div className="flex flex-1 items-center justify-between gap-4">
            <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-1">
              {items.map((item) => {
                const locked = item.capability ? !loading && !can(item.capability) : false
                if (locked && item.requiredRole) {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      className={cn('workspace-nav-link workspace-nav-link--locked', item.active && 'workspace-nav-link--active')}
                      onClick={() => setPromptItem(item)}
                    >
                      <span>{item.label}</span>
                      <Lock className="h-3.5 w-3.5" />
                      <span className="workspace-nav-lock">{roleLabel(item.requiredRole)}</span>
                    </button>
                  )
                }

                return (
                  <HeaderLink key={item.href} href={item.href} active={item.active} workspace>
                    {item.label}
                  </HeaderLink>
                )
              })}
            </nav>

            <div className="hidden lg:block">
              {renderAuthAction({ user, loading, logout, setShowMenu, showMenu })}
            </div>
          </div>
        </div>
      </header>

      {showMenu && user ? (
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}>
          <div
            className="absolute right-5 top-[68px] w-[248px] rounded-[20px] border bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] sm:right-6"
            style={{ borderColor: 'var(--line-soft)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--bg-soft)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>
                {user.name}
              </p>
              <p className="truncate text-xs" style={{ color: 'var(--ink-muted)' }}>
                {user.email}
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--ink-faint)' }}>
                {roleLabel(user.role)}
              </p>
            </div>

            {!ENABLE_AUTH ? (
              <div className="mt-2 rounded-2xl px-2 py-2" style={{ border: '1px solid var(--line-soft)' }}>
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--ink-faint)' }}>
                  Switch demo role
                </p>
                {(['coordinator', 'analyst'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      demoLogin(role)
                      setShowMenu(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
                      role === user.role ? 'workspace-menu-link--active' : 'workspace-menu-link',
                    )}
                  >
                    <span>{roleLabel(role)}</span>
                    {role === user.role ? <span className="text-[11px] font-semibold">Active</span> : null}
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                logout()
                setShowMenu(false)
              }}
              className="workspace-menu-link mt-2 w-full justify-start text-left"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      {promptItem ? (
        <LockedNavPrompt
          item={promptItem}
          onClose={() => setPromptItem(null)}
          onSwitchRole={
            !ENABLE_AUTH && promptItem.requiredRole
              ? () => {
                  demoLogin(promptItem.requiredRole!)
                  setPromptItem(null)
                  window.location.href = promptItem.href
                }
              : undefined
          }
        />
      ) : null}
    </>
  )
}

function HeaderLink({
  href,
  active,
  children,
  workspace = false,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
  workspace?: boolean
}) {
  return (
    <Link href={href} className={cn(workspace ? 'workspace-nav-link' : 'marketing-nav-link', active && 'workspace-nav-link--active')}>
      {children}
    </Link>
  )
}

function Brand({ lockup }: { lockup: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 shrink-0">
      <span className="text-[1.2rem] font-bold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
        Prism<span style={{ color: 'var(--accent-cyan-deep)' }}>Rx</span>
      </span>
      {lockup ? (
        <span className="hidden rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex" style={brandLockup}>
          Coverage intelligence
        </span>
      ) : null}
    </Link>
  )
}

function LockedNavPrompt({
  item,
  onClose,
  onSwitchRole,
}: {
  item: ProtectedNavItem
  onClose: () => void
  onSwitchRole?: () => void
}) {
  const { user } = useAuth()
  const loginUrl = `/login?returnTo=${encodeURIComponent(item.href)}`
  const role = item.requiredRole === 'coordinator' ? 'Coordinator' : 'Analyst'
  const fallback = item.href === '/simulate' ? { href: '/matrix', label: 'Continue browsing matrix' } : { href: '/sources', label: 'View sources' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(22,32,51,0.16)] px-4 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[24px] border bg-white p-7 shadow-[0_28px_70px_rgba(15,23,42,0.16)]"
        style={{ borderColor: 'var(--line-soft)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'var(--bg-soft)', color: 'var(--accent-cyan-deep)' }}>
          <Lock className="h-5 w-5" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--ink-strong)' }}>
          {item.label}
        </h2>
        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--ink-body)' }}>
          {item.href === '/simulate'
            ? 'Synthetic case simulation is available to Coordinator accounts.'
            : 'Policy change tracking is available to Analyst accounts.'}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={requiredRoleChip(item.requiredRole)}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.requiredRole === 'coordinator' ? 'var(--accent-violet)' : 'var(--accent-cyan-deep)' }} />
          {role} access
        </div>

        {user ? (
          <div className="workspace-panel-muted mt-5 px-4 py-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-strong)' }}>
              You&apos;re signed in as {roleLabel(user.role)}.
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-muted)' }}>
              {item.label} requires {role} access. You can still use Coverage Matrix, Sources, and About.
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2.5">
          {!user ? (
            <Link href={loginUrl} className="workspace-signin workspace-signin--primary justify-center">
              Sign in
            </Link>
          ) : onSwitchRole ? (
            <button type="button" onClick={onSwitchRole} className="workspace-signin workspace-signin--primary justify-center">
              Switch to {role}
            </button>
          ) : (
            <Link href={loginUrl} className="workspace-signin workspace-signin--primary justify-center">
              Switch account
            </Link>
          )}

          <Link href={fallback.href} className="workspace-signin justify-center">
            {fallback.label}
          </Link>
        </div>
      </div>
    </div>
  )
}

function renderAuthAction({
  user,
  loading,
  logout,
  setShowMenu,
  showMenu,
}: {
  user: { role: UserRole } | null
  loading: boolean
  logout: () => void
  setShowMenu: (value: boolean) => void
  showMenu: boolean
}) {
  if (loading) {
    return <div className="h-10 w-28 rounded-full shimmer" />
  }

  if (!user) {
    return (
      <Link href="/login" className="workspace-signin">
        Sign in
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShowMenu(!showMenu)}
      className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors"
      style={{ borderColor: 'var(--line-mid)', background: 'var(--bg-surface)', color: 'var(--ink-strong)' }}
    >
      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={roleBadge(user.role)}>
        {roleLabel(user.role)}
      </span>
      <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--ink-muted)' }} />
    </button>
  )
}

function roleLabel(role: UserRole) {
  if (role === 'coordinator') return 'Coordinator'
  if (role === 'analyst') return 'Analyst'
  return 'Guest'
}

function roleBadge(role: UserRole) {
  if (role === 'coordinator') {
    return { background: 'var(--accent-violet-soft)', color: 'var(--accent-violet)' }
  }
  if (role === 'analyst') {
    return { background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan-deep)' }
  }
  return { background: 'var(--bg-soft)', color: 'var(--ink-muted)' }
}

function requiredRoleChip(role?: Extract<UserRole, 'analyst' | 'coordinator'>) {
  if (role === 'coordinator') {
    return {
      borderColor: 'rgba(124, 58, 237, 0.18)',
      background: 'var(--accent-violet-soft)',
      color: 'var(--accent-violet)',
    }
  }

  return {
    borderColor: 'rgba(6, 182, 212, 0.18)',
    background: 'var(--accent-cyan-soft)',
    color: 'var(--accent-cyan-deep)',
  }
}

const headerShell = {
  borderColor: 'var(--line-soft)',
  background: 'rgba(245, 248, 251, 0.94)',
  backdropFilter: 'blur(10px)',
} as const

const brandLockup = {
  borderColor: 'var(--line-soft)',
  background: 'var(--bg-soft)',
  color: 'var(--ink-muted)',
} as const
