'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Compare page  /compare
// Side-by-side payer comparison for one drug family.
// Answers: how do payer policies differ for this drug?
// Public — no auth required.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PolicyDNA } from '@/lib/types'
import { fetchPoliciesByDrug } from '@/lib/api-client'
import { DRUG_FAMILIES } from '@/lib/mock-data'
import { WorkspaceHeader, WorkspacePage } from '@/components/layout/workspace-page'

export default function ComparePage() {
  return (
    <Suspense fallback={<WorkspacePage><div className="shimmer h-8 w-48 rounded" /></WorkspacePage>}>
      <CompareInner />
    </Suspense>
  )
}

function CompareInner() {
  const searchParams = useSearchParams()
  const initialDrug = searchParams.get('drug') ?? 'infliximab'

  const [drugKey, setDrugKey] = useState(initialDrug)
  const [policies, setPolicies] = useState<PolicyDNA[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchPoliciesByDrug(drugKey).then(data => {
      setPolicies(data)
      setLoading(false)
    })
  }, [drugKey])

  return (
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Cross-payer View"
        title="Compare"
        description="Side-by-side payer comparison for a single drug family. Every criterion is backed by a source citation."
        icon={<CompareIcon />}
      />

      {/* Drug selector */}
      <div className="workspace-panel mb-8 flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Drug family</label>
        <select
          value={drugKey}
          onChange={e => setDrugKey(e.target.value)}
          className="workspace-select max-w-full sm:w-auto"
        >
          {DRUG_FAMILIES.map(d => (
            <option key={d.key} value={d.key}>{d.display_name} ({d.reference_product})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <CompareTableSkeleton />
      ) : policies.length === 0 ? (
        <div className="workspace-empty px-8 py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>No policies found for this drug.</p>
        </div>
      ) : (
        <CompareTable policies={policies} />
      )}
    </WorkspacePage>
  )
}

// ── CompareTable ──────────────────────────────────────────────────────────────

function CompareTable({ policies }: { policies: PolicyDNA[] }) {
  const ROWS: { label: string; render: (p: PolicyDNA) => React.ReactNode }[] = [
    {
      label: 'Coverage Status',
      render: p => <CoverageChip status={p.coverage_status} />,
    },
    {
      label: 'Friction Score',
      render: p => {
        const color = p.friction_score >= 70 ? 'text-rose-700' : p.friction_score >= 45 ? 'text-amber-700' : 'text-emerald-700'
        return <span className={`text-lg font-bold font-mono ${color}`}>{p.friction_score}</span>
      },
    },
    {
      label: 'Prior Auth',
      render: p => <YesNo value={p.pa_required} />,
    },
    {
      label: 'Step Therapy',
      render: p => <YesNo value={p.step_therapy_required} />,
    },
    {
      label: 'Prior Failures Required',
      render: p => p.clinical_criteria.prior_failure.length > 0
        ? <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-700">{p.clinical_criteria.prior_failure.map((f, i) => <li key={i}>{f}</li>)}</ul>
        : <span className="text-xs text-slate-500">None</span>,
    },
    {
      label: 'Specialist Gate',
      render: p => p.clinical_criteria.specialty_required
        ? <span className="text-xs text-slate-700">{p.clinical_criteria.specialty_required}</span>
        : <span className="text-xs text-slate-500">None</span>,
    },
    {
      label: 'Lab Requirements',
      render: p => p.clinical_criteria.lab_requirements.length > 0
        ? <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-700">{p.clinical_criteria.lab_requirements.map((l, i) => <li key={i}>{l}</li>)}</ul>
        : <span className="text-xs text-slate-500">None</span>,
    },
    {
      label: 'Site of Care',
      render: p => <span className="text-xs text-slate-700">{p.operational_rules.site_of_care ?? '—'}</span>,
    },
    {
      label: 'Renewal Interval',
      render: p => <span className="text-xs text-slate-700">{p.operational_rules.renewal_interval_days ? `${p.operational_rules.renewal_interval_days} days` : '—'}</span>,
    },
    {
      label: 'Effective Date',
      render: p => <span className="text-xs font-mono text-slate-500">{p.effective_date}</span>,
    },
    {
      label: 'Citations',
      render: p => (
        <a
          href={`/policy/${p.id}`}
          className="workspace-link text-xs underline underline-offset-2"
        >
          {p.evidence_citations.length} source{p.evidence_citations.length !== 1 ? 's' : ''} →
        </a>
      ),
    },
  ]

  return (
    <div className="workspace-panel overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line-soft)', background: 'var(--bg-soft)' }}>
            <th className="w-40 px-4 py-3 text-left text-xs font-semibold text-slate-600">Criterion</th>
            {policies.map(p => (
              <th key={p.id} className="text-left px-4 py-3">
                <p className="text-xs font-bold text-slate-900">{p.payer_name}</p>
                <p className="text-[10px] font-mono font-normal text-slate-500">{p.plan_type}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-slate-50" style={{ borderBottom: '1px solid var(--line-soft)' }}>
              <td className="px-4 py-3 align-top text-xs font-semibold text-slate-600">{row.label}</td>
              {policies.map(p => (
                <td key={p.id} className="px-4 py-3 align-top">{row.render(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CoverageChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    covered:      'bg-emerald-50 border-emerald-200 text-emerald-700',
    conditional:  'bg-amber-50 border-amber-200 text-amber-700',
    preferred:    'bg-cyan-50 border-cyan-200 text-cyan-700',
    nonpreferred: 'bg-orange-50 border-orange-200 text-orange-700',
    not_covered:  'bg-rose-50 border-rose-200 text-rose-700',
    unclear:      'bg-slate-100 border-slate-200 text-slate-600',
  }
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${map[status] ?? map.unclear}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function YesNo({ value }: { value: boolean }) {
  return value
    ? <span className="text-xs font-semibold text-amber-700">Yes</span>
    : <span className="text-xs text-slate-500">No</span>
}

function CompareTableSkeleton() {
  return (
    <div className="workspace-panel overflow-hidden">
      <div className="p-4 space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="shimmer h-8 rounded" />
        ))}
      </div>
    </div>
  )
}

function CompareIcon() {
  return (
    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
