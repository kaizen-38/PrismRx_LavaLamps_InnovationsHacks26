// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — ManualPolicyRepository
// Reads the current indexed/manual PolicyDNA dataset from mock-data.ts.
// Source of truth: local static data. No live web fetch.
// ─────────────────────────────────────────────────────────────────────────────

import { MOCK_POLICIES, DRUG_FAMILIES, PAYERS } from '@/lib/mock-data'
import { normalizePayer, normalizeDrug, PAYER_ALIAS_MAP, DRUG_ALIAS_MAP } from './normalization'
import type {
  PolicyRepository,
  ResolvedPayer,
  ResolvedDrug,
  CoverageRecord,
  PolicyDetails,
  PolicyEvidence,
  RelatedCombination,
} from './repository'

// ── Build resolved payer map ──────────────────────────────────────────────────

const RESOLVED_PAYERS: ResolvedPayer[] = Object.entries(PAYERS).map(([id, displayName]) => ({
  id,
  displayName,
  aliases: PAYER_ALIAS_MAP[id] ?? [],
}))

// ── Build resolved drug map ───────────────────────────────────────────────────

const RESOLVED_DRUGS: ResolvedDrug[] = DRUG_FAMILIES.map(df => ({
  key: df.key,
  displayName: df.display_name,
  aliases: DRUG_ALIAS_MAP[df.key] ?? [],
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCoverageRecord(policy: typeof MOCK_POLICIES[number]): CoverageRecord {
  const payer = RESOLVED_PAYERS.find(p => p.id === policy.payer_id)!
  const drug = RESOLVED_DRUGS.find(d => d.key === policy.canonical_drug_key)!
  return {
    policyId: policy.id,
    payer,
    drug,
    coverageStatus: policy.coverage_status,
    paRequired: policy.pa_required,
    stepTherapyRequired: policy.step_therapy_required,
    effectiveDate: policy.effective_date,
    versionLabel: policy.version_label,
    raw: policy,
    matchConfidence: 'exact',
  }
}

function toEvidence(policy: typeof MOCK_POLICIES[number]): PolicyEvidence[] {
  return (policy.evidence_citations ?? []).map(c => ({
    id: c.id,
    quote: c.quote,
    sourceLabel: c.source_label,
    sourceUrl: c.source_url,
    effectiveDate: c.effective_date,
    page: c.page,
    section: c.section,
  }))
}

function deriveNextBestAction(policy: typeof MOCK_POLICIES[number]): string {
  if (policy.pa_required && policy.step_therapy_required) {
    return 'Document prior therapy failures and submit PA with specialty attestation and required labs.'
  }
  if (policy.pa_required) {
    return 'Submit prior authorization with clinical documentation per indexed criteria.'
  }
  if (policy.coverage_status === 'not_covered') {
    return 'Review alternative indexed payers or consider formulary exception pathway.'
  }
  return 'Verify benefit design and submit claim with HCPCS codes listed in indexed policy.'
}

// ── ManualPolicyRepository implementation ─────────────────────────────────────

export class ManualPolicyRepository implements PolicyRepository {
  listSupportedPayers(): ResolvedPayer[] {
    return RESOLVED_PAYERS
  }

  listSupportedDrugs(): ResolvedDrug[] {
    return RESOLVED_DRUGS
  }

  resolvePayer(input: string): ResolvedPayer | null {
    const canonical = normalizePayer(input)
    if (!canonical) return null
    return RESOLVED_PAYERS.find(p => p.id === canonical) ?? null
  }

  resolveDrug(input: string): ResolvedDrug | null {
    const canonical = normalizeDrug(input)
    if (!canonical) return null
    return RESOLVED_DRUGS.find(d => d.key === canonical) ?? null
  }

  findCoverageRecord(payerId: string, drugKey: string): CoverageRecord | null {
    const policy = MOCK_POLICIES.find(
      p => p.payer_id === payerId && p.canonical_drug_key === drugKey
    )
    return policy ? toCoverageRecord(policy) : null
  }

  getPolicyDetails(payerId: string, drugKey: string): PolicyDetails | null {
    const policy = MOCK_POLICIES.find(
      p => p.payer_id === payerId && p.canonical_drug_key === drugKey
    )
    if (!policy) return null

    const record = toCoverageRecord(policy)
    return {
      record,
      priorFailureRequirements: policy.clinical_criteria?.prior_failure ?? [],
      diagnosisRequired: policy.clinical_criteria?.diagnosis_required ?? [],
      specialtyRequired: policy.clinical_criteria?.specialty_required ?? null,
      siteOfCare: policy.operational_rules?.site_of_care ?? null,
      renewalIntervalDays: policy.operational_rules?.renewal_interval_days ?? null,
      dosingNotes: policy.operational_rules?.dosing_notes ?? null,
      documentationRequired: policy.operational_rules?.documentation_required ?? [],
      quantityLimit: policy.operational_rules?.quantity_limit ?? null,
      frictionScore: policy.friction_score ?? 0,
      frictionFactors: policy.friction_factors,
      evidence: toEvidence(policy),
      nextBestAction: deriveNextBestAction(policy),
    }
  }

  getEvidence(payerId: string, drugKey: string): PolicyEvidence[] {
    const policy = MOCK_POLICIES.find(
      p => p.payer_id === payerId && p.canonical_drug_key === drugKey
    )
    return policy ? toEvidence(policy) : []
  }

  getDrugsForPayer(payerId: string): ResolvedDrug[] {
    const seen = new Set<string>()
    const drugKeys = MOCK_POLICIES
      .filter(p => p.payer_id === payerId)
      .map(p => p.canonical_drug_key)
      .filter(k => { if (seen.has(k)) return false; seen.add(k); return true })
    return drugKeys
      .map(key => RESOLVED_DRUGS.find(d => d.key === key))
      .filter((d): d is ResolvedDrug => d !== undefined)
  }

  getPayerDrugMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {}
    for (const payer of RESOLVED_PAYERS) {
      map[payer.id] = MOCK_POLICIES
        .filter(p => p.payer_id === payer.id)
        .map(p => p.canonical_drug_key)
    }
    return map
  }

  getRelatedCombinations(payerId: string, drugKey: string): RelatedCombination[] {
    return MOCK_POLICIES
      .filter(p => (p.payer_id === payerId || p.canonical_drug_key === drugKey)
        && !(p.payer_id === payerId && p.canonical_drug_key === drugKey))
      .map(p => {
        const payer = RESOLVED_PAYERS.find(r => r.id === p.payer_id)!
        const drug = RESOLVED_DRUGS.find(d => d.key === p.canonical_drug_key)!
        return {
          payer,
          drug,
          coverageStatus: p.coverage_status,
          frictionScore: p.friction_score ?? 0,
        }
      })
      .slice(0, 6) // cap at 6 related entries
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────
// Server-side only — do not import in client components.

export const policyRepository: PolicyRepository = new ManualPolicyRepository()
