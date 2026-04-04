'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Auth context
//
// In demo mode (ENABLE_AUTH=false): state lives in localStorage so role
// switching persists across page reloads without a real Auth0 session.
//
// When ENABLE_AUTH=true: swap the localStorage calls for Auth0 session reads.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { PrismUser, UserRole } from './auth0'
import { ENABLE_AUTH, hasCapability } from './auth0'

// ── Storage key ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'prismrx_demo_user'

function readStoredUser(): PrismUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PrismUser) : null
  } catch {
    return null
  }
}

function writeStoredUser(user: PrismUser | null) {
  if (typeof window === 'undefined') return
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: PrismUser | null
  loading: boolean
  /** Demo-mode login: picks a role and stores it */
  demoLogin: (role: UserRole) => void
  logout: () => void
  can: (capability: string) => boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  demoLogin: () => {},
  logout: () => {},
  can: () => false,
})

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PrismUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ENABLE_AUTH) {
      // TODO: fetch Auth0 session via /auth/profile or auth0.getSession()
      setLoading(false)
    } else {
      setUser(readStoredUser())
      setLoading(false)
    }
  }, [])

  const demoLogin = useCallback((role: UserRole) => {
    const newUser: PrismUser = {
      sub: `demo|${role}`,
      name: role === 'coordinator' ? 'Demo Coordinator' : 'Demo Analyst',
      email: `demo-${role}@prismrx.ai`,
      role,
    }
    setUser(newUser)
    writeStoredUser(newUser)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    writeStoredUser(null)
    if (ENABLE_AUTH) {
      window.location.href = '/auth/logout'
    }
  }, [])

  const can = useCallback(
    (capability: string) => {
      if (!user) return false
      return hasCapability(user.role, capability)
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, loading, demoLogin, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext)
}
