'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { RelatedActionsProps } from '@/lib/assistant-types'
import type { CoverageStatus } from '@/lib/types'

const STATUS_DOT: Record<CoverageStatus, string> = {
  covered: '#0F766E', conditional: '#B45309', preferred: '#2B50FF',
  nonpreferred: '#7C3AED', not_covered: '#C2410C', unclear: '#94A3B8',
}

interface Props extends RelatedActionsProps {
  onLookup: (payer: string, drug: string) => void
  onNewLookup: () => void
}

export function RelatedActions({ relatedCombinations, onLookup, onNewLookup }: Props) {
  if (relatedCombinations.length === 0) return null

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-soft)' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Related Indexed Combinations
        </p>
      </div>

      <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {relatedCombinations.slice(0, 5).map((combo, i) => (
          <motion.button
            key={i}
            whileHover={{ background: 'var(--bg-soft)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onLookup(combo.payer.displayName, combo.drug.displayName)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.5rem', borderRadius: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', width: '100%', textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_DOT[combo.coverageStatus] ?? '#94A3B8', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-body)' }}>
              <strong style={{ color: 'var(--ink-strong)', fontWeight: 500 }}>{combo.payer.displayName}</strong>
              {' · '}
              {combo.drug.displayName}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Friction {combo.frictionScore}</span>
            <ArrowRight style={{ width: 12, height: 12, color: 'var(--ink-faint)' }} />
          </motion.button>
        ))}
      </div>

      <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-soft)' }}>
        <button
          onClick={onNewLookup}
          style={{
            fontSize: 13, color: '#2B50FF', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            fontWeight: 500,
          }}
        >
          + Start a new lookup
        </button>
      </div>
    </div>
  )
}
