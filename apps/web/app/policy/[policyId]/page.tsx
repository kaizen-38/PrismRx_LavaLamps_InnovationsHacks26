'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Policy Detail page  /policy/[policyId]
// Citation-rich view: coverage status, criteria chips, source quotes with
// page/section references. Reachable from matrix cell click or compare page.
// Public — no auth required.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, use } from 'react'
import { fetchPolicy } from '@/lib/api-client'
import type { PolicyDNA, Citation } from '@/lib/types'

export default function PolicyDetailPage({ params }: { params: Promise<{ policyId: string }> }) {
  const { policyId } = use(params)
  const [policy, setPolicy] = useState<PolicyDNA | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicy(policyId).then(p => { setPolicy(p); setLoading(false) })
  }, [policyId])

  if (loading) return <PageShell><LoadingSkeleton /></PageShell>
  if (!policy) return (
    <PageShell>
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">Policy not found: <code className="font-mono text-cyan-400">{policyId}</code></p>
        <a href="/matrix" className="text-xs text-cyan-400 hover:text-cyan-300">← Back to Matrix</a>
      </div>
    </PageShell>
  )

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <a href="/matrix" className="hover:text-slate-300 transition-colors">Matrix</a>
        <span>›</span>
        <span className="text-slate-300">{policy.drug_display_name} · {policy.payer_name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">
              {policy.drug_display_name}
            </h1>
            <span className="text-slate-500">·</span>
            <span className="text-xl text-slate-300">{policy.payer_name}</span>
            <CoverageStatusBadge status={policy.coverage_status} />
          </div>
          <p className="text-sm text-slate-500 font-mono">
            {policy.plan_type} · {policy.version_label} · Effective {policy.effective_date}
          </p>
        </div>
        <FrictionScore score={policy.friction_score} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main criteria */}
        <div className="lg:col-span-2 space-y-6">

          {/* PA / step therapy flags */}
          <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4">
            <h2 className={sectionTitle}>Authorization Requirements</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <FlagChip active={policy.pa_required} label="Prior Authorization" activeColor="bg-amber-900/40 border-amber-700 text-amber-300" />
              <FlagChip active={policy.step_therapy_required} label="Step Therapy" activeColor="bg-red-900/40 border-red-700 text-red-300" />
              <FlagChip active={policy.friction_factors.specialist_gate} label="Specialist Required" activeColor="bg-violet-900/40 border-violet-700 text-violet-300" />
              <FlagChip active={policy.friction_factors.lab_biomarker_gate} label="Lab / Biomarker Gate" activeColor="bg-blue-900/40 border-blue-700 text-blue-300" />
              <FlagChip active={policy.friction_factors.site_of_care_restriction} label="Site of Care Restricted" activeColor="bg-orange-900/40 border-orange-700 text-orange-300" />
            </div>
          </div>

          {/* Clinical criteria */}
          <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4 space-y-4">
            <h2 className={sectionTitle}>Clinical Criteria</h2>

            {policy.clinical_criteria.prior_failure.length > 0 && (
              <CriteriaSection label="Prior Therapy Failures Required">
                {policy.clinical_criteria.prior_failure.map((t, i) => (
                  <li key={i} className="text-sm text-slate-300">{t}</li>
                ))}
              </CriteriaSection>
            )}

            {policy.clinical_criteria.diagnosis_required.length > 0 && (
              <CriteriaSection label="Qualifying Diagnoses">
                {policy.clinical_criteria.diagnosis_required.map((d, i) => (
                  <li key={i} className="text-sm text-slate-300">{d}</li>
                ))}
              </CriteriaSection>
            )}

            {policy.clinical_criteria.specialty_required && (
              <div>
                <p className={subLabel}>Prescriber Specialty</p>
                <p className="text-sm text-slate-300">{policy.clinical_criteria.specialty_required}</p>
              </div>
            )}

            {policy.clinical_criteria.lab_requirements.length > 0 && (
              <CriteriaSection label="Lab Requirements">
                {policy.clinical_criteria.lab_requirements.map((l, i) => (
                  <li key={i} className="text-sm text-slate-300">{l}</li>
                ))}
              </CriteriaSection>
            )}

            {policy.clinical_criteria.age_restriction && (
              <div>
                <p className={subLabel}>Age Restriction</p>
                <p className="text-sm text-slate-300">{policy.clinical_criteria.age_restriction}</p>
              </div>
            )}

            {policy.clinical_criteria.additional_notes.length > 0 && (
              <CriteriaSection label="Additional Notes">
                {policy.clinical_criteria.additional_notes.map((n, i) => (
                  <li key={i} className="text-sm text-slate-400 italic">{n}</li>
                ))}
              </CriteriaSection>
            )}
          </div>

          {/* Operational rules */}
          <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4 space-y-3">
            <h2 className={sectionTitle}>Operational Rules</h2>
            {policy.operational_rules.site_of_care && (
              <div>
                <p className={subLabel}>Site of Care</p>
                <p className="text-sm text-slate-300">{policy.operational_rules.site_of_care}</p>
              </div>
            )}
            {policy.operational_rules.dosing_notes && (
              <div>
                <p className={subLabel}>Dosing</p>
                <p className="text-sm text-slate-300">{policy.operational_rules.dosing_notes}</p>
              </div>
            )}
            {policy.operational_rules.quantity_limit && (
              <div>
                <p className={subLabel}>Quantity Limit</p>
                <p className="text-sm text-slate-300">{policy.operational_rules.quantity_limit}</p>
              </div>
            )}
            {policy.operational_rules.renewal_interval_days && (
              <div>
                <p className={subLabel}>Renewal Interval</p>
                <p className="text-sm text-slate-300">{policy.operational_rules.renewal_interval_days} days</p>
              </div>
            )}
            {policy.operational_rules.documentation_required.length > 0 && (
              <CriteriaSection label="Documentation Required">
                {policy.operational_rules.documentation_required.map((d, i) => (
                  <li key={i} className="text-sm text-slate-300">{d}</li>
                ))}
              </CriteriaSection>
            )}
          </div>

          {/* Evidence citations */}
          <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4 space-y-4">
            <h2 className={sectionTitle}>Source Citations</h2>
            {policy.evidence_citations.map((cite, i) => (
              <CitationBlock key={i} citation={cite} />
            ))}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          {/* Drug info */}
          <div className="rounded-xl border border-navy-700 bg-navy-900 px-4 py-4 space-y-3">
            <h2 className={sectionTitle}>Drug Information</h2>
            <div>
              <p className={subLabel}>Reference Product</p>
              <p className="text-sm text-slate-300">{policy.reference_product}</p>
            </div>
            {policy.biosimilars.length > 0 && (
              <div>
                <p className={subLabel}>Biosimilars</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {policy.biosimilars.map(b => (
                    <span key={b} className="text-xs bg-navy-800 border border-navy-600 rounded px-2 py-0.5 text-slate-400">{b}</span>
                  ))}
                </div>
              </div>
            )}
            {policy.hcpcs_codes.length > 0 && (
              <div>
                <p className={subLabel}>HCPCS / J-codes</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {policy.hcpcs_codes.map(c => (
                    <span key={c} className="text-xs font-mono bg-navy-800 border border-navy-600 rounded px-2 py-0.5 text-cyan-400">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-navy-700 bg-navy-900 px-4 py-4 space-y-2">
            <h2 className={sectionTitle}>Actions</h2>
            <a
              href={`/simulate?drug=${policy.canonical_drug_key}`}
              className="flex items-center gap-2 w-full rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-700/60 px-3 py-2.5 text-xs font-medium text-violet-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Run simulation for this drug
            </a>
            <a
              href={`/compare?drug=${policy.canonical_drug_key}`}
              className="flex items-center gap-2 w-full rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 px-3 py-2.5 text-xs font-medium text-slate-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Compare across payers
            </a>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

// ── Citation block ────────────────────────────────────────────────────────────

function CitationBlock({ citation }: { citation: Citation }) {
  return (
    <div className="rounded-lg border border-navy-600 bg-navy-800 px-4 py-3 space-y-1.5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs font-semibold text-cyan-400 leading-snug">{citation.source_label}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono shrink-0">
          {citation.page !== null && <span>p.{citation.page}</span>}
          {citation.section && <span>§ {citation.section}</span>}
          <span>{citation.effective_date}</span>
        </div>
      </div>
      <blockquote className="text-xs text-slate-300 italic border-l-2 border-cyan-700 pl-3 leading-relaxed">
        "{citation.quote}"
      </blockquote>
    </div>
  )
}

// ── Small reusable bits ───────────────────────────────────────────────────────

function CoverageStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    covered:      'bg-emerald-900/40 border-emerald-700 text-emerald-400',
    conditional:  'bg-amber-900/30 border-amber-700 text-amber-400',
    preferred:    'bg-blue-900/30 border-blue-700 text-blue-400',
    nonpreferred: 'bg-orange-900/30 border-orange-700 text-orange-400',
    not_covered:  'bg-red-900/40 border-red-700 text-red-400',
    unclear:      'bg-navy-700 border-navy-600 text-slate-500',
  }
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${map[status] ?? map.unclear}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function FlagChip({ active, label, activeColor }: { active: boolean; label: string; activeColor: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
      active ? activeColor : 'border-navy-700 bg-navy-800 text-slate-600 line-through'
    }`}>
      {label}
    </span>
  )
}

function FrictionScore({ score }: { score: number }) {
  const color = score >= 70 ? 'text-red-400' : score >= 45 ? 'text-amber-400' : 'text-emerald-400'
  const label = score >= 70 ? 'High friction' : score >= 45 ? 'Medium friction' : 'Low friction'
  return (
    <div className="text-right">
      <p className={`text-3xl font-bold font-mono ${color}`}>{score}</p>
      <p className="text-xs text-slate-500">{label} · Access Friction Score</p>
    </div>
  )
}

function CriteriaSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={subLabel}>{label}</p>
      <ul className="mt-1 space-y-0.5 list-disc list-inside">{children}</ul>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-8 w-64 rounded" />
      <div className="shimmer h-4 w-48 rounded" />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[1,2,3].map(i => <div key={i} className="shimmer h-32 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          <div className="shimmer h-40 rounded-xl" />
          <div className="shimmer h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-screen-xl px-6 py-10">{children}</div>
}

const sectionTitle = 'text-xs font-semibold text-slate-400 uppercase tracking-wider'
const subLabel = 'text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5'
