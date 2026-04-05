'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, ChevronDown, ExternalLink, Quote } from 'lucide-react'
import type { EvidenceDrawerProps } from '@/lib/assistant-types'

export function EvidenceDrawer({ evidence, policyTitle }: EvidenceDrawerProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <FileText style={{ width: 15, height: 15, color: '#2B50FF', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)', textAlign: 'left' }}>
          Policy Evidence
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', marginRight: 6 }}>
          {evidence.length} citation{evidence.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown style={{ width: 14, height: 14, color: 'var(--ink-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--line-soft)', padding: '0 1.25rem 0.25rem' }}>
              <p style={{ margin: '0.75rem 0 0.5rem', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                Source: {policyTitle}
              </p>
            </div>

            {evidence.length === 0 ? (
              <p style={{ padding: '0 1.25rem 1rem', fontSize: 13, color: 'var(--ink-muted)' }}>
                No evidence citations found in indexed data.
              </p>
            ) : (
              <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {evidence.map((ev, i) => (
                  <EvidenceCard
                    key={ev.id}
                    evidence={ev}
                    active={activeIdx === i}
                    onToggle={() => setActiveIdx(activeIdx === i ? null : i)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EvidenceCard({ evidence, active, onToggle }: {
  evidence: { id: string; quote: string; sourceLabel: string; sourceUrl: string; effectiveDate: string; page: number | null; section: string | null }
  active: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ border: '1px solid var(--line-soft)', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
          background: active ? 'var(--bg-soft)' : 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', textAlign: 'left',
        }}
      >
        <Quote style={{ width: 13, height: 13, color: '#2B50FF', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--ink-strong)' }}>
            {evidence.sourceLabel}
          </p>
          {evidence.section && (
            <p style={{ margin: '0.125rem 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
              {evidence.section}{evidence.page ? ` · p.${evidence.page}` : ''} · {evidence.effectiveDate}
            </p>
          )}
        </div>
        <ChevronDown style={{ width: 13, height: 13, color: 'var(--ink-muted)', transform: active ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1rem 0.875rem 2.375rem', borderTop: '1px solid var(--line-soft)' }}>
              <blockquote style={{ margin: '0.75rem 0 0.75rem', padding: '0.625rem 0.875rem', background: 'var(--bg-soft)', borderLeft: '3px solid #2B50FF', borderRadius: '0 8px 8px 0', fontSize: 13, color: 'var(--ink-body)', lineHeight: 1.6, fontStyle: 'italic' }}>
                {evidence.quote}
              </blockquote>
              {evidence.sourceUrl && (
                <a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2B50FF', textDecoration: 'none' }}>
                  <ExternalLink style={{ width: 10, height: 10 }} />
                  View source
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
