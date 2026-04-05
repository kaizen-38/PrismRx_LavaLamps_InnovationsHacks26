// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Amazon Bedrock client (SERVER SIDE ONLY)
// Never import this in client components.
// Reads credentials from environment variables only.
// ─────────────────────────────────────────────────────────────────────────────

export interface BedrockMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BedrockResponse {
  content: Array<{ type: string; text: string }>
}

export function getBedrockConfig(): { token: string; region: string; modelId: string } {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK
  const region = process.env.AWS_REGION ?? 'us-east-1'
  const modelId =
    process.env.BEDROCK_MODEL_ID ??
    'global.anthropic.claude-sonnet-4-5-20250929-v1:0'

  if (!token) {
    throw new Error('AWS_BEARER_TOKEN_BEDROCK environment variable is not set')
  }

  return { token, region, modelId }
}

/** Returns true if Bedrock is configured (credentials present). */
export function isBedrockConfigured(): boolean {
  return Boolean(process.env.AWS_BEARER_TOKEN_BEDROCK)
}

// ── Non-streaming invoke ──────────────────────────────────────────────────────

export async function callBedrock(
  messages: BedrockMessage[],
  systemPrompt?: string,
  maxTokens = 1024,
  timeoutMs = 15_000
): Promise<string> {
  const { token, region, modelId } = getBedrockConfig()
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Bedrock ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data: BedrockResponse = await res.json()
    return data.content?.find(c => c.type === 'text')?.text ?? ''
  } finally {
    clearTimeout(timer)
  }
}

// ── Streaming invoke ──────────────────────────────────────────────────────────
// Uses invoke-with-response-stream and parses AWS EventStream binary frames.

/**
 * Stream text tokens from Bedrock.
 * Returns a ReadableStream<string> that yields text deltas as they arrive.
 */
export async function streamBedrock(
  messages: BedrockMessage[],
  systemPrompt?: string,
  maxTokens = 1024
): Promise<ReadableStream<string>> {
  const { token, region, modelId } = getBedrockConfig()
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke-with-response-stream`

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Bedrock stream ${res.status}: ${errText.slice(0, 200)}`)
  }

  const rawStream = res.body!
  return parseEventStream(rawStream)
}

// ── AWS EventStream binary parser ─────────────────────────────────────────────
// Frame format:
//   [total_length: 4B][headers_length: 4B][prelude_crc: 4B]
//   [headers: headers_length B][payload: total_length - headers_length - 16 B]
//   [message_crc: 4B]

function parseEventStream(raw: ReadableStream<Uint8Array>): ReadableStream<string> {
  const reader = raw.getReader()
  const decoder = new TextDecoder()
  let buf = new Uint8Array(0)

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        // Try to parse all complete frames currently in the buffer
        let parsed = false
        while (buf.length >= 12) {
          const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
          const totalLen = view.getUint32(0)

          if (totalLen < 16 || totalLen > 1_000_000) {
            // Corrupt frame — discard buffer and continue
            buf = new Uint8Array(0)
            break
          }

          if (buf.length < totalLen) break // wait for more bytes

          const headersLen = view.getUint32(4)
          const payloadStart = 12 + headersLen
          const payloadLen = totalLen - headersLen - 16

          if (payloadLen > 0) {
            const payloadBytes = buf.slice(payloadStart, payloadStart + payloadLen)
            const payloadText = decoder.decode(payloadBytes)
            try {
              const outer = JSON.parse(payloadText)

              // Bedrock wraps the Claude event in { "bytes": "<base64>" }
              let claudeEvent: unknown = outer
              if (typeof outer.bytes === 'string') {
                const decoded = Buffer.from(outer.bytes, 'base64').toString('utf-8')
                claudeEvent = JSON.parse(decoded)
              }

              const event = claudeEvent as Record<string, unknown>
              if (
                event.type === 'content_block_delta' &&
                (event.delta as Record<string, unknown>)?.type === 'text_delta' &&
                typeof (event.delta as Record<string, unknown>).text === 'string'
              ) {
                controller.enqueue((event.delta as Record<string, unknown>).text as string)
                parsed = true
              }
            } catch {
              // non-JSON or unrecognised frame — safe to skip
            }
          }

          // Advance past this frame
          buf = buf.slice(totalLen)
        }

        // Read more bytes from the underlying stream
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }

        // Append to buffer
        const next = new Uint8Array(buf.length + value.length)
        next.set(buf)
        next.set(value, buf.length)
        buf = next

        // If we already emitted something this iteration, yield control so the
        // client can render the tokens before we pull more.
        if (parsed) return
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}
