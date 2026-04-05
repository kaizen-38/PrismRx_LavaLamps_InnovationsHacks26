// POST /api/voice/transcribe
// Receives audio blob, returns transcript via ElevenLabs Scribe STT.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 503 })
  }

  const formData = await req.formData()
  const file = formData.get('audio') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  const elForm = new FormData()
  elForm.append('file', file, 'audio.webm')
  elForm.append('model_id', 'scribe_v1')
  elForm.append('language_code', 'en')

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: elForm,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[voice/transcribe]', res.status, err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  const json = await res.json()
  return NextResponse.json({ transcript: json.text ?? '' })
}
