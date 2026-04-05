'use client'

import { motion } from 'framer-motion'
import { Database, CheckCircle2, Circle } from 'lucide-react'
import type { PolicySnapshotCardProps } from '@/lib/assistant-types'

export function PolicySnapshotCard({ payer, drugFamily, effectiveDate, versionLabel, policyId, confidence, completenessNote }: PolicySnapshotCardProps) {
  const confidenceColor = confidence === 'high' ? '#0F766E' : confidence === 'medium' ? '#B45309' : '#64748B'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: 'var(--bg-soft)', borderRadius: 14, border: '1px solid var(--line-soft)', padding: '1rem 1.25rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
        <Database style={{ width: 14, height: 14, color: '#2B50FF' }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Indexed Policy Snapshot
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem 1rem' }}>
        <SnapshotField label="Payer" value={payer} />
        <SnapshotField label="Drug Family" value={drugFamily} />
        <SnapshotField label="Effective Date" value={effectiveDate} />
        <SnapshotField label="Version" value={versionLabel} />
        <div style={{ gridColumn: 'span 2' }}>
          <SnapshotField label="Policy ID" value={policyId} mono />
        </div>
      </div>

      <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <CheckCircle2 style={{ width: 13, height: 13, color: confidenceColor, flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
          {completenessNote}
        </p>
      </div>
    </motion.div>
  )
}

function SnapshotField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)' }}>{label}</p>
      <p style={{ margin: '0.125rem 0 0', fontSize: 12, color: 'var(--ink-body)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)' }}>{value}</p>
    </div>
  )
}
