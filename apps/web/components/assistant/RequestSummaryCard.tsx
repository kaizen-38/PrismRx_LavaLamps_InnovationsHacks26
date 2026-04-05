'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, CircleDashed } from 'lucide-react'
import type { RequestSummaryCardProps } from '@/lib/assistant-types'

export function RequestSummaryCard({ resolvedPayer, resolvedDrug, diagnosis, matchConfidence, originalQuery }: RequestSummaryCardProps) {
  const isIndexed = matchConfidence !== 'unindexed'
  const confidenceLabel = matchConfidence === 'exact' ? 'Exact match' : matchConfidence === 'approximate' ? 'Approximate match' : 'Not indexed'
  const confidenceColor = matchConfidence === 'exact' ? '#0F766E' : matchConfidence === 'approximate' ? '#B45309' : '#64748B'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '0.875rem 1rem', background: 'var(--bg-soft)', borderRadius: 12, border: '1px solid var(--line-soft)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {isIndexed ? (
          <CheckCircle2 style={{ width: 13, height: 13, color: confidenceColor, flexShrink: 0 }} />
        ) : (
          <CircleDashed style={{ width: 13, height: 13, color: confidenceColor, flexShrink: 0 }} />
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: confidenceColor }}>{confidenceLabel}</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>·</span>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Indexed policy snapshot</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Chip label={resolvedPayer} type="payer" />
        <Chip label={resolvedDrug} type="drug" />
        {diagnosis && <Chip label={diagnosis} type="diagnosis" />}
      </div>

      <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.4 }}>
        Query: "{originalQuery.slice(0, 80)}{originalQuery.length > 80 ? '…' : ''}"
      </p>
    </motion.div>
  )
}

function Chip({ label, type }: { label: string; type: 'payer' | 'drug' | 'diagnosis' }) {
  const styles = {
    payer:     { bg: '#ECF1FF', color: '#2B50FF' },
    drug:      { bg: '#EAF8F4', color: '#0F766E' },
    diagnosis: { bg: '#F3F0FF', color: '#7C3AED' },
  }
  const s = styles[type]
  return (
    <span style={{ padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: s.color, background: s.bg, fontFamily: 'var(--font-sans)' }}>
      {label}
    </span>
  )
}
