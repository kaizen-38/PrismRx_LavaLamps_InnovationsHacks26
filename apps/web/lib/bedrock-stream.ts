// Server-only: Bedrock InvokeModelWithResponseStream with bearer token (same auth as lib/bedrock.ts).

import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'

function getModelConfig(): { region: string; modelId: string; token: string } {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK ?? ''
  const region = process.env.AWS_REGION ?? 'us-east-1'
  const modelId =
    process.env.BEDROCK_MODEL_ID ?? 'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
  if (!token) throw new Error('AWS_BEARER_TOKEN_BEDROCK environment variable is not set')
  return { region, modelId, token }
}

let streamClient: BedrockRuntimeClient | null = null

function getStreamClient(): BedrockRuntimeClient {
  if (!streamClient) {
    const { region, token } = getModelConfig()
    streamClient = new BedrockRuntimeClient({
      region,
      token: async () => ({ token }),
      // Prefer API key / bearer when both schemes are available
      authSchemePreference: ['httpBearerAuth', 'sigv4'],
    })
  }
  return streamClient
}

function extractDeltaText(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const t = o.type
  if (
    t !== 'content_block_delta' &&
    t !== 'contentBlockDelta' &&
    t !== 'ContentBlockDelta'
  ) {
    return null
  }
  const d = o.delta as Record<string, unknown> | undefined
  if (!d) return null
  if (typeof d.text === 'string') return d.text
  const inner = d as { type?: string; text?: string }
  if (inner.type === 'text_delta' && typeof inner.text === 'string') return inner.text
  return null
}

/**
 * Stream assistant text deltas from Claude on Bedrock; returns full concatenated text at end.
 */
export async function callBedrockStream(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string | undefined,
  maxTokens: number,
  timeoutMs: number,
  onDelta: (chunk: string) => void,
): Promise<string> {
  const { modelId } = getModelConfig()
  const client = getStreamClient()

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let full = ''
  try {
    const cmd = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(JSON.stringify(body)),
    })

    const response = await client.send(cmd, { abortSignal: controller.signal })

    if (!response.body) {
      throw new Error('Bedrock stream: empty body')
    }

    for await (const event of response.body) {
      if (event.chunk?.bytes) {
        const raw = new TextDecoder().decode(event.chunk.bytes)
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          continue
        }
        const piece = extractDeltaText(parsed)
        if (piece) {
          full += piece
          onDelta(piece)
        }
      }
      if (event.internalServerException?.message) {
        throw new Error(event.internalServerException.message)
      }
      if (event.modelStreamErrorException?.message) {
        throw new Error(event.modelStreamErrorException.message)
      }
      if (event.validationException?.message) {
        throw new Error(event.validationException.message)
      }
      if (event.throttlingException?.message) {
        throw new Error(event.throttlingException.message)
      }
    }

    return full
  } finally {
    clearTimeout(timer)
  }
}
