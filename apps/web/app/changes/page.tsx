'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Change Radar page  /changes
// Analyst-only: quarter-over-quarter policy diffs with friction delta.
// AccessSheet shown to guests/coordinators rather than a hard redirect.
// /radar redirects here for backward compat.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import ChangeRadar from '@/components/change-radar'
import { AccessSheet } from '@/components/role-gate'
import type { PolicyDiff } from '@/lib/types'
import { fetchDiffs } from '@/lib/api-client'
import { DRUG_FAMILIES, PAYERS, PAYER_IDS } from '@/lib/mock-data'

export default function ChangesPage() {
  return (
    <AccessSheet
      capability="changes"
      returnTo="/changes"
      title="Change Radar"
      description="Quarter-over-quarter policy version diffs — see what tightened, loosened, or was added across payers. Friction Score delta shows real-world approval burden shift. Available to analyst accounts."
      requiredRole="analyst"
      fallbackHref="/matrix"
      fallbackLabel="Continue browsing coverage matrix"
    >
      <ChangesInner />
    </AccessSheet>
  )
}

function ChangesInner() {
  const [diffs, setDiffs] = useState<PolicyDiff[]>([])
  const [loading, setLoading] = useState(true)
  const [drugFilter, setDrugFilter]   = useState<string>('all')
  const [payerFilter, setPayerFilter] = useState<string>('all')
  const [dirFilter, setDirFilter]     = useState<'all' | 'tightened' | 'loosened'>('all')

  useEffect(() => {
    fetchDiffs().then(data => { setDiffs(data); setLoading(false) })
  }, [])

  const visible = diffs.filter(d => {
    if (drugFilter  !== 'all' && d.drug_key          !== drugFilter)  return false
    if (payerFilter !== 'all' && d.payer_id          !== payerFilter) return false
    if (dirFilter   !== 'all' && d.overall_direction !== dirFilter)   return false
    return true
  })

  const tightenedCount = diffs.filter(d => d.overall_direction === 'tightened').length
  const loosenedCount  = diffs.filter(d => d.overall_direction === 'loosened').length

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--bg-page)' }}>
      <div className="mx-auto max-w-screen-xl px-6 py-10">

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ background: '#ECFEFF', border: '1px solid #A5F3FC' }}
            >
              <RadarIcon />
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink-strong)' }}>Change Radar</h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', maxWidth: '60ch', lineHeight: 1.6 }}>
            Quarter-over-quarter policy version diffs — see what tightened, loosened, or was added
            across payers. Friction Score delta shows the real-world approval burden shift.
          </p>
        </div>

        {/* Summary metrics */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <MetricCard label="Policies tracked" value={diffs.length} />
            <MetricCard label="Tightened" value={tightenedCount} color="#DC2626" icon="↑" />
            <MetricCard label="Loosened"  value={loosenedCount}  color="#059669" icon="↓" />
            <MetricCard label="Total changes" value={diffs.reduce((s, d) => s + d.changes.length, 0)} color="var(--accent-blue)" />
          </div>
        )}

        {/* Friction bar chart */}
        {!loading && diffs.length > 0 && (
          <div
            className="mb-8 rounded-xl px-5 py-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-mid)' }}
          >
            <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
              Friction Score Delta — by Policy
            </h2>
            <div className="space-y-2">
              {diffs.map(d => <FrictionBar key={d.id} diff={d} />)}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select value={drugFilter} onChange={e => setDrugFilter(e.target.value)} className={selectCls}>
            <option value="all">All drugs</option>
            {DRUG_FAMILIES.map(d => <option key={d.key} value={d.key}>{d.display_name}</option>)}
          </select>

          <select value={payerFilter} onChange={e => setPayerFilter(e.target.value)} className={selectCls}>
            <option value="all">All payers</option>
            {PAYER_IDS.map(id => <option key={id} value={id}>{PAYERS[id]}</option>)}
          </select>

          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--line-mid)' }}>
            {(['all', 'tightened', 'loosened'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDirFilter(d)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderRight: d !== 'loosened' ? '1px solid var(--line-soft)' : 'none',
                  background: dirFilter === d
                    ? d === 'tightened' ? '#FEF2F2' : d === 'loosened' ? '#F0FDF4' : 'var(--bg-soft)'
                    : 'var(--bg-surface)',
                  color: dirFilter === d
                    ? d === 'tightened' ? '#DC2626' : d === 'loosened' ? '#059669' : 'var(--ink-strong)'
                    : 'var(--ink-muted)',
                }}
              >
                {d === 'all' ? 'All' : d === 'tightened' ? '↑ Tightened' : '↓ Loosened'}
              </button>
            ))}
          </div>

          {(drugFilter !== 'all' || payerFilter !== 'all' || dirFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setDrugFilter('all'); setPayerFilter('all'); setDirFilter('all') }}
              style={{ fontSize: 12, color: 'var(--ink-muted)', padding: '0.375rem 0.75rem' }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Diff cards */}
        {loading ? (
          <LoadingSkeleton />
        ) : visible.length === 0 ? (
          <div
            className="rounded-xl px-8 py-16 text-center"
            style={{ border: '1px dashed var(--line-mid)', background: 'var(--bg-soft)' }}
          >
            <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>No policy diffs match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {visible.map(diff => <ChangeRadar key={diff.id} diff={diff} />)}
          </div>
        )}

      </div>
    </div>
  )
}

// ── FrictionBar ───────────────────────────────────────────────────────────────

function FrictionBar({ diff }: { diff: PolicyDiff }) {
  const max = 100
  const tightened = diff.friction_delta > 0

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-36 shrink-0 text-right truncate font-mono" style={{ color: 'var(--ink-muted)' }}>
        {diff.drug_display_name}/{diff.payer_name.split(' ')[0]}
      </div>
      <div className="flex-1 flex items-center gap-1.5 h-5">
        <div className="relative h-3 rounded-full overflow-hidden flex-1" style={{ background: 'var(--line-soft)' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${(diff.friction_before / max) * 100}%`, background: 'var(--line-mid)' }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{ width: `${(diff.friction_after / max) * 100}%`, background: tightened ? '#EF4444' : '#10B981' }}
          />
        </div>
        <span className="w-10 text-right font-mono font-bold" style={{ color: tightened ? '#DC2626' : '#059669' }}>
          {diff.friction_delta > 0 ? `+${diff.friction_delta}` : diff.friction_delta}
        </span>
      </div>
    </div>
  )
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, color, icon }: { label: string; value: number; color?: string; icon?: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-mid)' }}
    >
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 2, color: color ?? 'var(--ink-strong)' }}>
        {icon && <span style={{ marginRight: 4, fontSize: '1rem' }}>{icon}</span>}
        {value}
      </p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl" style={{ border: '1px solid var(--line-soft)' }}>
          <div className="px-5 py-4 space-y-2">
            <div className="shimmer h-4 w-48 rounded" />
            <div className="shimmer h-3 w-64 rounded" />
          </div>
          <div className="px-5 pb-4 space-y-2">
            {[1, 2].map(j => <div key={j} className="shimmer h-16 rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const selectCls =
  'rounded-lg border px-3 py-1.5 text-xs focus:outline-none transition-colors bg-white text-ink-strong'

// ── Icon ──────────────────────────────────────────────────────────────────────

function RadarIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: '#0891B2' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )
}
