import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsClient } from 'elevenlabs'
import { GoogleGenerativeAI } from '@google/generative-ai'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!
const GEMINI_API_KEY      = process.env.GEMINI_API_KEY

// Models
const VOICE_ID_FAST = 'EXAVITQu4vr4xnSDxMaL'   // Sarah — calm, professional
const MODEL_FAST    = 'eleven_flash_v2_5'          // ~75ms latency

// ── Gemini summary prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are writing a spoken executive brief for a healthcare policy intelligence product called PrismRx.

Goal:
Write a voice-ready summary for a user who is comparing medical-benefit drug policies across payers.

Instructions:
- Write in clear spoken English.
- Keep it between 75 and 110 words.
- Mention the drug name, payer name, coverage status, main blockers, and the fastest next step.
- If relevant, mention whether the policy became more restrictive or less restrictive.
- Use short sentences.
- No bullet points.
- No citations.
- No table language.
- No jargon unless necessary.
- Sound calm, precise, and trustworthy.
- Do not mention AI, models, parsing, or extraction.

Return only the final spoken script.`

// ── Simple fallback script builder (no Gemini key) ───────────────────────────

function buildFallbackScript(data: BriefInput): string {
  const { drug, payer, status, blockers, next_step, change_summary } = data

  const blockersText = blockers.length > 0
    ? `The main blockers are ${blockers.slice(0, 3).join(', ')}.`
    : 'No major blockers were identified.'

  const changeText = change_summary
    ? ` ${change_summary}.`
    : ''

  return `For ${drug} under ${payer}, coverage is ${status}.${changeText} ${blockersText} ${next_step ? `The fastest path forward is: ${next_step}.` : ''} Review the full criteria in PrismRx for complete source citations.`
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BriefInput {
  drug: string
  payer: string
  status: string
  blockers: string[]
  next_step?: string
  change_summary?: string
  raw_json?: object
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: BriefInput = await req.json()

    if (!body.drug || !body.payer) {
      return NextResponse.json({ error: 'drug and payer are required' }, { status: 400 })
    }

    // 1. Generate voice script
    let script: string

    if (GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const inputText = JSON.stringify(body.raw_json ?? { ...body })
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nInput:\n${inputText}`)
        script = result.response.text().trim()
      } catch (e) {
        console.warn('[voice/brief] Gemini failed, using fallback:', e)
        script = buildFallbackScript(body)
      }
    } else {
      script = buildFallbackScript(body)
    }

    // 2. ElevenLabs TTS
    const client = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY })

    const audio = await client.textToSpeech.convert(VOICE_ID_FAST, {
      text: script,
      model_id: MODEL_FAST,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.80,
        style: 0.15,
        use_speaker_boost: true,
      },
      output_format: 'mp3_44100_128',
    })

    // 3. Collect audio stream into buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of audio) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // 4. Return audio + transcript
    const response = new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Brief-Transcript': encodeURIComponent(script),
        'Cache-Control': 'public, max-age=3600',
      },
    })

    return response
  } catch (err) {
    console.error('[voice/brief] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'TTS generation failed' },
      { status: 500 },
    )
  }
}
