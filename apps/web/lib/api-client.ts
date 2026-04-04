// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — typed API client
// Falls back to mock data automatically when the backend is unreachable.
// All fetch calls return typed responses matching lib/types.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PolicyDNA,
  CoverageMatrixData,
  SimulationCase,
  SimulationResult,
  PolicyDiff,
} from './types'
import {
  MOCK_POLICIES,
  buildMockMatrix,
  getPolicyById,
  MOCK_DIFFS,
  buildMockSimulationResults,
} from './mock-data'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ── Internal fetch wrapper ────────────────────────────────────────────────────

type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { ok: false, error: `HTTP ${res.status}: ${text}` }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ── API flags ─────────────────────────────────────────────────────────────────

/** Set to true to always use mock data (useful during frontend-only dev). */
export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// ── Backend → Frontend type adapters ─────────────────────────────────────────

// The backend PolicyDocument schema differs from the frontend PolicyDNA shape.
// These adapters bridge the gap without changing either side.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptPolicyDocument(doc: any): PolicyDNA {
  const drugNames: string[] = doc.drug_names ?? []
  const drugName = drugNames[0] ?? doc.drug_family ?? 'Unknown'
  const shortName = drugName.slice(0, 3).toUpperCase()
  const payerKey = (doc.payer as string).toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')

  const stepTherapyList: string[] = doc.step_therapy_requirements ?? []
  const diagnosisList: string[]   = doc.diagnosis_requirements ?? []
  const labList: string[]         = doc.lab_or_biomarker_requirements ?? []
  const prescriberList: string[]  = doc.prescriber_requirements ?? []
  const siteList: string[]        = doc.site_of_care_restrictions ?? []
  const reauthorizeList: string[] = doc.reauthorization_rules ?? []

  // Friction score
  let friction = 0
  if (doc.prior_authorization_required) friction += 30
  friction += Math.min(stepTherapyList.length * 10, 25)
  friction += Math.min(diagnosisList.length * 5, 15)
  friction += Math.min(labList.length * 5, 15)
  if (siteList.length) friction += 10
  if (prescriberList.length) friction += 5
  friction = Math.min(friction, 100)

  // Map backend citations → frontend Citation[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const citations = (doc.citations ?? []).slice(0, 10).map((c: any, i: number) => ({
    id: `${doc.id}-cit-${i}`,
    page: c.page ?? null,
    section: c.section ?? null,
    quote: c.quote ?? '',
    source_label: `${doc.payer} Policy — ${doc.drug_family ?? drugName}`,
    source_url: doc.source_uri ?? '',
    effective_date: doc.effective_date ?? '2024-01-01',
  }))

  return {
    id: doc.id,
    canonical_drug_key: drugName.toLowerCase(),
    drug_display_name: drugName.charAt(0).toUpperCase() + drugName.slice(1),
    drug_short_name: shortName,
    biosimilars: drugNames.slice(1),
    reference_product: drugNames[0] ?? 'Unknown',
    hcpcs_codes: doc.hcpcs_codes ?? [],

    payer_id: payerKey,
    payer_name: doc.payer,
    plan_type: doc.plan_type ?? 'Commercial',

    effective_date: doc.effective_date ?? '',
    version_label: doc.effective_date ?? 'Current',
    document_hash: null,

    coverage_status: doc.coverage_status ?? 'unclear',
    pa_required: !!doc.prior_authorization_required,
    step_therapy_required: stepTherapyList.length > 0,

    clinical_criteria: {
      prior_failure: stepTherapyList,
      diagnosis_required: diagnosisList,
      specialty_required: prescriberList[0] ?? null,
      lab_requirements: labList,
      age_restriction: null,
      additional_notes: doc.covered_indications?.slice(0, 5) ?? [],
    },

    operational_rules: {
      site_of_care: siteList[0] ?? null,
      renewal_interval_days: null,
      dosing_notes: (doc.dose_frequency_rules ?? [])[0] ?? null,
      documentation_required: doc.exclusions?.slice(0, 3) ?? [],
      quantity_limit: null,
    },

    evidence_citations: citations,

    friction_score: friction,
    friction_factors: {
      prior_failure_count: stepTherapyList.length,
      specialist_gate: prescriberList.length > 0,
      lab_biomarker_gate: labList.length > 0,
      site_of_care_restriction: siteList.length > 0,
      renewal_complexity: reauthorizeList.length > 0,
    },
  }
}

// ── Coverage Matrix ───────────────────────────────────────────────────────────

export async function fetchCoverageMatrix(
  drugKey?: string,
): Promise<CoverageMatrixData> {
  if (!USE_MOCK) {
    const query = drugKey ? `?drug=${encodeURIComponent(drugKey)}` : ''
    const result = await apiFetch<CoverageMatrixData>(`/api/matrix${query}`)
    if (result.ok) return result.data
    console.warn('[api-client] matrix fetch failed, using mock:', result.error)
  }
  const matrix = buildMockMatrix()
  if (drugKey) {
    return {
      ...matrix,
      rows: matrix.rows.filter((r) => r.drug_key === drugKey),
    }
  }
  return matrix
}

// ── Policy DNA detail ─────────────────────────────────────────────────────────

export async function fetchPolicy(policyId: string): Promise<PolicyDNA | null> {
  if (!USE_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await apiFetch<any>(`/api/policies/${policyId}`)
    if (result.ok) return adaptPolicyDocument(result.data)
    console.warn('[api-client] policy fetch failed, using mock:', result.error)
  }
  return getPolicyById(policyId) ?? null
}

export async function fetchPoliciesByDrug(
  drugKey: string,
): Promise<PolicyDNA[]> {
  if (!USE_MOCK) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await apiFetch<any[]>(
      `/api/policies?drug=${encodeURIComponent(drugKey)}`,
    )
    if (result.ok) return result.data.map(adaptPolicyDocument)
    console.warn('[api-client] policies fetch failed, using mock:', result.error)
  }
  return MOCK_POLICIES.filter((p) => p.canonical_drug_key === drugKey)
}

// ── Policy Fit Simulator ──────────────────────────────────────────────────────

export async function runSimulation(
  caseData: SimulationCase,
): Promise<SimulationResult[]> {
  if (!USE_MOCK) {
    const result = await apiFetch<SimulationResult[]>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify(caseData),
    })
    if (result.ok) return result.data
    console.warn('[api-client] simulation failed, using mock:', result.error)
  }
  return buildMockSimulationResults(caseData)
}

// ── Change Radar ──────────────────────────────────────────────────────────────

export async function fetchDiffs(
  drugKey?: string,
  payerId?: string,
): Promise<PolicyDiff[]> {
  if (!USE_MOCK) {
    const params = new URLSearchParams()
    if (drugKey) params.set('drug', drugKey)
    if (payerId) params.set('payer', payerId)
    const query = params.size ? `?${params.toString()}` : ''
    const result = await apiFetch<PolicyDiff[]>(`/api/diff${query}`)
    if (result.ok) return result.data
    console.warn('[api-client] diffs fetch failed, using mock:', result.error)
  }
  let diffs = MOCK_DIFFS
  if (drugKey) diffs = diffs.filter((d) => d.drug_key === drugKey)
  if (payerId) diffs = diffs.filter((d) => d.payer_id === payerId)
  return diffs
}
