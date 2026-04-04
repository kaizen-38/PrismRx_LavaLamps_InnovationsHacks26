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
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  process.env.NODE_ENV === 'development'

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
    const result = await apiFetch<PolicyDNA>(`/api/policies/${policyId}`)
    if (result.ok) return result.data
    console.warn('[api-client] policy fetch failed, using mock:', result.error)
  }
  return getPolicyById(policyId) ?? null
}

export async function fetchPoliciesByDrug(
  drugKey: string,
): Promise<PolicyDNA[]> {
  if (!USE_MOCK) {
    const result = await apiFetch<PolicyDNA[]>(
      `/api/policies?drug=${encodeURIComponent(drugKey)}`,
    )
    if (result.ok) return result.data
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
  // Mock: return stub results (simulate page team will fill this out)
  return []
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
