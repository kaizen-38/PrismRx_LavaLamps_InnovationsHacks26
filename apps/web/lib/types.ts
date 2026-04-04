// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — TypeScript types mirroring the PolicyDNA Pydantic schema
// Coordinate with backend lead (Rhythm) to keep these in sync by hour 12.
// ─────────────────────────────────────────────────────────────────────────────

// ── Coverage status ──────────────────────────────────────────────────────────

export type CoverageStatus =
  | 'covered'       // straightforward coverage
  | 'conditional'   // covered with conditions / PA required
  | 'preferred'     // preferred agent (biosimilar-first mandates)
  | 'nonpreferred'  // covered but non-preferred (higher burden)
  | 'not_covered'   // explicitly excluded
  | 'unclear'       // document does not clearly state

// ── Citation — source-backed evidence span ───────────────────────────────────

export interface Citation {
  id: string
  page: number | null
  section: string | null
  quote: string
  source_label: string   // "Aetna CPB #0461 — Infliximab, p.3"
  source_url: string
  effective_date: string // ISO date the source document is effective
}

// ── Clinical criteria ────────────────────────────────────────────────────────

export interface ClinicalCriteria {
  prior_failure: string[]       // required failed therapies before coverage
  diagnosis_required: string[]  // ICD-10 or clinical diagnosis required
  specialty_required: string | null
  lab_requirements: string[]
  age_restriction: string | null
  additional_notes: string[]
}

// ── Operational / administrative rules ───────────────────────────────────────

export interface OperationalRules {
  site_of_care: string | null         // e.g., "Outpatient infusion center only"
  renewal_interval_days: number | null
  dosing_notes: string | null
  documentation_required: string[]
  quantity_limit: string | null
}

// ── Friction factors — individual burden signals ─────────────────────────────

export interface FrictionFactors {
  prior_failure_count: number     // 0 = none, 1 = one required, 2 = two or more
  specialist_gate: boolean
  lab_biomarker_gate: boolean
  site_of_care_restriction: boolean
  renewal_complexity: boolean     // short interval (<180 days) or heavy docs
}

// ── Full Policy DNA object ────────────────────────────────────────────────────
// Maps 1:1 to the backend PolicyDNA Pydantic model.

export interface PolicyDNA {
  id: string
  canonical_drug_key: string       // e.g., "infliximab"
  drug_display_name: string        // e.g., "Infliximab"
  drug_short_name: string          // e.g., "IFX" — used in compact matrix cells
  biosimilars: string[]            // biosimilar brand names
  reference_product: string        // originator brand name
  hcpcs_codes: string[]            // J-codes or HCPCS Q-codes

  payer_id: string                 // e.g., "aetna"
  payer_name: string               // e.g., "Aetna"
  plan_type: string                // e.g., "Commercial", "Medicare Advantage"

  effective_date: string           // ISO date — "2024-10-01"
  version_label: string            // e.g., "Q4 2024"
  document_hash: string | null     // SHA-256 of source document for traceability

  coverage_status: CoverageStatus
  pa_required: boolean
  step_therapy_required: boolean

  clinical_criteria: ClinicalCriteria
  operational_rules: OperationalRules
  evidence_citations: Citation[]

  friction_score: number           // 0–100; computed by backend friction service
  friction_factors: FrictionFactors
}

// ── Coverage Matrix ───────────────────────────────────────────────────────────

export interface MatrixCell {
  policy_id: string | null
  coverage_status: CoverageStatus
  friction_score: number
  pa_required: boolean
  effective_date: string
  version_label: string
}

export interface MatrixRow {
  drug_key: string
  drug_display_name: string
  drug_short_name: string
  reference_product: string
  biosimilars: string[]
  cells: Record<string, MatrixCell>  // payer_id → MatrixCell
}

export interface CoverageMatrixData {
  payer_ids: string[]
  payer_labels: Record<string, string>   // payer_id → display name
  rows: MatrixRow[]
  generated_at: string
}

// ── Simulation (Policy Fit Simulator) ────────────────────────────────────────

export type CareSetting = 'hospital' | 'infusion_center' | 'home' | 'office'

export interface SimulationCase {
  diagnosis: string
  icd10_code: string
  drug_key: string
  prior_therapies: string[]
  specialty: string
  care_setting: CareSetting
  age: number
  labs: Record<string, string>
  notes: string
}

export type BlockerType =
  | 'missing_prior_failure'
  | 'wrong_care_setting'
  | 'specialist_required'
  | 'missing_lab'
  | 'diagnosis_mismatch'
  | 'step_therapy_required'
  | 'quantity_limit'

export interface SimulationBlocker {
  type: BlockerType
  severity: 'hard' | 'soft'   // hard = definite denial, soft = likely denial
  description: string
  resolution: string           // actionable next step
  citation: Citation | null
}

export interface SimulationResult {
  case_id: string
  drug_key: string
  payer_id: string
  payer_name: string
  coverage_status: CoverageStatus
  blockers: SimulationBlocker[]
  fit_score: number             // 0–100; higher = better fit
  next_best_action: string
  pa_summary: string            // concise PA-ready summary paragraph
  evidence_checklist: string[]  // checklist items for the evidence pack
}

// ── Change Radar (Policy Diff) ────────────────────────────────────────────────

export type ChangeDirection = 'tightened' | 'loosened' | 'unchanged' | 'added' | 'removed'
export type ChangeImpact = 'high' | 'medium' | 'low'

export interface PolicyChange {
  field: string
  field_label: string          // human-readable field name
  change_type: ChangeDirection
  before: string
  after: string
  impact: ChangeImpact
  citation_before: Citation | null
  citation_after: Citation | null
}

export interface PolicyDiff {
  id: string
  drug_key: string
  drug_display_name: string
  payer_id: string
  payer_name: string
  version_before: string
  version_after: string
  date_before: string
  date_after: string
  overall_direction: 'tightened' | 'loosened' | 'unchanged'
  friction_before: number
  friction_after: number
  friction_delta: number       // positive = more burden, negative = less burden
  changes: PolicyChange[]
}

// ── Drug family reference ─────────────────────────────────────────────────────

export interface DrugFamily {
  key: string
  display_name: string
  short_name: string
  reference_product: string
  biosimilars: string[]
  mechanism: string
  indications: string[]
  hcpcs_codes: string[]
}

// ── Generic API response wrapper ─────────────────────────────────────────────

export interface ApiSuccessResponse<T> {
  status: 'ok'
  data: T
}

export interface ApiErrorResponse {
  status: 'error'
  message: string
  code?: number
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
