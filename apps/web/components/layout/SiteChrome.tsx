'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { MinimalLandingHeader } from './MinimalLandingHeader'
import { AppNav } from './AppNav'
import { AssistantDrawer } from '@/components/assistant/AssistantDrawer'
import { AssistantContext } from '@/components/assistant/AssistantContext'

interface SiteChromeProps {
  initialPayers:  { id: string; displayName: string }[]
  initialDrugs:   { key: string; displayName: string }[]
  payerDrugMap:   Record<string, string[]>
  children:       React.ReactNode
}

export function SiteChrome({ initialPayers, initialDrugs, payerDrugMap, children }: SiteChromeProps) {
  const pathname  = usePathname()
  const isLanding = pathname === '/'
  const isApp     = !isLanding

  const [drawerOpen,    setDrawerOpen]    = useState(false)
  const [drawerPrefill, setDrawerPrefill] = useState<string | undefined>()

  const openAssistant = useCallback((prefill?: string) => {
    setDrawerPrefill(prefill)
    setDrawerOpen(true)
  }, [])

  return (
    <AssistantContext.Provider value={{ open: openAssistant }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      {isLanding
        ? <MinimalLandingHeader />
        : <AppNav payerCount={initialPayers.length} drugCount={initialDrugs.length} />
      }

      {/* ── Page content ────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Global Ask PrismRx FAB (app pages only) ─────────────── */}
      {isApp && !drawerOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.04, boxShadow: '0 12px 32px rgba(43,80,255,0.28)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => openAssistant()}
          className="fixed bottom-6 right-6 z-[50] flex items-center gap-2 rounded-full text-white font-semibold"
          style={{
            background: '#2B50FF',
            padding: '0.75rem 1.25rem',
            fontSize: 13,
            letterSpacing: '-0.01em',
            boxShadow: '0 8px 24px rgba(43,80,255,0.22)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <MessageSquare className="w-4 h-4" />
          Ask PrismRx
        </motion.button>
      )}

      {/* ── Assistant Drawer ─────────────────────────────────────── */}
      {isApp && (
        <AssistantDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          initialPayers={initialPayers}
          initialDrugs={initialDrugs}
          payerDrugMap={payerDrugMap}
          prefillMessage={drawerPrefill}
        />
      )}
    </AssistantContext.Provider>
  )
}
