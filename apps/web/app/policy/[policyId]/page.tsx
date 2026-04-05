'use client'

import { use, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { FrictionBadge } from '@/components/friction-badge'
import { WorkspacePage } from '@/components/layout/workspace-page'
import { fetchPolicy } from '@/lib/api-client'
import { formatDate, COVERAGE_STATUS_COLOR, COVERAGE_STATUS_LABEL, cn } from '@/lib/utils'
import type { Citation, PolicyDNA } from '@/lib/types'

export default function PolicyDetailPage({ params }: { params: Promise<{ policyId: string }> }) {
  const { policyId } = use(params)
  const [policy, setPolicy] = useState<PolicyDNA | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolicy(policyId).then((result) => {
      setPolicy(result)
      setLoading(false)
    })
  }, [policyId])

  if (loading) {
    return (
      <WorkspacePage>
        <div className="shimmer h-10 w-56 rounded" />
      </WorkspacePage>
    )
  }

  if (!policy) {
    return (
      <WorkspacePage>
        <div className="workspace-empty py-20 text-center">
          <p className="mb-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
            Policy not found: <code className="font-mono text-cyan-700">{policyId}</code>
          </p>
          <a href="/matrix" className="workspace-link text-sm">
            Back to Coverage Matrix
          </a>
        </div>
      </WorkspacePage>
    )
  }

  return (
    <WorkspacePage>
      <div className="mb-6 flex items-center gap-2 text-xs" style={{ color: 'var(--ink-muted)' }}>
        <a href="/matrix" className="workspace-link">
          Coverage Matrix
        </a>
        <span>›</span>
        <span>{policy.drug_display_name}</span>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{policy.drug_display_name}</h1>
            <span className="text-xl text-slate-500">{policy.payer_name}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', COVERAGE_STATUS_COLOR[policy.coverage_status])}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {COVERAGE_STATUS_LABEL[policy.coverage_status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {policy.plan_type} · {policy.version_label} · Effective {formatDate(policy.effective_date)}
          </p>
        </div>

        <div className="workspace-panel px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">Access Friction Score</p>
          <div className="mt-2">
            <FrictionBadge score={policy.friction_score} size="md" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.65fr_1fr]">
        <div className="space-y-6">
          <Panel title="Authorization Requirements">
            <div className="flex flex-wrap gap-2">
              <Flag active={policy.pa_required} label="Prior Authorization" tone="amber" />
              <Flag active={policy.step_therapy_required} label="Step Therapy" tone="danger" />
              <Flag active={policy.friction_factors.specialist_gate} label="Specialist Required" tone="violet" />
              <Flag active={policy.friction_factors.lab_biomarker_gate} label="Lab / Biomarker Gate" tone="accent" />
              <Flag active={policy.friction_factors.site_of_care_restriction} label="Site of Care Restricted" tone="warning" />
            </div>
          </Panel>

          <Panel title="Clinical Criteria">
            <div className="space-y-4">
              {policy.clinical_criteria.prior_failure.length > 0 ? (
                <ListSection label="Prior therapy failures required" items={policy.clinical_criteria.prior_failure} />
              ) : null}
              {policy.clinical_criteria.diagnosis_required.length > 0 ? (
                <ListSection label="Qualifying diagnoses" items={policy.clinical_criteria.diagnosis_required} />
              ) : null}
              {policy.clinical_criteria.specialty_required ? (
                <TextSection label="Prescriber specialty" value={policy.clinical_criteria.specialty_required} />
              ) : null}
              {policy.clinical_criteria.lab_requirements.length > 0 ? (
                <ListSection label="Lab requirements" items={policy.clinical_criteria.lab_requirements} />
              ) : null}
              {policy.clinical_criteria.age_restriction ? (
                <TextSection label="Age restriction" value={policy.clinical_criteria.age_restriction} />
              ) : null}
              {policy.clinical_criteria.additional_notes.length > 0 ? (
                <ListSection label="Additional notes" items={policy.clinical_criteria.additional_notes} italic />
              ) : null}
            </div>
          </Panel>

          <Panel title="Operational Rules">
            <div className="space-y-4">
              {policy.operational_rules.site_of_care ? <TextSection label="Site of care" value={policy.operational_rules.site_of_care} /> : null}
              {policy.operational_rules.dosing_notes ? <TextSection label="Dosing notes" value={policy.operational_rules.dosing_notes} /> : null}
              {policy.operational_rules.quantity_limit ? <TextSection label="Quantity limit" value={policy.operational_rules.quantity_limit} /> : null}
              {policy.operational_rules.renewal_interval_days ? (
                <TextSection label="Renewal interval" value={`${policy.operational_rules.renewal_interval_days} days`} />
              ) : null}
              {policy.operational_rules.documentation_required.length > 0 ? (
                <ListSection label="Documentation required" items={policy.operational_rules.documentation_required} />
              ) : null}
            </div>
          </Panel>

          <Panel title="Source Citations">
            <div className="space-y-4">
              {policy.evidence_citations.map((citation) => (
                <CitationCard key={citation.id} citation={citation} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Drug Information">
            <div className="space-y-4">
              <TextSection label="Reference product" value={policy.reference_product} />
              {policy.biosimilars.length > 0 ? (
                <ChipSection label="Biosimilars" items={policy.biosimilars} />
              ) : null}
              {policy.hcpcs_codes.length > 0 ? (
                <ChipSection label="HCPCS / J-codes" items={policy.hcpcs_codes} mono />
              ) : null}
            </div>
          </Panel>

          <Panel title="Actions">
            <div className="space-y-2">
              <a
                href={`/simulate?drug=${policy.canonical_drug_key}`}
                className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold"
                style={{ borderColor: 'rgba(124, 58, 237, 0.18)', background: 'var(--accent-violet-soft)', color: 'var(--accent-violet)' }}
              >
                Run simulation for this drug
                <span>→</span>
              </a>
              <a
                href={`/compare?drug=${policy.canonical_drug_key}`}
                className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-sm font-semibold"
                style={{ borderColor: 'var(--line-soft)', background: 'var(--bg-soft)', color: 'var(--ink-strong)' }}
              >
                Compare across payers
                <span>→</span>
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </WorkspacePage>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="workspace-panel px-5 py-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{title}</h2>
      {children}
    </section>
  )
}

function ListSection({
  label,
  items,
  italic = false,
}: {
  label: string
  items: string[]
  italic?: boolean
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className={cn('flex items-start gap-2 text-sm text-slate-700', italic && 'italic')}>
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TextSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</p>
      <p className="text-sm leading-6 text-slate-700">{value}</p>
    </div>
  )
}

function ChipSection({ label, items, mono = false }: { label: string; items: string[]; mono?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={cn('rounded-lg border bg-slate-50 px-2.5 py-1 text-xs text-slate-700', mono && 'font-mono')}
            style={{ borderColor: 'var(--line-soft)' }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="rounded-xl border bg-slate-50 px-4 py-3" style={{ borderColor: 'var(--line-soft)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-semibold text-cyan-700">{citation.source_label}</p>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          {citation.page !== null ? <span>p.{citation.page}</span> : null}
          {citation.section ? <span>§ {citation.section}</span> : null}
          <span>{citation.effective_date}</span>
        </div>
      </div>
      <blockquote className="mt-2 border-l-2 border-cyan-600 pl-3 text-sm italic leading-6 text-slate-700">
        &ldquo;{citation.quote}&rdquo;
      </blockquote>
      <div className="mt-3">
        <a href={citation.source_url} target="_blank" rel="noopener noreferrer" className="workspace-link text-xs font-semibold">
          View source ↗
        </a>
      </div>
    </div>
  )
}

function Flag({
  active,
  label,
  tone,
}: {
  active: boolean
  label: string
  tone: 'accent' | 'amber' | 'danger' | 'violet' | 'warning'
}) {
  if (!active) {
    return (
      <Badge variant="outline" className="text-slate-500">
        {label}
      </Badge>
    )
  }

  const variantMap = {
    accent: 'cyan',
    amber: 'conditional',
    danger: 'not_covered',
    violet: 'violet',
    warning: 'nonpreferred',
  } as const

  return <Badge variant={variantMap[tone]}>{label}</Badge>
}
