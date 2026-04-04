// Change Radar — policy drift visualization
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Radio, TrendingDown, TrendingUp, Minus, AlertCircle, RefreshCw } from 'lucide-react'
import { fadeUp, stagger } from '@/lib/motion/presets'

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

const MOCK_CHANGES: PolicyChange[] = [
  {
    payer: 'UnitedHealthcare',
    drug: 'Infliximab',
    field: 'Step Therapy Requirements',
    drift: 'tightened',
    summary: 'Added requirement for 3-month DMARD trial before approval.',
    before: '1 conventional DMARD failure required',
    after: '2 conventional DMARDs, minimum 3 months each',
    version_from: 'Oct 2023',
    version_to: 'Jan 2024',
  },
  {
    payer: 'Cigna',
    drug: 'Rituximab',
    field: 'Site of Care',
    drift: 'tightened',
    summary: 'Hospital site of care no longer covered — infusion center required.',
    before: 'Infusion center or hospital outpatient',
    after: 'Accredited infusion center only',
    version_from: 'Jul 2023',
    version_to: 'Jan 2024',
  },
  {
    payer: 'UPMC Health Plan',
    drug: 'Vedolizumab',
    field: 'Prior Authorization',
    drift: 'loosened',
    summary: 'Removed TNF-inhibitor step therapy requirement for IBD indication.',
    before: 'TNF-inhibitor failure required for IBD',
    after: 'PA required, no mandatory TNF step',
    version_from: 'Sep 2023',
    version_to: 'Dec 2023',
  },
  {
    payer: 'UnitedHealthcare',
    drug: 'Ocrelizumab',
    field: 'Prescriber Requirements',
    drift: 'new',
    summary: 'New policy added — neurologist specialist required.',
    before: '—',
    after: 'Neurologist or MS specialist only',
    version_from: '—',
    version_to: 'Jan 2024',
  },
  {
    payer: 'Cigna',
    drug: 'Abatacept IV',
    field: 'Reauthorization',
    drift: 'unchanged',
    summary: 'Annual reauthorization requirements remain the same.',
    before: 'Annual review with clinical documentation',
    after: 'Annual review with clinical documentation',
    version_from: 'Jul 2023',
    version_to: 'Jan 2024',
  },
]

const DRIFT_CONFIG = {
  tightened: { label: 'Tightened',  color: '#FF7D72', bg: 'rgba(255,125,114,0.1)', border: 'rgba(255,125,114,0.25)', icon: TrendingDown },
  loosened:  { label: 'Loosened',   color: '#62E7B7', bg: 'rgba(98,231,183,0.1)',  border: 'rgba(98,231,183,0.25)',  icon: TrendingUp  },
  unchanged: { label: 'Unchanged',  color: '#7C8DA6', bg: 'rgba(124,141,166,0.08)',border: 'rgba(124,141,166,0.2)',  icon: Minus       },
  new:       { label: 'New Policy', color: '#8F7CFF', bg: 'rgba(143,124,255,0.1)', border: 'rgba(143,124,255,0.25)', icon: AlertCircle },
}

export default function RadarPage() {
  const [filter, setFilter] = useState<DriftType | 'all'>('all')

  const filtered = filter === 'all' ? MOCK_CHANGES : MOCK_CHANGES.filter((c) => c.drift === filter)

  const counts = {
    tightened: MOCK_CHANGES.filter(c => c.drift === 'tightened').length,
    loosened:  MOCK_CHANGES.filter(c => c.drift === 'loosened').length,
    new:       MOCK_CHANGES.filter(c => c.drift === 'new').length,
    unchanged: MOCK_CHANGES.filter(c => c.drift === 'unchanged').length,
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-8 pt-28 pb-20">
      {/* Header */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="mb-12">
        <motion.p variants={fadeUp} className="overline mb-1">Versioned Intelligence</motion.p>
        <motion.h1
          variants={fadeUp}
          className="font-serif-display text-4xl font-medium mb-3"
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
        >
          Change Radar
        </motion.h1>
        <motion.p variants={fadeUp} className="text-sm max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
          Quarter-over-quarter policy version diffs — what tightened, loosened, or is new.
          Semantic diff grounded in source policy citations.
        </motion.p>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {(Object.keys(DRIFT_CONFIG) as DriftType[]).map((type) => {
          const cfg = DRIFT_CONFIG[type]
          const Icon = cfg.icon
          const active = filter === type
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              className="card-panel p-5 text-left transition-all duration-150"
              style={{
                border: active ? `1px solid ${cfg.border}` : '1px solid var(--border)',
                background: active ? cfg.bg : 'var(--panel)',
              }}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: cfg.color }} />
                <div>
                  <p className="text-xl font-bold" style={{ color: cfg.color, fontFamily: '"IBM Plex Mono", monospace' }}>
                    {counts[type]}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{cfg.label}</p>
                </div>
              </div>
            </button>
          )
        })}
      </motion.div>

      {/* Filter pill */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="overline mr-2">Filter:</span>
        {(['all', ...Object.keys(DRIFT_CONFIG)] as const).map((f) => {
          const active = filter === f
          const cfg = f !== 'all' ? DRIFT_CONFIG[f as DriftType] : null
          return (
            <button
              key={f}
              onClick={() => setFilter(f as typeof filter)}
              className="text-xs px-3 py-1.5 rounded-xl transition-all duration-150"
              style={{
                color: active ? (cfg?.color ?? '#E8EEF8') : 'var(--text-muted)',
                background: active ? (cfg?.bg ?? 'rgba(164,183,211,0.08)') : 'transparent',
                border: active ? `1px solid ${cfg?.border ?? 'rgba(164,183,211,0.2)'}` : '1px solid transparent',
              }}
            >
              {f === 'all' ? 'All changes' : DRIFT_CONFIG[f as DriftType].label}
            </button>
          )
        })}
      </div>

      {/* Change cards */}
      <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {filtered.map((change, i) => {
          const cfg = DRIFT_CONFIG[change.drift]
          const Icon = cfg.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card-data p-6"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {change.payer}
                  </span>
                  <span style={{ color: 'var(--border-strong)' }}>·</span>
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}
                  >
                    {change.drug}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {change.version_from} → {change.version_to}
                </span>
              </div>

              <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {change.field}
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{change.summary}</p>

              {change.drift !== 'unchanged' && change.drift !== 'new' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Before', text: change.before, color: '#FF7D72' },
                    { label: 'After',  text: change.after,  color: '#62E7B7' },
                  ].map(({ label, text, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-4"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color }}>
                        {label}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                    </div>
                  ))}
                </div>
              )}
              {(change.drift === 'unchanged' || change.drift === 'new') && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{change.after}</p>
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {filtered.length === 0 && (
        <div
          className="rounded-2xl p-16 text-center"
          style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No changes match this filter.</p>
        </div>
      )}
    </div>
  )
}
