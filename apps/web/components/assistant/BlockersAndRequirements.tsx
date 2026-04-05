'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react'
import type { BlockersAndRequirementsProps, BlockerItem } from '@/lib/assistant-types'

const SEVERITY_CONFIG = {
  hard:  { color: '#C2410C', bg: '#FFF1EB', icon: AlertTriangle, label: 'Blocker' },
  soft:  { color: '#B45309', bg: '#FFF6E8', icon: AlertTriangle, label: 'Restriction' },
  info:  { color: '#2B50FF', bg: '#ECF1FF', icon: Info,          label: 'Note' },
}

export function BlockersAndRequirements({ blockers, nextBestAction }: BlockersAndRequirementsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-soft)' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Coverage Conditions
        </p>
      </div>

      {blockers.length === 0 ? (
        <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <CheckCircle2 style={{ width: 16, height: 16, color: '#0F766E' }} />
          <span style={{ fontSize: 13, color: 'var(--ink-body)' }}>No major blockers found in indexed criteria.</span>
        </div>
      ) : (
        <div>
          {blockers.map((blocker, i) => (
            <BlockerRow
              key={i}
              blocker={blocker}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              isLast={i === blockers.length - 1}
            />
          ))}
        </div>
      )}

      {/* Next best action */}
      <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-soft)', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <ArrowRight style={{ width: 15, height: 15, color: '#2B50FF', marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ margin: '0 0 0.125rem', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>Next best action</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-body)', lineHeight: 1.5 }}>{nextBestAction}</p>
        </div>
      </div>
    </div>
  )
}

function BlockerRow({ blocker, open, onToggle, isLast }: { blocker: BlockerItem; open: boolean; onToggle: () => void; isLast: boolean }) {
  const cfg = SEVERITY_CONFIG[blocker.severity]
  const Icon = cfg.icon

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--line-soft)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '0.875rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', fontFamily: 'var(--font-sans)',
        }}
      >
        <span style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 13, height: 13, color: cfg.color }} />
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink-strong)' }}>{blocker.label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '0.125rem 0.5rem', borderRadius: 9999, marginRight: 4 }}>{cfg.label}</span>
        <ChevronDown style={{ width: 14, height: 14, color: 'var(--ink-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{ margin: 0, padding: '0 1.25rem 1rem 3.75rem', fontSize: 13, color: 'var(--ink-body)', lineHeight: 1.6 }}>
              {blocker.value}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
