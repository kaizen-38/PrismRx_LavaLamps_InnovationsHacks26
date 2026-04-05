'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react'
import { fadeUp, stagger, spring } from '@/lib/motion/presets'
import { fetchDiffs } from '@/lib/api-client'
import type { PolicyDiff } from '@/lib/types'

type DriftType = 'tightened' | 'loosened' | 'unchanged' | 'new'

interface PolicyChange {
  payer: string
  drug: string
  field: string
  drift: DriftType
  summary: string
  before: string
  after: string
  version_from: string
  version_to: string
}

// ── API diffs → local shape ────────────────────────────────────────────────────
function diffToChanges(diff: PolicyDiff): PolicyChange[] {
  return diff.changes.map((c) => ({
    payer: diff.payer_name,
    drug: diff.drug_display_name,
    field: c.field_label,
    drift: (c.change_type === 'added' ? 'new' : c.change_type) as DriftType,
    summary: `${c.field_label}: ${c.before} → ${c.after}`,
    before: c.before,
    after: c.after,
    version_from: diff.version_before,
    version_to: diff.version_after,
  }))
}

const FALLBACK_CHANGES: PolicyChange[] = [
  {
    payer: 'UnitedHealthcare', drug: 'Infliximab', field: 'Step Therapy Requirements', drift: 'tightened',
    summary: 'Added requirement for 3-month DMARD trial before approval.',
    before: '1 conventional DMARD failure required',
    after: '2 conventional DMARDs, minimum 3 months each',
    version_from: 'Oct 2023', version_to: 'Jan 2024',
  },
  {
    payer: 'Cigna', drug: 'Rituximab', field: 'Site of Care', drift: 'tightened',
    summary: 'Hospital site of care no longer covered — infusion center required.',
    before: 'Infusion center or hospital outpatient',
    after: 'Accredited infusion center only',
    version_from: 'Jul 2023', version_to: 'Jan 2024',
  },
  {
    payer: 'UnitedHealthcare', drug: 'Vedolizumab', field: 'Prior Authorization', drift: 'loosened',
    summary: 'Removed TNF-inhibitor step therapy requirement for IBD indication.',
    before: 'TNF-inhibitor failure required for IBD',
    after: 'PA required, no mandatory TNF step',
    version_from: 'Sep 2023', version_to: 'Dec 2023',
  },
  {
    payer: 'UnitedHealthcare', drug: 'Ocrelizumab', field: 'Prescriber Requirements', drift: 'new',
    summary: 'New policy added — neurologist specialist required.',
    before: '—', after: 'Neurologist or MS specialist only',
    version_from: '—', version_to: 'Jan 2024',
  },
  {
    payer: 'Cigna', drug: 'Infliximab', field: 'Reauthorization', drift: 'unchanged',
    summary: 'Annual reauthorization requirements remain the same.',
    before: 'Annual review with clinical documentation',
    after: 'Annual review with clinical documentation',
    version_from: 'Jul 2023', version_to: 'Jan 2024',
  },
]

const DRIFT_CONFIG = {
  tightened: { label: 'Tightened',  color: '#E53935', bg: '#FFEBEE', border: 'rgba(229,57,53,0.2)',  icon: TrendingDown },
  loosened:  { label: 'Loosened',   color: '#12B886', bg: '#E6FAF4', border: 'rgba(18,184,134,0.2)', icon: TrendingUp  },
  unchanged: { label: 'No change',  color: '#6E6E73', bg: '#F5F5F7', border: 'rgba(0,0,0,0.1)',      icon: Minus       },
  new:       { label: 'New Policy', color: '#7C3AED', bg: '#F3F0FF', border: 'rgba(124,58,237,0.2)', icon: AlertCircle },
}

