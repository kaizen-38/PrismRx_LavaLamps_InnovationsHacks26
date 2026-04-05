'use client'

import { useEffect, useState } from 'react'
import ChangeRadar from '@/components/change-radar'
import { WorkspaceHeader, WorkspaceMetricCard, WorkspacePage } from '@/components/layout/workspace-page'
import { AccessSheet } from '@/components/role-gate'
import { fetchDiffs } from '@/lib/api-client'
import { DRUG_FAMILIES, PAYERS, PAYER_IDS } from '@/lib/mock-data'
import type { PolicyDiff } from '@/lib/types'

export default function ChangesPage() {
  return (
    <AccessSheet
      capability="changes"
      returnTo="/changes"
      title="Change Radar"
      description="Quarter-over-quarter policy version diffs show what tightened, loosened, or was added across payers. Friction delta highlights approval burden shifts. Available to analyst accounts."
      requiredRole="analyst"
      fallbackHref="/sources"
      fallbackLabel="View sources"
    >
      <ChangesInner />
    </AccessSheet>
  )
}

function ChangesInner() {
  const [diffs, setDiffs] = useState<PolicyDiff[]>([])
  const [loading, setLoading] = useState(true)
  const [drugFilter, setDrugFilter] = useState('all')
  const [payerFilter, setPayerFilter] = useState('all')
  const [dirFilter, setDirFilter] = useState<'all' | 'tightened' | 'loosened'>('all')

  useEffect(() => {
    fetchDiffs().then((data) => {
      setDiffs(data)
      setLoading(false)
    })
  }, [])

  const visible = diffs.filter((diff) => {
    if (drugFilter !== 'all' && diff.drug_key !== drugFilter) return false
    if (payerFilter !== 'all' && diff.payer_id !== payerFilter) return false
    if (dirFilter !== 'all' && diff.overall_direction !== dirFilter) return false
    return true
  })

  const tightenedCount = diffs.filter((diff) => diff.overall_direction === 'tightened').length
  const loosenedCount = diffs.filter((diff) => diff.overall_direction === 'loosened').length

  return (
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Analyst Workflow"
        title="Change Radar"
        description="Quarter-over-quarter policy diffs show what tightened, loosened, or was added across payers. Friction delta highlights the real-world approval burden shift."
        icon={<RadarIcon />}
      />

      {!loading ? (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <WorkspaceMetricCard label="Policies tracked" value={diffs.length} />
          <WorkspaceMetricCard label="Tightened" value={tightenedCount} tone="danger" />
          <WorkspaceMetricCard label="Loosened" value={loosenedCount} tone="success" />
          <WorkspaceMetricCard label="Total changes" value={diffs.reduce((sum, diff) => sum + diff.changes.length, 0)} tone="accent" />
        </div>
      ) : null}

      {!loading && diffs.length > 0 ? (
        <div className="workspace-panel mb-8 px-5 py-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">
            Friction Score Delta by Policy
          </h2>
          <div className="space-y-2">
            {diffs.map((diff) => (
              <FrictionBar key={diff.id} diff={diff} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="workspace-panel mb-6 flex flex-wrap gap-3 px-4 py-4 sm:px-5">
        <select value={drugFilter} onChange={(event) => setDrugFilter(event.target.value)} className={selectCls}>
          <option value="all">All drugs</option>
          {DRUG_FAMILIES.map((drug) => (
            <option key={drug.key} value={drug.key}>
              {drug.display_name}
            </option>
          ))}
        </select>

        <select value={payerFilter} onChange={(event) => setPayerFilter(event.target.value)} className={selectCls}>
          <option value="all">All payers</option>
          {PAYER_IDS.map((id) => (
            <option key={id} value={id}>
              {PAYERS[id]}
            </option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--line-mid)' }}>
          {(['all', 'tightened', 'loosened'] as const).map((direction) => {
            const selected = dirFilter === direction
            const activeStyles =
              direction === 'tightened'
                ? { background: '#FFF1F2', color: '#BE123C' }
                : direction === 'loosened'
                ? { background: '#ECFDF5', color: '#047857' }
                : { background: 'var(--bg-soft)', color: 'var(--ink-strong)' }

            return (
              <button
                key={direction}
                type="button"
                onClick={() => setDirFilter(direction)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderRight: direction !== 'loosened' ? '1px solid var(--line-soft)' : 'none',
                  background: selected ? activeStyles.background : 'var(--bg-surface)',
                  color: selected ? activeStyles.color : 'var(--ink-muted)',
                }}
              >
                {direction === 'all' ? 'All' : direction === 'tightened' ? '↑ Tightened' : '↓ Loosened'}
              </button>
            )
          })}
        </div>

        {drugFilter !== 'all' || payerFilter !== 'all' || dirFilter !== 'all' ? (
          <button
            type="button"
            className="text-xs font-medium"
            style={{ color: 'var(--ink-muted)' }}
            onClick={() => {
              setDrugFilter('all')
              setPayerFilter('all')
              setDirFilter('all')
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : visible.length === 0 ? (
        <div className="workspace-empty px-8 py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
            No policy diffs match the selected filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {visible.map((diff) => (
            <ChangeRadar key={diff.id} diff={diff} />
          ))}
        </div>
      )}
    </WorkspacePage>
  )
}

function FrictionBar({ diff }: { diff: PolicyDiff }) {
  const tightened = diff.friction_delta > 0

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-40 shrink-0 truncate text-right font-mono" style={{ color: 'var(--ink-muted)' }}>
        {diff.drug_display_name}/{diff.payer_name.split(' ')[0]}
      </div>
      <div className="flex h-5 flex-1 items-center gap-1.5">
        <div className="relative h-3 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--line-soft)' }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${diff.friction_before}%`, background: 'var(--line-mid)' }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{ width: `${diff.friction_after}%`, background: tightened ? '#E11D48' : '#10B981' }}
          />
        </div>
        <span className="w-10 text-right font-mono font-bold" style={{ color: tightened ? '#BE123C' : '#047857' }}>
          {diff.friction_delta > 0 ? `+${diff.friction_delta}` : diff.friction_delta}
        </span>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((item) => (
        <div key={item} className="workspace-panel">
          <div className="space-y-2 px-5 py-4">
            <div className="shimmer h-4 w-48 rounded" />
            <div className="shimmer h-3 w-64 rounded" />
          </div>
          <div className="space-y-2 px-5 pb-4">
            {[1, 2].map((row) => (
              <div key={row} className="shimmer h-16 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const selectCls = 'workspace-select sm:w-auto'

function RadarIcon() {
  return (
    <svg className="h-4 w-4" style={{ color: 'var(--accent-cyan-deep)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  )
}
