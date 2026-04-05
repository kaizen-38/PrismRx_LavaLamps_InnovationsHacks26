'use client'

import { motion } from 'framer-motion'
import { Grid, FlaskConical } from 'lucide-react'
import type { SupportedOptionsCardProps } from '@/lib/assistant-types'

interface Props extends SupportedOptionsCardProps {
  onSelect: (payer: string, drug: string) => void
}

export function SupportedOptionsCard({ requestedPayer, requestedDrug, supportedPayers, supportedDrugs, onSelect }: Props) {
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
              Select a supported combination below.
            </p>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <Grid style={{ width: 12, height: 12, color: 'var(--ink-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
              Indexed Payers ({supportedPayers.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {supportedPayers.map(p => (
              <motion.button
                key={p.id}
                whileHover={{ background: '#ECF1FF', borderColor: '#2B50FF44' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(p.displayName, '')}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 9999,
                  border: '1px solid var(--line-mid)', background: 'var(--bg-soft)',
                  fontSize: 12, fontWeight: 500, color: 'var(--ink-body)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
              >
                {p.displayName}
              </motion.button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <FlaskConical style={{ width: 12, height: 12, color: 'var(--ink-muted)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
              Indexed Drug Families ({supportedDrugs.length})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {supportedDrugs.map(d => (
              <motion.button
                key={d.key}
                whileHover={{ background: '#EAF8F4', borderColor: '#0F766E44' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect('', d.displayName)}
                style={{
                  padding: '0.375rem 0.75rem', borderRadius: 9999,
                  border: '1px solid var(--line-mid)', background: 'var(--bg-soft)',
                  fontSize: 12, fontWeight: 500, color: 'var(--ink-body)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
              >
                {d.displayName}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