export default function RadarPage() {
  const [filter, setFilter] = useState<DriftType | 'all'>('all')
  const [apiChanges, setApiChanges] = useState<PolicyChange[] | null>(null)

  useEffect(() => {
    fetchDiffs().then((diffs) => {
      const all = diffs.flatMap(diffToChanges)
      if (all.length > 0) setApiChanges(all)
    }).catch(() => {})
  }, [])

  const ALL_CHANGES = apiChanges ?? FALLBACK_CHANGES
  const filtered = filter === 'all' ? ALL_CHANGES : ALL_CHANGES.filter(c => c.drift === filter)
  const counts = {
    tightened: ALL_CHANGES.filter(c => c.drift === 'tightened').length,
    loosened:  ALL_CHANGES.filter(c => c.drift === 'loosened').length,
    new:       ALL_CHANGES.filter(c => c.drift === 'new').length,
    unchanged: ALL_CHANGES.filter(c => c.drift === 'unchanged').length,
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-8 pt-28 pb-20" style={{ background: '#FFFFFF', minHeight: '100vh' }}>

      {/* Header */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="mb-12">
        <motion.p variants={fadeUp} className="overline mb-1">Policy Changes</motion.p>
        <motion.h1
          variants={fadeUp}
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}
        >
          Policy Changes
        </motion.h1>
        <motion.p variants={fadeUp} style={{ fontSize: '0.9375rem', color: '#6E6E73', maxWidth: '560px', lineHeight: 1.65 }}>
          Quarter-over-quarter policy diffs — what tightened, loosened, or is new. Every change linked to its source.
        </motion.p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {(Object.keys(DRIFT_CONFIG) as DriftType[]).map(type => {
          const cfg = DRIFT_CONFIG[type]
          const Icon = cfg.icon
          const active = filter === type
          return (
            <motion.button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              className="card p-5 text-left"
              style={{
                border: active ? `1.5px solid ${cfg.color}` : '1px solid rgba(0,0,0,0.08)',
                background: active ? cfg.bg : '#FFFFFF',
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={spring.card}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                <div>
                  <p style={{ fontSize: '1.25rem', fontWeight: 700, color: cfg.color, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {counts[type]}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6E6E73', marginTop: '0.25rem' }}>{cfg.label}</p>
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {(['all', ...Object.keys(DRIFT_CONFIG)] as const).map(f => {
          const active = filter === f
          const cfg = f !== 'all' ? DRIFT_CONFIG[f as DriftType] : null
          return (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className="text-xs px-3 py-1.5 rounded-full transition-all duration-150 font-medium"
              style={{
                color: active ? (cfg?.color ?? '#1D1D1F') : '#6E6E73',
                background: active ? (cfg?.bg ?? '#F5F5F7') : 'transparent',
                border: active ? `1px solid ${cfg?.border ?? 'rgba(0,0,0,0.12)'}` : '1px solid transparent',
              }}
            >
              {f === 'all' ? 'All changes' : DRIFT_CONFIG[f as DriftType].label}
            </button>
          )
        })}
      </div>

      {/* Change cards */}
      <div className="space-y-3">
        {filtered.map((change, i) => {
          const cfg = DRIFT_CONFIG[change.drift]
          const Icon = cfg.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
              style={{ padding: '1rem 1.25rem' }}
            >
              {/* Compact header row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ color: cfg.color, background: cfg.bg, fontSize: 11 }}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </span>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-strong)' }}>{change.payer}</span>
                <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>·</span>
                <span style={{ fontSize: 13, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                  {change.drug}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                  {change.version_from} → {change.version_to}
                </span>
              </div>

              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-faint)', marginBottom: 4 }}>
                {change.field}
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-body)', marginBottom: change.drift !== 'unchanged' ? 12 : 0, lineHeight: 1.6 }}>
                {change.summary}
              </p>

              {change.drift !== 'unchanged' && change.drift !== 'new' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 180, borderRadius: 10, padding: '8px 12px', background: 'rgba(229,57,53,0.06)', borderLeft: '2px solid #E53935' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E53935', marginBottom: 4 }}>
                      Before
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>{change.before}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 180, borderRadius: 10, padding: '8px 12px', background: 'rgba(18,184,134,0.06)', borderLeft: '2px solid #12B886' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#12B886', marginBottom: 4 }}>
                      After
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>{change.after}</p>
                  </div>
                </div>
              )}
              {(change.drift === 'unchanged' || change.drift === 'new') && change.after !== '—' && (
                <div style={{ borderRadius: 10, padding: '8px 12px', background: 'var(--bg-soft)', border: '1px solid var(--line-soft)' }}>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>{change.after}</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
