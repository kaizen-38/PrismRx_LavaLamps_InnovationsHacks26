// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — PolicyRepository interface
// Clean abstraction so the data source can be swapped (manual → live API, DB).
// ─────────────────────────────────────────────────────────────────────────────

import type { PolicyDNA, CoverageStatus } from '@/lib/types'

// ── Normalized lookup types ───────────────────────────────────────────────────

export interface ResolvedPayer {
  id: string          // canonical id, e.g. "uhc"
  displayName: string // e.g. "UnitedHealthcare"
  aliases: string[]
}

export interface ResolvedDrug {
  key: string         // canonical key, e.g. "infliximab"
  displayName: string // e.g. "Infliximab"
  aliases: string[]   // brand names, biosimilar names, INN variants
}

export interface CoverageRecord {
  policyId: string
  payer: ResolvedPayer
  drug: ResolvedDrug
  coverageStatus: CoverageStatus
  paRequired: boolean
  stepTherapyRequired: boolean
  effectiveDate: string
  versionLabel: string
  /** Full PolicyDNA for deep reads */
  raw: PolicyDNA
  /** Whether this came from an exact match or fuzzy match */
  matchConfidence: 'exact' | 'approximate'
}

export interface PolicyEvidence {
  id: string
  quote: string
  sourceLabel: string
  sourceUrl: string
  effectiveDate: string
  page: number | null
  section: string | null
}

export interface PolicyDetails {
  record: CoverageRecord
  priorFailureRequirements: string[]
  diagnosisRequired: string[]
  specialtyRequired: string | null
  siteOfCare: string | null
  renewalIntervalDays: number | null
  dosingNotes: string | null
  documentationRequired: string[]
  quantityLimit: string | null
  frictionScore: number
  frictionFactors: PolicyDNA['friction_factors']
  evidence: PolicyEvidence[]
  nextBestAction: string
}

export interface RelatedCombination {
  payer: ResolvedPayer
  drug: ResolvedDrug
  coverageStatus: CoverageStatus
  frictionScore: number
}

// ── Repository interface ──────────────────────────────────────────────────────

export interface PolicyRepository {
  /** All payers in the dataset */
  listSupportedPayers(): ResolvedPayer[]

  /** All drugs in the dataset */
  listSupportedDrugs(): ResolvedDrug[]

  /**
   * Resolve a user-supplied payer string to a canonical payer.
   * Returns null if no match found.
   */
  resolvePayer(input: string): ResolvedPayer | null

  /**
   * Resolve a user-supplied drug string to a canonical drug.
   * Returns null if no match found.
   */
  resolveDrug(input: string): ResolvedDrug | null

  /**
   * Find a coverage record for a payer+drug combination.
   * Returns null if the combination is not indexed.
   */
  findCoverageRecord(payerId: string, drugKey: string): CoverageRecord | null

  /**
   * Get the full policy details (criteria, evidence, etc.) for a combination.
   */
  getPolicyDetails(payerId: string, drugKey: string): PolicyDetails | null

  /**
   * Get evidence citations for a specific coverage record.
   */
  getEvidence(payerId: string, drugKey: string): PolicyEvidence[]

  /**
   * Get related indexed combinations (same drug, other payers; or same payer, other drugs).
   */
  getRelatedCombinations(payerId: string, drugKey: string): RelatedCombination[]
}
