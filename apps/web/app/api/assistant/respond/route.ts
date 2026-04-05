// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assistant/respond
// Main conversational endpoint. Parses intent, looks up indexed data,
// calls Bedrock for narrative text only. Returns typed AssistantResponse.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '@/lib/assistant-orchestrator'
import type { AssistantRequest } from '@/lib/assistant-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: AssistantRequest

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json(
      { status: 'error', message: 'message field is required' },
      { status: 400 }
    )
  }

  if (body.message.length > 2000) {
    return NextResponse.json(
      { status: 'error', message: 'message too long (max 2000 chars)' },
      { status: 400 }
    )
  }

  try {
    const response = await orchestrate(body)
    return NextResponse.json({ status: 'ok', data: response })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[assistant/respond] error:', message)
    return NextResponse.json(
      { status: 'error', message: 'Failed to process request. Please try again.' },
      { status: 500 }
    )
  }
}
