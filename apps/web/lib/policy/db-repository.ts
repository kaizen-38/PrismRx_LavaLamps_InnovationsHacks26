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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiPolicy(p: Record<string, any>): PolicyLookupFound {
  return {
    found: true,
    policy_id:               p.id ?? '',
    payer:                   p.payer ?? '',
    drug_family:             p.drug_family ?? '',
    drug_display:            p.drug_names?.[0] ?? p.drug_family ?? '',
    drug_short:              p.drug_names?.[0] ?? '',
    reference_product:       p.drug_names?.[0] ?? '',
    biosimilars:             (p.drug_names ?? []).slice(1),
    coverage_status:         p.coverage_status ?? 'unclear',
    pa_required:             p.prior_authorization_required ?? false,
    step_therapy_required:   (p.step_therapy_requirements ?? []).length > 0,
    effective_date:          p.effective_date ?? '',
    version_label:           p.policy_number ?? '',
    friction_score:          Math.round((p.extraction_confidence ?? 0.5) * 100),
    drug_names:              p.drug_names ?? [],
    hcpcs_codes:             p.hcpcs_codes ?? [],
    covered_indications:     p.covered_indications ?? [],
    step_therapy_requirements:     p.step_therapy_requirements ?? [],
    diagnosis_requirements:        p.diagnosis_requirements ?? [],
    lab_or_biomarker_requirements: p.lab_or_biomarker_requirements ?? [],
    prescriber_requirements:       p.prescriber_requirements ?? [],
    site_of_care_restrictions:     p.site_of_care_restrictions ?? [],
    dose_frequency_rules:          p.dose_frequency_rules ?? [],
    reauthorization_rules:         p.reauthorization_rules ?? [],
    preferred_product_notes:       p.preferred_product_notes ?? [],
    exclusions:                    p.exclusions ?? [],
    citations:                     p.citations ?? [],
  }
}

export async function lookupPolicy(
  payer: string,
  drug: string
): Promise<PolicyLookupResult> {
  const url = `${API_BASE}/api/policies?payer=${encodeURIComponent(payer)}&drug=${encodeURIComponent(drug)}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Policy lookup failed: HTTP ${res.status}`)
  }
  const data = await res.json()
  // API returns a list — take the first match, or not-found
  if (!Array.isArray(data) || data.length === 0) {
    return {
      found: false,
      requested_payer: payer,
      requested_drug: drug,
      message: `No indexed policy found for ${payer} + ${drug}`,
      available_payers: [],
      available_drugs: [],
    }
  }
  return mapApiPolicy(data[0])
}

export async function getSupportedOptions(): Promise<{
  payers: PayerOption[]
  drugs: DrugOption[]
}> {
  try {
    // Derive from the full policy list since there's no /options endpoint
    const res = await fetch(`${API_BASE}/api/policies`, { cache: 'no-store' })
    if (!res.ok) return { payers: [], drugs: [] }
    const policies: Array<{ payer: string; drug_family: string; drug_names: string[] }> = await res.json()
    const payerSet = new Map<string, string>()
    const drugSet = new Map<string, string>()
    for (const p of policies) {
      if (p.payer) payerSet.set(p.payer.toLowerCase(), p.payer)
      if (p.drug_family) drugSet.set(p.drug_family.toLowerCase(), p.drug_names?.[0] ?? p.drug_family)
    }
    return {
      payers: Array.from(payerSet.values()).map(name => ({ id: name.toLowerCase().replace(/\s+/g, '_'), displayName: name })),
      drugs: Array.from(drugSet.values()).map(name => ({ key: name.toLowerCase(), displayName: name })),
    }
  } catch {
    return { payers: [], drugs: [] }
  }
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
