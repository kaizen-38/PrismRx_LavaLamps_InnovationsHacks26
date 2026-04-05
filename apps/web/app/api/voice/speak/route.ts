// POST /api/voice/speak
// Converts assistant text to speech via ElevenLabs and streams back mp3 audio.

import { NextRequest, NextResponse } from 'next/server'
import { ElevenLabsClient } from 'elevenlabs'

export const runtime = 'nodejs'

const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'  // Sarah — calm, professional
const MODEL_ID = 'eleven_flash_v2_5'        // ~75ms latency

export async function POST(req: NextRequest) {
  const { text } = await req.json().catch(() => ({ text: '' }))

  if (!text || typeof text !== 'string' || text.length > 2000) {
    return NextResponse.json({ error: 'Invalid text' }, { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 503 })
  }

  try {
    const client = new ElevenLabsClient({ apiKey })

    const audio = await client.textToSpeech.convert(VOICE_ID, {
      text: text.slice(0, 1500), // cap length
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.52,
        similarity_boost: 0.82,
        style: 0.12,
        use_speaker_boost: true,
      },
      output_format: 'mp3_44100_128',
    })

    const chunks: Uint8Array[] = []
    for await (const chunk of audio) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (err) {
    console.error('[voice/speak]', err)
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 })
  }
}
