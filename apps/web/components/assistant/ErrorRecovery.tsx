'use client'

import { motion } from 'framer-motion'
import { AlertCircle, RefreshCw, Search } from 'lucide-react'

interface Props {
  message: string
  onRetry?: () => void
  onExplore?: () => void
}

export function ErrorRecovery({ message, onRetry, onExplore }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      aria-live="assertive"
      style={{ background: '#FFF1EB', borderRadius: 16, border: '1px solid #C2410C22', padding: '1.25rem 1.5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
        <AlertCircle style={{ width: 16, height: 16, color: '#C2410C', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#C2410C' }}>Request failed</p>
      </div>

      <p style={{ margin: '0 0 1rem', fontSize: 13, color: 'var(--ink-body)', lineHeight: 1.5 }}>{message}</p>

      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 0.875rem', borderRadius: 9999,
              border: '1px solid #C2410C', background: 'none',
              fontSize: 13, fontWeight: 500, color: '#C2410C',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} />
            Try again
          </button>
        )}
        {onExplore && (
          <button
            onClick={onExplore}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.5rem 0.875rem', borderRadius: 9999,
              border: '1px solid var(--line-mid)', background: 'var(--bg-soft)',
              fontSize: 13, fontWeight: 500, color: 'var(--ink-body)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <Search style={{ width: 12, height: 12 }} />
            Explore supported options
          </button>
        )}
      </div>
    </motion.div>
  )
}
