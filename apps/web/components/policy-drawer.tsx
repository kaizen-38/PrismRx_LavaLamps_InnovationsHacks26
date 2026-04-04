'use client'

import { ExternalLink, Calendar, Shield, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Sheet } from './ui/sheet'
import { Badge } from './ui/badge'
import { FrictionBadge, FrictionScoreBar, FrictionFactorList } from './friction-badge'
import {
  cn,
  COVERAGE_STATUS_LABEL,
  COVERAGE_STATUS_COLOR,
  formatDate,
  frictionLevel,
} from '@/lib/utils'
import type { PolicyDNA, Citation } from '@/lib/types'

interface PolicyDrawerProps {
  policy: PolicyDNA | null
  onClose: () => void
}

export function PolicyDrawer({ policy, onClose }: PolicyDrawerProps) {
  const isOpen = policy !== null

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={policy ? `${policy.drug_display_name} — ${policy.payer_name}` : ''}
      description={policy ? `${policy.plan_type} · ${policy.version_label} · Effective ${formatDate(policy.effective_date)}` : ''}
    >
      {policy && <DrawerContent policy={policy} />}
    </Sheet>
  )
}

// ── Drawer content ────────────────────────────────────────────────────────────

function DrawerContent({ policy }: { policy: PolicyDNA }) {
  const level = frictionLevel(policy.friction_score)

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Status + PA row ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ring-1 ring-inset',
            COVERAGE_STATUS_COLOR[policy.coverage_status],
          )}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-80" />
          {COVERAGE_STATUS_LABEL[policy.coverage_status]}
        </span>

        {policy.pa_required && (
          <Badge variant="outline" className="text-xs gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            PA Required
          </Badge>
        )}

        {policy.step_therapy_required && (
          <Badge variant="outline" className="text-xs">
            Step Therapy
          </Badge>
        )}
      </div>

      {/* ── Friction score ── */}
      <Section title="Access Friction Score" icon={Shield}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className={cn(
              'font-medium',
              level === 'low'    && 'text-emerald-400',
              level === 'medium' && 'text-amber-400',
              level === 'high'   && 'text-red-400',
            )}>
              {level === 'low' ? 'Low administrative burden' :
               level === 'medium' ? 'Moderate administrative burden' :
               'High administrative burden'}
            </span>
            <FrictionBadge score={policy.friction_score} size="md" />
          </div>
          <FrictionScoreBar score={policy.friction_score} />
          <FrictionFactorList factors={policy.friction_factors} />
        </div>
      </Section>

      {/* ── Clinical criteria ── */}
      <Section title="Clinical Criteria" icon={CheckCircle2}>
        <div className="space-y-4">
          {policy.clinical_criteria.diagnosis_required.length > 0 && (
            <CriteriaBlock label="Covered Diagnoses">
              <ChipList items={policy.clinical_criteria.diagnosis_required} />
            </CriteriaBlock>
          )}

          {policy.clinical_criteria.prior_failure.length > 0 && (
            <CriteriaBlock label="Required Prior Therapy Failures">
              <ChipList items={policy.clinical_criteria.prior_failure} variant="amber" />
            </CriteriaBlock>
          )}

          {policy.clinical_criteria.specialty_required && (
            <CriteriaBlock label="Prescriber Specialty">
              <ChipList items={[policy.clinical_criteria.specialty_required]} variant="blue" />
            </CriteriaBlock>
          )}

          {policy.clinical_criteria.lab_requirements.length > 0 && (
            <CriteriaBlock label="Laboratory / Biomarker Requirements">
              <ChipList items={policy.clinical_criteria.lab_requirements} variant="violet" />
            </CriteriaBlock>
          )}

          {policy.clinical_criteria.age_restriction && (
            <CriteriaBlock label="Age Restriction">
              <ChipList items={[policy.clinical_criteria.age_restriction]} />
            </CriteriaBlock>
          )}

          {policy.clinical_criteria.additional_notes.length > 0 && (
            <CriteriaBlock label="Additional Notes">
              <ul className="space-y-1.5">
                {policy.clinical_criteria.additional_notes.map((note, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0 mt-1.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </CriteriaBlock>
          )}
        </div>
      </Section>

      {/* ── Operational rules ── */}
      {hasOperationalRules(policy) && (
        <Section title="Operational Rules" icon={FileText}>
          <div className="space-y-3 text-sm text-slate-400">
            {policy.operational_rules.site_of_care && (
              <OperationalRow
                label="Site of Care"
                value={policy.operational_rules.site_of_care}
                highlight={policy.friction_factors.site_of_care_restriction}
              />
            )}
            {policy.operational_rules.renewal_interval_days && (
              <OperationalRow
                label="Renewal Interval"
                value={`${policy.operational_rules.renewal_interval_days} days`}
                highlight={policy.friction_factors.renewal_complexity}
              />
            )}
            {policy.operational_rules.dosing_notes && (
              <OperationalRow label="Dosing Notes" value={policy.operational_rules.dosing_notes} />
            )}
            {policy.operational_rules.quantity_limit && (
              <OperationalRow label="Quantity Limit" value={policy.operational_rules.quantity_limit} />
            )}
            {policy.operational_rules.documentation_required.length > 0 && (
              <CriteriaBlock label="Documentation Required">
                <ChipList items={policy.operational_rules.documentation_required} />
              </CriteriaBlock>
            )}
          </div>
        </Section>
      )}

      {/* ── HCPCS codes ── */}
      {policy.hcpcs_codes.length > 0 && (
        <Section title="HCPCS / J-Codes" icon={FileText}>
          <div className="flex flex-wrap gap-1.5">
            {policy.hcpcs_codes.map((code) => (
              <span key={code} className="font-mono text-xs px-2 py-1 rounded-md bg-navy-800 text-cyan-400 border border-navy-700">
                {code}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Evidence citations ── */}
      {policy.evidence_citations.length > 0 && (
        <Section title="Evidence Citations" icon={ExternalLink}>
          <p className="text-xs text-slate-600 mb-3">
            Source-backed evidence spans from public payer policy documents.
          </p>
          <div className="space-y-4">
            {policy.evidence_citations.map((citation) => (
              <CitationCard key={citation.id} citation={citation} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Biosimilars ── */}
      {(policy.biosimilars.length > 0 || policy.reference_product) && (
        <Section title="Drug Variants" icon={FileText}>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-28 flex-shrink-0">Reference product</span>
              <span className="text-slate-300 font-medium">{policy.reference_product}</span>
            </div>
            {policy.biosimilars.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-slate-500 w-28 flex-shrink-0">Biosimilars</span>
                <div className="flex flex-wrap gap-1">
                  {policy.biosimilars.map((b) => (
                    <span key={b} className="text-xs px-2 py-0.5 rounded bg-navy-800 text-slate-300 border border-navy-700">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Compliance notice ── */}
      <div className="mt-2 p-3 rounded-lg bg-navy-800 border border-navy-700">
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="text-slate-500 font-medium">Data source: </span>
          Public payer policy documents only. This workspace uses no real patient data.
          All patient scenarios are synthetic. Architecture designed for HIPAA-adaptable deployment.
        </p>
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function CriteriaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function ChipList({
  items,
  variant = 'default',
}: {
  items: string[]
  variant?: 'default' | 'amber' | 'blue' | 'violet'
}) {
  const COLORS = {
    default: 'bg-navy-800 text-slate-300 border-navy-700',
    amber:   'bg-amber-500/10 text-amber-300 border-amber-500/20',
    blue:    'bg-blue-500/10 text-blue-300 border-blue-500/20',
    violet:  'bg-violet-500/10 text-violet-300 border-violet-500/20',
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            'inline-flex items-center text-xs px-2.5 py-1 rounded-md border',
            COLORS[variant],
          )}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function OperationalRow({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={cn('flex items-start gap-3 p-2.5 rounded-lg', highlight ? 'bg-amber-500/5 border border-amber-500/15' : '')}>
      <span className="text-slate-500 text-xs w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn('text-xs leading-relaxed', highlight ? 'text-amber-300' : 'text-slate-300')}>
        {highlight && <AlertTriangle className="w-3 h-3 inline-block mr-1 -mt-0.5 text-amber-400" />}
        {value}
      </span>
    </div>
  )
}

function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="rounded-lg border border-navy-700 bg-navy-800/50 overflow-hidden">
      {/* Source header — trust proof */}
      <div className="px-3 py-2 border-b border-navy-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="w-3 h-3 text-cyan-500 flex-shrink-0" />
          <span className="text-xs font-medium text-cyan-400 truncate">{citation.source_label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-slate-600">
          {citation.page && <span className="font-mono">p.{citation.page}</span>}
          {citation.section && (
            <span className="hidden sm:block text-slate-700 truncate max-w-[120px]" title={citation.section}>
              § {citation.section}
            </span>
          )}
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-cyan-400 transition-colors"
            aria-label="Open source document"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Quote */}
      <blockquote className="px-3 py-2.5">
        <p className="text-xs text-slate-400 leading-relaxed italic">
          &ldquo;{citation.quote}&rdquo;
        </p>
      </blockquote>

      {/* Effective date */}
      <div className="px-3 py-1.5 border-t border-navy-700 flex items-center gap-1.5">
        <Calendar className="w-3 h-3 text-slate-700" />
        <span className="text-xs text-slate-600">
          Effective {formatDate(citation.effective_date)}
        </span>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasOperationalRules(policy: PolicyDNA): boolean {
  const r = policy.operational_rules
  return !!(
    r.site_of_care ||
    r.renewal_interval_days ||
    r.dosing_notes ||
    r.quantity_limit ||
    r.documentation_required.length > 0
  )
}
