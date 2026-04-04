'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Change Radar page
// Quarter-over-quarter policy diffs: tightened, loosened, unchanged.
// Includes friction delta chart and per-payer/drug filtering.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import ChangeRadar from '@/components/change-radar'
import { RouteGuard } from '@/components/role-gate'
import type { PolicyDiff } from '@/lib/types'
import { fetchDiffs } from '@/lib/api-client'
import { DRUG_FAMILIES, PAYERS, PAYER_IDS } from '@/lib/mock-data'

export default function RadarPage() {
  return (
    <RouteGuard capability="radar" returnTo="/radar">
      <RadarInner />
    </RouteGuard>
  )
}

function RadarInner() {
  const [diffs, setDiffs] = useState<PolicyDiff[]>([])
  const [loading, setLoading] = useState(true)
  const [drugFilter, setDrugFilter] = useState<string>('all')
  const [payerFilter, setPayerFilter] = useState<string>('all')
  const [dirFilter, setDirFilter] = useState<'all' | 'tightened' | 'loosened'>('all')

  useEffect(() => {
    fetchDiffs().then((data) => {
      setDiffs(data)
      setLoading(false)
    })
  }, [])

  const visible = diffs.filter((d) => {
    if (drugFilter !== 'all' && d.drug_key !== drugFilter) return false
    if (payerFilter !== 'all' && d.payer_id !== payerFilter) return false
    if (dirFilter !== 'all' && d.overall_direction !== dirFilter) return false
    return true
  })

  const tightenedCount = diffs.filter((d) => d.overall_direction === 'tightened').length
  const loosenedCount  = diffs.filter((d) => d.overall_direction === 'loosened').length

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-700">
            <RadarIcon />
          </span>
          <h1 className="text-2xl font-bold text-slate-100">Change Radar</h1>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          Quarter-over-quarter policy version diffs — see what tightened, loosened, or was added
          across payers. Friction Score delta shows the real-world approval burden shift.
        </p>
      </div>

      {/* ── Summary metrics ──────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <MetricCard
            label="Policies tracked"
            value={diffs.length}
            color="text-slate-100"
          />
          <MetricCard
            label="Tightened"
            value={tightenedCount}
            color="text-red-400"
            icon="↑"
          />
          <MetricCard
            label="Loosened"
            value={loosenedCount}
            color="text-emerald-400"
            icon="↓"
          />
          <MetricCard
            label="Total changes"
            value={diffs.reduce((s, d) => s + d.changes.length, 0)}
            color="text-cyan-400"
          />
        </div>
      )}

      {/* ── Friction bar chart ───────────────────────────────────────────── */}
      {!loading && diffs.length > 0 && (
        <div className="mb-8 rounded-xl border border-navy-700 bg-navy-900 px-5 py-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Friction Score Delta — by Policy
          </h2>
          <div className="space-y-2">
            {diffs.map((d) => (
              <FrictionBar key={d.id} diff={d} />
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Drug filter */}
        <select
          value={drugFilter}
          onChange={(e) => setDrugFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">All drugs</option>
          {DRUG_FAMILIES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.display_name}
            </option>
          ))}
        </select>

        {/* Payer filter */}
        <select
          value={payerFilter}
          onChange={(e) => setPayerFilter(e.target.value)}
          className={selectCls}
        >
          <option value="all">All payers</option>
          {PAYER_IDS.map((id) => (
            <option key={id} value={id}>
              {PAYERS[id]}
            </option>
          ))}
        </select>

        {/* Direction filter */}
        <div className="flex rounded-lg border border-navy-600 overflow-hidden">
          {(['all', 'tightened', 'loosened'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirFilter(d)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-navy-600 last:border-0 ${
                dirFilter === d
                  ? d === 'tightened'
                    ? 'bg-red-900/40 text-red-300'
                    : d === 'loosened'
                    ? 'bg-emerald-900/40 text-emerald-300'
                    : 'bg-navy-700 text-slate-200'
                  : 'bg-navy-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {d === 'all' ? 'All' : d === 'tightened' ? '↑ Tightened' : '↓ Loosened'}
            </button>
          ))}
        </div>

        {(drugFilter !== 'all' || payerFilter !== 'all' || dirFilter !== 'all') && (
          <button
            type="button"
            onClick={() => { setDrugFilter('all'); setPayerFilter('all'); setDirFilter('all') }}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Diff cards ───────────────────────────────────────────────────── */}
      {loading ? (
        <LoadingSkeleton />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-navy-600 bg-navy-900/50 px-8 py-16 text-center">
          <p className="text-slate-500 text-sm">No policy diffs match the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {visible.map((diff) => (
            <ChangeRadar key={diff.id} diff={diff} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── FrictionBar ───────────────────────────────────────────────────────────────

function FrictionBar({ diff }: { diff: PolicyDiff }) {
  const max = 100
  const tightened = diff.friction_delta > 0

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-36 shrink-0 text-right text-slate-500 truncate font-mono">
        {diff.drug_display_name}/{diff.payer_name.split(' ')[0]}
      </div>
      <div className="flex-1 flex items-center gap-1.5 h-5">
        {/* Before bar */}
        <div className="relative h-3 bg-navy-800 rounded-full overflow-hidden flex-1">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-navy-600 transition-all"
            style={{ width: `${(diff.friction_before / max) * 100}%` }}
          />
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
              tightened ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${(diff.friction_after / max) * 100}%` }}
          />
        </div>
        <span
          className={`w-10 text-right font-mono font-bold ${
            tightened ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {diff.friction_delta > 0 ? `+${diff.friction_delta}` : diff.friction_delta}
        </span>
      </div>
    </div>
  )
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: string
  icon?: string
}) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 px-4 py-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-0.5 ${color}`}>
        {icon && <span className="mr-1 text-base">{icon}</span>}
        {value}
      </p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-navy-700 bg-navy-900">
          <div className="px-5 py-4 space-y-2">
            <div className="shimmer h-4 w-48 rounded" />
            <div className="shimmer h-3 w-64 rounded" />
          </div>
          <div className="px-5 pb-4 space-y-2">
            {[1, 2].map((j) => (
              <div key={j} className="shimmer h-16 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const selectCls =
  'rounded-lg border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-600 transition-colors'

// ── Icon ──────────────────────────────────────────────────────────────────────

function RadarIcon() {
  return (
    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )
}
