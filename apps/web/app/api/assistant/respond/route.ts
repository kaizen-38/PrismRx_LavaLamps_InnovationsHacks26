// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assistant/respond  — Server-Sent Events streaming endpoint
//
// Event sequence:
//   data: {"type":"init",   "requestId":…, "intent":…, "loaderStages":…, "widget":…, "sideWidgets":…, "meta":…}
//   data: {"type":"text_delta", "text":"…"}   ← repeated until text is done
//   data: {"type":"done",  "modelUsed":"bedrock"|"fallback"}
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server'
import { orchestrateStream } from '@/lib/assistant-orchestrator'
import { streamBedrock, isBedrockConfigured } from '@/lib/bedrock'
import type { AssistantRequest } from '@/lib/assistant-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `You are a knowledgeable medical benefit drug policy assistant for PrismRx.
You help users understand indexed payer coverage policy data for infused biologics.
You must:
- Be concise, clear, and trustworthy — 2 to 4 sentences
- Use language like "per indexed policy snapshot", "based on currently indexed data"
- NEVER invent coverage details — only narrate what the structured data says
- NEVER say "live", "real-time", or "fetched" unless explicitly told a real fetch occurred
- Use professional, calm, editorial tone`

function sse(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)
}

export async function POST(req: NextRequest) {
  let body: AssistantRequest

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON' }), { status: 400 })
  }

  if (!body.message || typeof body.message !== 'string' || body.message.length > 2000) {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid message' }), { status: 400 })
  }

  // Build deterministic plan (no Bedrock calls yet)
  let plan
  try {
    plan = orchestrateStream(body)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Orchestration failed'
    console.error('[assistant/respond] orchestrate error:', msg)
    return new Response(JSON.stringify({ status: 'error', message: msg }), { status: 500 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send init event — client can start loader + reveal widgets
      controller.enqueue(sse({
        type: 'init',
        requestId: plan.requestId,
        intent: plan.intent,
        loaderStages: plan.loaderStages,
        widget: plan.widget,
        sideWidgets: plan.sideWidgets,
        meta: plan.meta,
      }))

      // 2. Stream narrative text
      let modelUsed: 'bedrock' | 'fallback' = 'fallback'

      if (plan.narrativePrompt && isBedrockConfigured()) {
        try {
          const textStream = await streamBedrock(
            [{ role: 'user', content: plan.narrativePrompt }],
            SYSTEM_PROMPT,
            512
          )
          const reader = textStream.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) controller.enqueue(sse({ type: 'text_delta', text: value }))
          }
          modelUsed = 'bedrock'
        } catch (err) {
          console.error('[assistant/respond] Bedrock stream error:', err instanceof Error ? err.message : err)
          // Fall through to emit fallback text
          controller.enqueue(sse({ type: 'text_delta', text: plan.fallbackText }))
        }
      } else {
        // No Bedrock or no prompt — emit fallback as a single chunk
        controller.enqueue(sse({ type: 'text_delta', text: plan.fallbackText }))
      }

      // 3. Done
      controller.enqueue(sse({ type: 'done', modelUsed }))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  })
}
