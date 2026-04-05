'use client'

import { motion } from 'framer-motion'
import { Search, BarChart2, FlaskConical, BookOpen } from 'lucide-react'
import type { WelcomeQuickActionsProps } from '@/lib/assistant-types'

const ACTIONS = [
  { id: 'check_coverage', label: 'Check coverage', icon: Search, accent: '#2B50FF', bg: '#ECF1FF' },
  { id: 'compare_payers', label: 'Compare indexed payers', icon: BarChart2, accent: '#0F766E', bg: '#EAF8F4' },
  { id: 'explore_drugs', label: 'Explore supported drugs', icon: FlaskConical, accent: '#B45309', bg: '#FFF6E8' },
  { id: 'view_evidence', label: 'View policy evidence', icon: BookOpen, accent: '#7C3AED', bg: '#F3F0FF' },
]

interface Props extends WelcomeQuickActionsProps {
  onAction: (actionId: string) => void
}

export function WelcomeQuickActions({ supportedPayerCount, supportedDrugCount, onAction }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-soft)', borderRadius: 16, border: '1px solid var(--line-soft)' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.5 }}>
          Indexed dataset · {supportedPayerCount} payers · {supportedDrugCount} drug families
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {ACTIONS.map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAction(action.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.875rem 1rem',
              background: 'var(--bg-surface)', borderRadius: 14,
              border: '1px solid var(--line-soft)',
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 8, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <action.icon style={{ width: 15, height: 15, color: action.accent }} />
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-body)', lineHeight: 1.3 }}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
