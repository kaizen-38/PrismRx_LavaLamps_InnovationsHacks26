// ─────────────────────────────────────────────────────────────────────────────
// /workspace — PrismRx conversational policy assistant
// Server component: fetches supported options, passes to client.
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from 'next'
import { policyRepository } from '@/lib/policy'
import { WorkspaceClient } from './WorkspaceClient'

export const metadata: Metadata = {
  title: 'Policy Workspace — PrismRx',
  description: 'Explore indexed medical-benefit drug policy coverage in a conversational workspace.',
}

export default function WorkspacePage() {
  const payers = policyRepository.listSupportedPayers().map(p => ({ id: p.id, displayName: p.displayName }))
  const drugs = policyRepository.listSupportedDrugs().map(d => ({ key: d.key, displayName: d.displayName }))

  return (
    <WorkspaceClient
      initialPayers={payers}
      initialDrugs={drugs}
    />
  )
}
