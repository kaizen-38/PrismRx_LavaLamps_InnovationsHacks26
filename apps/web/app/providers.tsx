'use client'

// Client providers wrapper — keeps layout.tsx as a server component.

import { AuthProvider } from '@/lib/auth-context'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
