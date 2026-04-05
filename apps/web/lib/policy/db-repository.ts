// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — DB-backed policy repository
// Calls FastAPI GET /api/policy and /api/policy/options.
// SERVER SIDE ONLY — used by assistant-orchestrator.ts
// ─────────────────────────────────────────────────────────────────────────────

/** Prefer API_URL on the server so fetches are not forced through the public browser origin. */
const API_BASE =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000'

// ── Types from API response ───────────────────────────────────────────────────

export interface PolicyLookupFound {
  found: true
  policy_id: string
  payer: string
  drug_family: string
  drug_display: string
  drug_short: string
  reference_product: string
  biosimilars: string[]
  coverage_status: string
  pa_required: boolean
  step_therapy_required: boolean
  effective_date: string
  version_label: string
  friction_score: number
  drug_names: string[]
  hcpcs_codes: string[]
  covered_indications: string[]
  step_therapy_requirements: string[]
  diagnosis_requirements: string[]
  lab_or_biomarker_requirements: string[]
  prescriber_requirements: string[]
  site_of_care_restrictions: string[]
  dose_frequency_rules: string[]
  reauthorization_rules: string[]
  preferred_product_notes: string[]
  exclusions: string[]
  citations: Array<{
    page: number
    section: string
    quote: string
    confidence: number
  }>
}

export interface PolicyLookupNotFound {
  found: false
  requested_payer: string
  requested_drug: string
  message: string
  available_payers: string[]
  available_drugs: string[]
}

export type PolicyLookupResult = PolicyLookupFound | PolicyLookupNotFound

export interface PayerOption {
  id: string
  displayName: string
}

export interface DrugOption {
  key: string
  displayName: string
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function lookupPolicy(
  payer: string,
  drug: string
): Promise<PolicyLookupResult> {
  const url = `${API_BASE}/api/policy?payer=${encodeURIComponent(payer)}&drug=${encodeURIComponent(drug)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Policy lookup failed: HTTP ${res.status}`)
  }
  return res.json()
}

export async function getSupportedOptions(): Promise<{
  payers: PayerOption[]
  drugs: DrugOption[]
}> {
  const res = await fetch(`${API_BASE}/api/policy/options`, { cache: 'no-store' })
  if (!res.ok) {
    return { payers: [], drugs: [] }
  }
  return res.json()
}

// ── Raw document text ─────────────────────────────────────────────────────────

export interface PolicyDocument {
  rawText: string | null
  fileName: string | null
  sourceUri: string | null
  pageCount: number | null
}

// ── Live web crawl ────────────────────────────────────────────────────────────

export interface LivePolicyResult {
  found: boolean
  url: string | null
  text: string | null
  charCount: number
  source: 'pdf' | 'html' | null
  /** HTTP status when the API responded (e.g. 404 = live route missing on older backends). */
  httpStatus?: number
  /** True if fetch threw (network, DNS, timeout). */
  fetchFailed?: boolean
}

export async function getLivePolicyText(
  payer: string,
  drug: string,
): Promise<LivePolicyResult> {
  const base: LivePolicyResult = {
    found: false,
    url: null,
    text: null,
    charCount: 0,
    source: null,
  }
  try {
    const res = await fetch(
      `${API_BASE}/api/policy/live?payer=${encodeURIComponent(payer)}&drug=${encodeURIComponent(drug)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(90_000) },
    )
    if (!res.ok) {
      return { ...base, httpStatus: res.status }
    }
    const data = await res.json()
    return {
      found: data.found ?? false,
      url: data.url ?? null,
      text: data.text ?? null,
      charCount: data.char_count ?? 0,
      source: data.source ?? null,
      httpStatus: res.status,
    }
  } catch {
    return { ...base, fetchFailed: true }
  }
}

export async function getDocumentText(policyId: string): Promise<PolicyDocument> {
  try {
    const res = await fetch(`${API_BASE}/api/policy/${encodeURIComponent(policyId)}/document`, {
      cache: 'no-store',
    })
    if (!res.ok) return { rawText: null, fileName: null, sourceUri: null, pageCount: null }
    const data = await res.json()
    return {
      rawText: data.raw_text ?? null,
      fileName: data.file_name ?? null,
      sourceUri: data.source_uri ?? null,
      pageCount: data.page_count ?? null,
    }
  } catch {
    return { rawText: null, fileName: null, sourceUri: null, pageCount: null }
  }
}
