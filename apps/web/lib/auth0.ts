// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Auth0 integration stub
//
// Feature-flagged: set ENABLE_AUTH=false (default) to bypass entirely.
// For hackathon dev, DEV_ROLE=analyst|coordinator controls the local role.
//
// When ENABLE_AUTH=true this module is ready to wire a real Auth0 v4 client.
// Auth0 Next.js v4 uses Auth0Client + middleware (not catch-all route handler).
// See: https://auth0.com/docs/quickstart/webapp/nextjs
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'analyst' | 'coordinator' | 'guest'

export interface PrismUser {
  sub: string
  name: string
  email: string
  role: UserRole
  picture?: string
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export const ENABLE_AUTH =
  process.env.NEXT_PUBLIC_ENABLE_AUTH === 'true'

/** Local dev override: DEV_ROLE=analyst|coordinator */
export const DEV_ROLE: UserRole =
  (process.env.NEXT_PUBLIC_DEV_ROLE as UserRole | undefined) ?? 'analyst'

// ── Mock user (used when ENABLE_AUTH=false) ───────────────────────────────────

export const DEMO_USER: PrismUser = {
  sub: 'demo|prismrx',
  name: 'Demo User',
  email: 'demo@prismrx.ai',
  role: DEV_ROLE,
}

// ── Role capabilities ─────────────────────────────────────────────────────────
//
// Public routes (no login needed):
//   matrix, compare, policy, sources, about — readable by everyone
//
// Coordinator: + simulate (PA scenario runner), save, voice brief, evidence pack
// Analyst:     + changes (change radar), export, upload, admin tools
//
// Rationale: Simulator generates synthetic PA scenarios → coordinator workflow.
//            Change Radar surfaces payer drift intelligence → analyst workflow.

const ROLE_CAPABILITIES: Record<UserRole, string[]> = {
  guest:       ['matrix', 'compare', 'sources', 'policy'],
  coordinator: ['matrix', 'compare', 'sources', 'policy', 'simulate', 'save', 'voice', 'evidence_pack', 'share'],
  analyst:     ['matrix', 'compare', 'sources', 'policy', 'changes', 'export', 'upload', 'admin'],
}

export function hasCapability(role: UserRole, capability: string): boolean {
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false
}

/** Any logged-in user (any role) */
export function isAuthenticated(role: UserRole): boolean {
  return role !== 'guest'
}

export function canExport(role: UserRole): boolean {
  return hasCapability(role, 'export')
}

export function canSaveCase(role: UserRole): boolean {
  return hasCapability(role, 'save')
}

export function canVoiceBrief(role: UserRole): boolean {
  return hasCapability(role, 'voice')
}

// ── Auth0 client (real integration, activated when ENABLE_AUTH=true) ──────────
//
// Uncomment and configure when ready:
//
// import { Auth0Client } from '@auth0/nextjs-auth0/server'
//
// export const auth0 = new Auth0Client({
//   domain:       process.env.AUTH0_DOMAIN!,
//   clientId:     process.env.AUTH0_CLIENT_ID!,
//   clientSecret: process.env.AUTH0_CLIENT_SECRET!,
//   appBaseUrl:   process.env.APP_BASE_URL ?? 'http://localhost:3000',
//   authorizationParameters: {
//     scope: 'openid profile email',
//   },
// })
//
// export async function getSession() {
//   return auth0.getSession()
// }
//
// export async function getUser(): Promise<PrismUser | null> {
//   const session = await getSession()
//   if (!session?.user) return null
//   const role = (session.user['https://prismrx.ai/role'] as UserRole) ?? 'analyst'
//   return {
//     sub:     session.user.sub,
//     name:    session.user.name ?? 'User',
//     email:   session.user.email ?? '',
//     role,
//     picture: session.user.picture,
//   }
// }

// ── Dev/mock session ──────────────────────────────────────────────────────────

/** Returns the current user — mock when auth is disabled, real when enabled. */
export async function getUser(): Promise<PrismUser> {
  if (!ENABLE_AUTH) return DEMO_USER
  // TODO: replace with auth0.getUser() when ENABLE_AUTH=true
  return DEMO_USER
}

export function getLoginUrl(returnTo = '/matrix'): string {
  if (!ENABLE_AUTH) return '/matrix'
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
}

export function getLogoutUrl(): string {
  if (!ENABLE_AUTH) return '/'
  return '/auth/logout'
}
