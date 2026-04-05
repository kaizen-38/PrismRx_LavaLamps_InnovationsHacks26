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

export default function ComparePage() {
  return (
    <Suspense fallback={<PageShell><div className="shimmer h-8 w-48 rounded" /></PageShell>}>
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
    <PageShell>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-700">
            <CompareIcon />
          </span>
          <h1 className="text-2xl font-bold text-slate-100">Compare</h1>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          Side-by-side payer comparison for a single drug family.
          Every criterion is backed by a source citation.
        </p>
      </div>

      {/* Drug selector */}
      <div className="flex items-center gap-3 mb-8">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Drug family</label>
        <select
          value={drugKey}
          onChange={e => setDrugKey(e.target.value)}
          className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-600 transition-colors"
        >
          {DRUG_FAMILIES.map(d => (
            <option key={d.key} value={d.key}>{d.display_name} ({d.reference_product})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <CompareTableSkeleton />
      ) : policies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-navy-600 bg-navy-900/50 px-8 py-16 text-center">
          <p className="text-slate-500 text-sm">No policies found for this drug.</p>
        </div>
      ) : (
        <CompareTable policies={policies} />
      )}
    </PageShell>
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
        const color = p.friction_score >= 70 ? 'text-red-400' : p.friction_score >= 45 ? 'text-amber-400' : 'text-emerald-400'
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
        ? <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">{p.clinical_criteria.prior_failure.map((f, i) => <li key={i}>{f}</li>)}</ul>
        : <span className="text-xs text-slate-600">None</span>,
    },
    {
      label: 'Specialist Gate',
      render: p => p.clinical_criteria.specialty_required
        ? <span className="text-xs text-slate-300">{p.clinical_criteria.specialty_required}</span>
        : <span className="text-xs text-slate-600">None</span>,
    },
    {
      label: 'Lab Requirements',
      render: p => p.clinical_criteria.lab_requirements.length > 0
        ? <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">{p.clinical_criteria.lab_requirements.map((l, i) => <li key={i}>{l}</li>)}</ul>
        : <span className="text-xs text-slate-600">None</span>,
    },
    {
      label: 'Site of Care',
      render: p => <span className="text-xs text-slate-300">{p.operational_rules.site_of_care ?? '—'}</span>,
    },
    {
      label: 'Renewal Interval',
      render: p => <span className="text-xs text-slate-300">{p.operational_rules.renewal_interval_days ? `${p.operational_rules.renewal_interval_days} days` : '—'}</span>,
    },
    {
      label: 'Effective Date',
      render: p => <span className="text-xs font-mono text-slate-400">{p.effective_date}</span>,
    },
    {
      label: 'Citations',
      render: p => (
        <a
          href={`/policy/${p.id}`}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
        >
          {p.evidence_citations.length} source{p.evidence_citations.length !== 1 ? 's' : ''} →
        </a>
      ),
    },
  ]

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-navy-700">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 w-40">Criterion</th>
            {policies.map(p => (
              <th key={p.id} className="text-left px-4 py-3">
                <p className="text-xs font-bold text-slate-200">{p.payer_name}</p>
                <p className="text-[10px] text-slate-500 font-mono font-normal">{p.plan_type}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={i} className="border-b border-navy-800 hover:bg-navy-800/40 transition-colors">
              <td className="px-4 py-3 text-xs font-semibold text-slate-500 align-top">{row.label}</td>
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
    covered:      'bg-emerald-900/40 border-emerald-700 text-emerald-400',
    conditional:  'bg-amber-900/30 border-amber-700 text-amber-400',
    preferred:    'bg-blue-900/30 border-blue-700 text-blue-400',
    nonpreferred: 'bg-orange-900/30 border-orange-700 text-orange-400',
    not_covered:  'bg-red-900/40 border-red-700 text-red-400',
    unclear:      'bg-navy-700 border-navy-600 text-slate-500',
  }
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${map[status] ?? map.unclear}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function YesNo({ value }: { value: boolean }) {
  return value
    ? <span className="text-xs font-semibold text-amber-400">Yes</span>
    : <span className="text-xs text-slate-600">No</span>
}

function CompareTableSkeleton() {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 overflow-hidden">
      <div className="p-4 space-y-3">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="shimmer h-8 rounded" />
        ))}
      </div>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-950">
      <div className="mx-auto max-w-screen-xl px-6 py-10">{children}</div>
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
