'use client'

import { ExternalLink, Calendar, Shield, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Sheet } from './ui/sheet'
import { FrictionBadge, FrictionScoreBar, FrictionFactorList } from './friction-badge'
import { VoiceBrief } from './voice/VoiceBrief'
import { formatDate, frictionLevel, COVERAGE_STATUS_LABEL } from '@/lib/utils'
import type { PolicyDNA, Citation } from '@/lib/types'

interface PolicyDrawerProps {
  policy: PolicyDNA | null
  onClose: () => void
}

export function PolicyDrawer({ policy, onClose }: PolicyDrawerProps) {
  return (
    <Sheet
      open={policy !== null}
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

  // Paperlight semantic status chips
  const statusStyle: Record<string, { color: string; bg: string }> = {
    covered:     { color: '#0F766E', bg: '#EAF8F4' },
    preferred:   { color: '#2B50FF', bg: '#ECF1FF' },
    conditional: { color: '#B45309', bg: '#FFF6E8' },
    nonpreferred:{ color: '#C2410C', bg: '#FFF1EB' },
    not_covered: { color: '#BE123C', bg: '#FFF0F4' },
    unclear:     { color: '#64748B', bg: '#F3F6FB' },
  }
  const ss = statusStyle[policy.coverage_status] ?? statusStyle.unclear

  const frictionLabel = level === 'low' ? 'Low administrative burden' : level === 'medium' ? 'Moderate administrative burden' : 'High administrative burden'
  const frictionColor = level === 'low' ? '#0F766E' : level === 'medium' ? '#B45309' : '#C2410C'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 32 }}>

      {/* Status + PA row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 9999,
            fontSize: 13, fontWeight: 600,
            color: ss.color, background: ss.bg,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: ss.color }} />
          {COVERAGE_STATUS_LABEL[policy.coverage_status]}
        </span>

        {policy.pa_required && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 9999,
              fontSize: 12, fontWeight: 600,
              color: '#B45309', background: '#FFF6E8',
              border: '1px solid #B4530920',
            }}
          >
            <AlertTriangle className="w-3 h-3" />
            PA Required
          </span>
        )}

        {policy.step_therapy_required && (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 9999,
              fontSize: 12, fontWeight: 600,
              color: '#64748B', background: '#F3F6FB',
              border: '1px solid #E7EDF5',
            }}
          >
            Step Therapy
          </span>
        )}
      </div>

      {/* Voice brief */}
      <VoiceBrief
        context="matrix"
        drug={policy.drug_display_name}
        payer={policy.payer_name}
        status={policy.coverage_status}
        blockers={[
          ...policy.clinical_criteria.prior_failure.slice(0, 2),
          ...(policy.operational_rules.site_of_care ? [policy.operational_rules.site_of_care] : []),
        ]}
        next_step={policy.clinical_criteria.additional_notes[0]}
        raw_json={policy}
      />

      {/* Friction score */}
      <Section title="Access Friction Score" icon={Shield}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: frictionColor }}>{frictionLabel}</span>
            <FrictionBadge score={policy.friction_score} size="md" />
          </div>
          <FrictionScoreBar score={policy.friction_score} />
          <FrictionFactorList factors={policy.friction_factors} />
        </div>
      </Section>

      {/* Clinical criteria */}
      <Section title="Clinical Criteria" icon={CheckCircle2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {policy.clinical_criteria.additional_notes.map((note, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#64748B' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0, marginTop: 5 }} />
                    {note}
                  </li>
                ))}
              </ul>
            </CriteriaBlock>
          )}
        </div>
      </Section>

      {/* Operational rules */}
      {hasOperationalRules(policy) && (
        <Section title="Operational Rules" icon={FileText}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {policy.operational_rules.site_of_care && (
              <OperationalRow label="Site of Care" value={policy.operational_rules.site_of_care} highlight={policy.friction_factors.site_of_care_restriction} />
            )}
            {policy.operational_rules.renewal_interval_days && (
              <OperationalRow label="Renewal Interval" value={`${policy.operational_rules.renewal_interval_days} days`} highlight={policy.friction_factors.renewal_complexity} />
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

      {/* HCPCS codes */}
      {policy.hcpcs_codes.length > 0 && (
        <Section title="HCPCS / J-Codes" icon={FileText}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {policy.hcpcs_codes.map((code) => (
              <span
                key={code}
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 11, fontWeight: 500,
                  padding: '3px 8px', borderRadius: 6,
                  color: '#2B50FF', background: '#ECF1FF',
                  border: '1px solid #2B50FF20',
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Evidence citations */}
      {policy.evidence_citations.length > 0 && (
        <Section title="Evidence Citations" icon={ExternalLink}>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>
            Source-backed evidence from public payer policy documents.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {policy.evidence_citations.map((citation) => (
              <CitationCard key={citation.id} citation={citation} />
            ))}
          </div>
        </Section>
      )}

      {/* Biosimilars */}
      {(policy.biosimilars.length > 0 || policy.reference_product) && (
        <Section title="Drug Variants" icon={FileText}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#94A3B8', width: 120, flexShrink: 0 }}>Reference product</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{policy.reference_product}</span>
            </div>
            {policy.biosimilars.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#94A3B8', width: 120, flexShrink: 0 }}>Biosimilars</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {policy.biosimilars.map((b) => (
                    <span key={b} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, color: '#334155', background: '#F3F6FB', border: '1px solid #E7EDF5' }}>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Compliance notice */}
      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#F3F6FB', border: '1px solid #E7EDF5' }}>
        <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
          <span style={{ color: '#64748B', fontWeight: 600 }}>Data source: </span>
          Public payer policy documents only. No real patient data. All patient scenarios are synthetic.
        </p>
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Icon className="w-3.5 h-3.5" style={{ color: '#94A3B8' }} />
        <h3 style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

function CriteriaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      {children}
    </div>
  )
}

function ChipList({ items, variant = 'default' }: { items: string[]; variant?: 'default' | 'amber' | 'blue' | 'violet' }) {
  const COLORS = {
    default: { color: '#334155', bg: '#F3F6FB', border: '#E7EDF5' },
    amber:   { color: '#B45309', bg: '#FFF6E8', border: '#B4530920' },
    blue:    { color: '#2B50FF', bg: '#ECF1FF', border: '#2B50FF20' },
    violet:  { color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED20' },
  }
  const c = COLORS[variant]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            display: 'inline-flex', alignItems: 'center',
            fontSize: 12, padding: '4px 10px', borderRadius: 7,
            color: c.color, background: c.bg, border: `1px solid ${c.border}`,
            lineHeight: 1.5,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function OperationalRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '8px 10px', borderRadius: 8,
        background: highlight ? '#FFF6E8' : 'transparent',
        border: highlight ? '1px solid #B4530920' : 'none',
      }}
    >
      <span style={{ fontSize: 12, color: '#94A3B8', width: 112, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: highlight ? '#B45309' : '#334155', lineHeight: 1.55 }}>
        {highlight && <AlertTriangle className="w-3 h-3 inline-block mr-1 -mt-0.5" style={{ color: '#B45309' }} />}
        {value}
      </span>
    </div>
  )
}

function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid #E7EDF5', overflow: 'hidden' }}>
      {/* Source header */}
      <div
        style={{
          padding: '7px 12px',
          borderBottom: '1px solid #E7EDF5',
          background: '#F3F6FB',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <FileText className="w-3 h-3 flex-shrink-0" style={{ color: '#2B50FF' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2B50FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {citation.source_label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, fontSize: 11, color: '#94A3B8' }}>
          {citation.page && <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>p.{citation.page}</span>}
          {citation.section && (
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={citation.section}>
              § {citation.section}
            </span>
          )}
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#94A3B8' }}
            aria-label="Open source document"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Quote */}
      <blockquote style={{ padding: '10px 12px', background: '#FFFFFF' }}>
        <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.65, fontStyle: 'italic' }}>
          &ldquo;{citation.quote}&rdquo;
        </p>
      </blockquote>

      {/* Effective date */}
      <div
        style={{
          padding: '5px 12px',
          borderTop: '1px solid #E7EDF5',
          background: '#F3F6FB',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Calendar className="w-3 h-3" style={{ color: '#CBD5E1' }} />
        <span style={{ fontSize: 11, color: '#94A3B8' }}>Effective {formatDate(citation.effective_date)}</span>
      </div>
    </div>
  )
}

function hasOperationalRules(policy: PolicyDNA): boolean {
  const r = policy.operational_rules
  return !!(r.site_of_care || r.renewal_interval_days || r.dosing_notes || r.quantity_limit || r.documentation_required.length > 0)
}
