'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart2 } from 'lucide-react'
import type { RelatedCombination } from '@/lib/policy/repository'
import type { CoverageStatus } from '@/lib/types'

const STATUS_COLOR: Record<CoverageStatus, string> = {
  covered: '#0F766E', conditional: '#B45309', preferred: '#2B50FF',
  nonpreferred: '#7C3AED', not_covered: '#C2410C', unclear: '#94A3B8',
}

interface Props {
  drugDisplay: string
  combinations: RelatedCombination[]
  onSelect: (payer: string, drug: string) => void
}

export function MiniComparisonWidget({ drugDisplay, combinations, onSelect }: Props) {
  // Only show same-drug combinations (different payers)
  const sameDrug = combinations.filter(c => c.drug.displayName === drugDisplay)
  if (sameDrug.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}
    >
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <BarChart2 style={{ width: 13, height: 13, color: '#2B50FF' }} />
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Other Indexed Payers — {drugDisplay}
        </p>
      </div>

      <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {sameDrug.map((c, i) => {
          const color = STATUS_COLOR[c.coverageStatus] ?? '#94A3B8'
          return (
            <motion.button
              key={i}
              whileHover={{ background: 'var(--bg-soft)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(c.payer.displayName, c.drug.displayName)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.5rem 0.5rem', borderRadius: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', textAlign: 'left', width: '100%',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--ink-body)' }}>{c.payer.displayName}</span>
              <span style={{ fontSize: 11, color, background: color + '14', padding: '0.125rem 0.5rem', borderRadius: 9999, border: `1px solid ${color}28` }}>
                {c.coverageStatus.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>F:{c.frictionScore}</span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
