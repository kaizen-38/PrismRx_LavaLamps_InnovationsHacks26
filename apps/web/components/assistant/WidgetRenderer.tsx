'use client'

import type { Widget } from '@/lib/assistant-types'
import { WelcomeQuickActions } from './WelcomeQuickActions'
import { CoverageIntakeForm } from './CoverageIntakeForm'
import { RequestSummaryCard } from './RequestSummaryCard'
import { CoverageReportHero } from './CoverageReportHero'
import { BlockersAndRequirements } from './BlockersAndRequirements'
import { EvidenceDrawer } from './EvidenceDrawer'
import { PolicySnapshotCard } from './PolicySnapshotCard'
import { RelatedActions } from './RelatedActions'
import { SupportedOptionsCard } from './SupportedOptionsCard'
import { LimitationNotice } from './LimitationNotice'
import { SiteOfCareWidget } from './SiteOfCareWidget'
import { PreferredAlternativeCard } from './PreferredAlternativeCard'
import { MiniComparisonWidget } from './MiniComparisonWidget'

interface Props {
  widget: Widget
  onAction: (actionId: string) => void
  onIntakeSubmit: (values: { payer: string; drug: string; [k: string]: string | undefined }) => void
  onLookup: (payer: string, drug: string) => void
  onNewLookup: () => void
  supportedPayers?: Array<{ id: string; displayName: string }>
  supportedDrugs?: Array<{ key: string; displayName: string }>
}

export function WidgetRenderer({ widget, onAction, onIntakeSubmit, onLookup, onNewLookup, supportedPayers, supportedDrugs }: Props) {
  switch (widget.type) {
    case 'welcome_quick_actions':
      return <WelcomeQuickActions {...widget.props} onAction={onAction} />

    case 'coverage_intake_form':
      return (
        <CoverageIntakeForm
          {...widget.props}
          onSubmit={onIntakeSubmit}
          supportedPayers={supportedPayers}
          supportedDrugs={supportedDrugs}
        />
      )

    case 'request_summary_card':
      return <RequestSummaryCard {...widget.props} />

    case 'coverage_report_hero':
      return <CoverageReportHero {...widget.props} />

    case 'blockers_and_requirements':
      return <BlockersAndRequirements {...widget.props} />

    case 'evidence_drawer':
      return <EvidenceDrawer {...widget.props} />

    case 'policy_snapshot_card':
      return <PolicySnapshotCard {...widget.props} />

    case 'related_actions':
      return (
        <RelatedActions
          {...widget.props}
          onLookup={onLookup}
          onNewLookup={onNewLookup}
        />
      )

    case 'supported_options_card':
      return (
        <SupportedOptionsCard
          {...widget.props}
          onSelect={(payer, drug) => {
            if (payer || drug) onLookup(payer, drug)
          }}
        />
      )

    case 'limitation_notice':
      return <LimitationNotice {...widget.props} />

    case 'site_of_care':
      return <SiteOfCareWidget siteOfCare={widget.props.siteOfCare} />

    case 'preferred_alternative':
      return <PreferredAlternativeCard {...widget.props} />

    case 'mini_comparison':
      return (
        <MiniComparisonWidget
          {...widget.props}
          onSelect={onLookup}
        />
      )

    default:
      return null
  }
}
