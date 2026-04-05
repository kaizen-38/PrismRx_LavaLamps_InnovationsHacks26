'use client'

import { motion } from 'framer-motion'
import { Grid, FlaskConical } from 'lucide-react'
import type { SupportedOptionsCardProps } from '@/lib/assistant-types'

interface Props extends SupportedOptionsCardProps {
  /** Called when user clicks a payer — opens intake form, does NOT trigger lookup */
  onSelectPayer: (payerName: string) => void
  /** Called when user clicks a drug chip */
  onSelectDrug: (drugName: string) => void
}

export function SupportedOptionsCard({ requestedPayer, requestedDrug, supportedPayers, supportedDrugs, onSelectPayer, onSelectDrug }: Props) {
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <Grid style={{ width: 14, height: 14, color: '#2B50FF' }} />
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Currently Indexed Dataset
        </span>
      </div>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {(requestedPayer || requestedDrug) && (
          <div style={{ padding: '0.75rem 1rem', background: '#FFF6E8', borderRadius: 10, border: '1px solid #F59E0B33' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
              {requestedPayer && !supportedPayers.find(p => p.displayName.toLowerCase().includes(requestedPayer.toLowerCase())) && (
                <span>"{requestedPayer}" is not in the indexed payer dataset. </span>
              )}
              {requestedDrug && !supportedDrugs.find(d => d.displayName.toLowerCase().includes(requestedDrug.toLowerCase())) && (
                <span>"{requestedDrug}" is not in the indexed drug dataset. </span>
              )}
              Select a payer below to get started.
            </p>
          </div>
        )}

        {/* Payers */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <Grid style={{ width: 12, height: 12, color: 'var(--ink-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
              Indexed Payers — click to start
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {supportedPayers.map(p => (
              <motion.button
                key={p.id}
                whileHover={{ background: '#ECF1FF', borderColor: '#2B50FF44', y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectPayer(p.displayName)}
                style={{
                  padding: '0.375rem 0.875rem', borderRadius: 9999,
                  border: '1px solid var(--line-mid)', background: 'var(--bg-soft)',
                  fontSize: 13, fontWeight: 500, color: 'var(--ink-body)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
              >
                {p.displayName}
              </motion.button>
            ))}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>
            Clicking a payer opens the intake form with available drugs pre-filtered.
          </p>
        </div>

        {/* Drugs — shown as reference only, not clickable for direct lookup */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <FlaskConical style={{ width: 12, height: 12, color: 'var(--ink-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
              Indexed Drug Families ({supportedDrugs.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {supportedDrugs.map(d => (
              <span
                key={d.key}
                style={{
                  padding: '0.25rem 0.625rem', borderRadius: 9999,
                  border: '1px solid var(--line-soft)', background: 'var(--bg-soft)',
                  fontSize: 12, fontWeight: 400, color: 'var(--ink-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {d.displayName}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
