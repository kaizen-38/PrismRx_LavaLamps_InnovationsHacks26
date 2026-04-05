'use client'

import { motion } from 'framer-motion'
import { Star, ArrowRight } from 'lucide-react'

interface Props {
  preferredProduct: string | null
  nonPreferredProduct: string | null
  biosimilars: string[]
  note?: string | null
}

export function PreferredAlternativeCard({ preferredProduct, nonPreferredProduct, biosimilars, note }: Props) {
  if (!preferredProduct && biosimilars.length === 0 && !nonPreferredProduct) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--line-soft)', overflow: 'hidden' }}
    >
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Star style={{ width: 13, height: 13, color: '#B45309' }} />
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)' }}>
          Preferred / Alternative Products
        </p>
      </div>

      <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {biosimilars.length > 0 && (
          <div>
            <p style={{ margin: '0 0 0.375rem', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0F766E' }}>
              Preferred biosimilars
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {biosimilars.map(b => (
                <span key={b} style={{ padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: 12, fontWeight: 500, color: '#0F766E', background: '#EAF8F4', border: '1px solid #0F766E22' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {nonPreferredProduct && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', background: '#FFF6E8', borderRadius: 10, border: '1px solid #B4530922' }}>
            <ArrowRight style={{ width: 12, height: 12, color: '#B45309', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#B45309' }}>Non-preferred</p>
              <p style={{ margin: 0, fontSize: 12, color: '#B45309cc' }}>{nonPreferredProduct} — non-medical exception may be required</p>
            </div>
          </div>
        )}

        {note && (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{note}</p>
        )}
      </div>
    </motion.div>
  )
}
