'use client'

import { Info } from 'lucide-react'
import type { LimitationNoticeProps } from '@/lib/assistant-types'

export function LimitationNotice({ datasetNote }: LimitationNoticeProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
      padding: '0.875rem 1rem', borderRadius: 12,
      background: 'var(--bg-soft)', border: '1px solid var(--line-soft)',
    }}>
      <Info style={{ width: 13, height: 13, color: 'var(--ink-faint)', flexShrink: 0, marginTop: 2 }} />
      <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        {datasetNote ??
          'This result is based on the currently indexed policy dataset available in this prototype. It does not guarantee reimbursement or prior authorization outcome. Always verify with the payer directly before proceeding with a PA submission.'}
      </p>
    </div>
  )
}
