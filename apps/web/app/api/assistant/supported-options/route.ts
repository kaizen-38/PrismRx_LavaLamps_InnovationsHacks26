// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assistant/supported-options
// Returns all indexed payers and drugs. Used to populate intake form options.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { policyRepository } from '@/lib/policy'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payers = policyRepository.listSupportedPayers().map(p => ({
    id: p.id,
    displayName: p.displayName,
  }))
  const drugs = policyRepository.listSupportedDrugs().map(d => ({
    key: d.key,
    displayName: d.displayName,
  }))

  return NextResponse.json({
    status: 'ok',
    data: { payers, drugs },
  })
}
