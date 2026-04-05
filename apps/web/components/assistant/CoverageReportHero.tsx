'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react'
import type { CoverageReportHeroProps } from '@/lib/assistant-types'
import type { CoverageStatus } from '@/lib/types'

const STATUS_CONFIG: Record<CoverageStatus, { label: string; color: string; bg: string; icon: typeof ShieldCheck }> = {
  covered:     { label: 'Covered per indexed policy',        color: '#0F766E', bg: '#EAF8F4', icon: ShieldCheck },
  conditional: { label: 'Conditional coverage — criteria apply', color: '#B45309', bg: '#FFF6E8', icon: ShieldAlert },
  preferred:   { label: 'Preferred agent',                   color: '#2B50FF', bg: '#ECF1FF', icon: ShieldCheck },
  nonpreferred:{ label: 'Non-preferred — higher burden',     color: '#7C3AED', bg: '#F3F0FF', icon: ShieldAlert },
  not_covered: { label: 'Not covered per indexed policy',    color: '#C2410C', bg: '#FFF1EB', icon: ShieldX },
  unclear:     { label: 'Coverage status unclear',           color: '#64748B', bg: '#F1F5F9', icon: Shield },
}

interface Props extends CoverageReportHeroProps {
  onShowEvidence?: () => void
}

export function CoverageReportHero({ payer, drug, coverageStatus, paRequired, stepTherapyRequired, effectiveDate, versionLabel, shortTakeaway, frictionScore, onShowEvidence }: Props) {
  const cfg = STATUS_CONFIG[coverageStatus] ?? STATUS_CONFIG.unclear
  const Icon = cfg.icon

  const frictionColor = frictionScore >= 70 ? '#C2410C' : frictionScore >= 40 ? '#B45309' : '#0F766E'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: 'var(--bg-surface)', borderRadius: 20, border: '1px solid var(--line-soft)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Status bar */}
      <div style={{ padding: '1.25rem 1.5rem', background: cfg.bg, borderBottom: `1px solid ${cfg.color}22`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 20, height: 20, color: cfg.color }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: cfg.color }}>{cfg.label}</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)', marginTop: 1 }}>Indexed policy snapshot · {versionLabel}</p>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: 22, fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: '-0.02em' }}>
          {drug}
        </h3>
        <p style={{ margin: '0 0 1rem', fontSize: 14, color: 'var(--ink-muted)' }}>{payer} · Effective {effectiveDate}</p>

        <p style={{ margin: '0 0 1.25rem', fontSize: 14, color: 'var(--ink-body)', lineHeight: 1.6 }}>
          {shortTakeaway}
        </p>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <Chip label={paRequired ? 'PA Required' : 'No PA'} color={paRequired ? '#C2410C' : '#0F766E'} />
          <Chip label={stepTherapyRequired ? 'Step Therapy' : 'No Step Therapy'} color={stepTherapyRequired ? '#B45309' : '#0F766E'} />
          <Chip label={`Friction: ${frictionScore}`} color={frictionColor} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {onShowEvidence && (
            <button
              onClick={onShowEvidence}
              style={{ padding: '0.5rem 1rem', borderRadius: 9999, border: '1px solid var(--line-mid)', background: 'var(--bg-soft)', fontSize: 13, fontWeight: 500, color: 'var(--ink-body)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            >
              View evidence
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: 12, fontWeight: 600, color, background: color + '14', border: `1px solid ${color}28`, fontFamily: 'var(--font-sans)' }}>
      {label}
    </span>
  )
}
