// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Assistant response envelope types
// All widget payloads are typed here. The model never emits raw HTML or JSX.
// ─────────────────────────────────────────────────────────────────────────────

import type { CoverageStatus } from '@/lib/types'
import type { PolicyEvidence, RelatedCombination } from '@/lib/policy/repository'

// ── Widget types ──────────────────────────────────────────────────────────────

export type WidgetType =
  | 'welcome_quick_actions'
  | 'coverage_intake_form'
  | 'request_summary_card'
  | 'coverage_report_hero'
  | 'blockers_and_requirements'
  | 'evidence_drawer'
  | 'policy_snapshot_card'
  | 'related_actions'
  | 'supported_options_card'
  | 'limitation_notice'

// ── Individual widget prop shapes ─────────────────────────────────────────────

export interface WelcomeQuickActionsProps {
  supportedPayerCount: number
  supportedDrugCount: number
}

export interface CoverageIntakeFormProps {
  prefillPayer?: string
  prefillDrug?: string
  prefillDiagnosis?: string
}

export interface RequestSummaryCardProps {
  resolvedPayer: string
  resolvedDrug: string
  diagnosis?: string
  matchConfidence: 'exact' | 'approximate' | 'unindexed'
  originalQuery: string
}

export interface CoverageReportHeroProps {
  payer: string
  drug: string
  coverageStatus: CoverageStatus
  paRequired: boolean
  stepTherapyRequired: boolean
  effectiveDate: string
  versionLabel: string
  shortTakeaway: string   // 1–2 sentence model summary
  frictionScore: number
}

export interface BlockerItem {
  label: string
  value: string
  type: 'prior_auth' | 'step_therapy' | 'site_of_care' | 'specialist' | 'biosimilar_note' | 'reauth' | 'lab'
  severity: 'hard' | 'soft' | 'info'
}

export interface BlockersAndRequirementsProps {
  blockers: BlockerItem[]
  nextBestAction: string
}

export interface EvidenceDrawerProps {
  evidence: PolicyEvidence[]
  policyTitle: string
}

export interface PolicySnapshotCardProps {
  payer: string
  drugFamily: string
  effectiveDate: string
  versionLabel: string
  policyId: string
  confidence: 'high' | 'medium' | 'low'
  completenessNote: string
}

export interface RelatedActionsProps {
  payerId: string
  drugKey: string
  relatedCombinations: RelatedCombination[]
}

export interface SupportedOptionsCardProps {
  requestedPayer?: string
  requestedDrug?: string
  supportedPayers: Array<{ id: string; displayName: string }>
  supportedDrugs: Array<{ key: string; displayName: string }>
}

export interface LimitationNoticeProps {
  datasetNote?: string
}

// ── Discriminated union of all widgets ───────────────────────────────────────

export type Widget =
  | { type: 'welcome_quick_actions'; props: WelcomeQuickActionsProps }
  | { type: 'coverage_intake_form'; props: CoverageIntakeFormProps }
  | { type: 'request_summary_card'; props: RequestSummaryCardProps }
  | { type: 'coverage_report_hero'; props: CoverageReportHeroProps }
  | { type: 'blockers_and_requirements'; props: BlockersAndRequirementsProps }
  | { type: 'evidence_drawer'; props: EvidenceDrawerProps }
  | { type: 'policy_snapshot_card'; props: PolicySnapshotCardProps }
  | { type: 'related_actions'; props: RelatedActionsProps }
  | { type: 'supported_options_card'; props: SupportedOptionsCardProps }
  | { type: 'limitation_notice'; props: LimitationNoticeProps }

// ── Loader stage ──────────────────────────────────────────────────────────────

export interface LoaderStage {
  id: string
  label: string
  durationMs: number
}

// ── Assistant intent ──────────────────────────────────────────────────────────

export type AssistantIntent =
  | 'greeting'
  | 'coverage_lookup'
  | 'missing_payer'
  | 'missing_drug'
  | 'compare_payers'
  | 'explore_drugs'
  | 'view_evidence'
  | 'follow_up'
  | 'unsupported'
  | 'unknown'

// ── Main response envelope ────────────────────────────────────────────────────

export interface AssistantResponse {
  requestId: string
  intent: AssistantIntent
  assistantText: string           // natural language narrative for left pane
  /** Primary right-pane widget */
  widget: Widget | null
  /** Secondary right-pane widgets (evidence, snapshot, related) */
  sideWidgets: Widget[]
  /** Loader stages to animate before showing the report */
  loaderStages: LoaderStage[]
  meta: {
    resolvedPayer: string | null
    resolvedDrug: string | null
    isIndexed: boolean
    dataSource: 'manual_indexed'
    modelUsed: 'bedrock' | 'fallback'
    timestamp: string
  }
}

// ── Request shape ─────────────────────────────────────────────────────────────

export interface AssistantRequest {
  message: string
  history?: Array<{ role: 'user' | 'assistant'; text: string }>
  context?: {
    payer?: string
    drug?: string
    diagnosis?: string
    icd10?: string
    priorTherapies?: string[]
    specialty?: string
    careSetting?: string
    age?: string
  }
}
