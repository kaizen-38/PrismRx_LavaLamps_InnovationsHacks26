// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Amazon Bedrock client (SERVER SIDE ONLY)
// Never import this in client components.
// Reads credentials from environment variables only.
// ─────────────────────────────────────────────────────────────────────────────

const BEDROCK_ENDPOINT_BASE = 'https://bedrock-runtime.us-east-1.amazonaws.com'

interface BedrockMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BedrockResponse {
  content: Array<{ type: string; text: string }>
}

function getBedrockConfig(): { token: string; region: string; modelId: string } {
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

/**
 * Call Bedrock with a simple messages array.
 * Returns the assistant's text response.
 * Throws on credential misconfiguration or network error.
 */
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Bedrock responded ${res.status}: ${errText.slice(0, 200)}`)
    }

    const data: BedrockResponse = await res.json()
    const text = data.content?.find(c => c.type === 'text')?.text ?? ''
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** Returns true if Bedrock is configured (credentials present). */
export function isBedrockConfigured(): boolean {
  return Boolean(process.env.AWS_BEARER_TOKEN_BEDROCK)
}
