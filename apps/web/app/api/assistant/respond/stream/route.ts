// POST /api/assistant/respond/stream — SSE stream with text deltas during Bedrock generation, then full envelope.

import { NextRequest } from 'next/server'
import { orchestrate } from '@/lib/assistant-orchestrator'
import { assistStreamContext } from '@/lib/assistant-stream-context'
import type { AssistantRequest } from '@/lib/assistant-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** When the model path emits no Bedrock chunks (e.g. errors), stream text in pulses so the UI matches real streaming. */
async function emitSyntheticTextDeltas(
  push: (obj: unknown) => void,
  full: string,
): Promise<void> {
  if (!full.trim()) return

  const tokens = full.match(/\S+\s*/g) ?? [full]
  const wordsPerPulse = 4
  const msBetween = 18
  const maxPulses = 100
  let i = 0
  let pulses = 0

  while (i < tokens.length && pulses < maxPulses) {
    const slice = tokens.slice(i, i + wordsPerPulse).join('')
    if (slice) push({ type: 'delta', text: slice })
    i += wordsPerPulse
    pulses++
    if (i < tokens.length) await new Promise(r => setTimeout(r, msBetween))
  }
  if (i < tokens.length) {
    const rest = tokens.slice(i).join('')
    if (rest) push({ type: 'delta', text: rest })
  }
}

export async function POST(req: NextRequest) {
  let body: AssistantRequest

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.message || typeof body.message !== 'string') {
    return new Response(JSON.stringify({ status: 'error', message: 'message field is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (body.message.length > 2000) {
    return new Response(JSON.stringify({ status: 'error', message: 'message too long (max 2000 chars)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const push = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }
      try {
        let sawModelDelta = false
        await assistStreamContext.run(
          {
            onDelta: (text: string) => {
              sawModelDelta = true
              push({ type: 'delta', text })
            },
          },
          async () => {
            const response = await orchestrate(body)
            if (!sawModelDelta && response.assistantText?.trim()) {
              await emitSyntheticTextDeltas(push, response.assistantText)
            }
            push({ type: 'complete', data: response })
          },
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        console.error('[assistant/respond/stream] error:', message)
        push({ type: 'error', message: 'Failed to process request. Please try again.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
