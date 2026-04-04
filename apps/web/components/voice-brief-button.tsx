'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Voice Brief Button
// Stretch feature: generates a PA brief text and optionally plays it via
// ElevenLabs. Modal shows brief text immediately; voice is best-effort only.
// Time budget: 45–90 min max. If ElevenLabs fails, the text brief is kept.
//
// ElevenLabs integration is gated by NEXT_PUBLIC_ENABLE_VOICE=true.
// Without it, the component still shows the generated text brief.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from 'react'
import type { SimulationResult } from '@/lib/types'

interface VoiceBriefButtonProps {
  result: SimulationResult
  /** Called when user wants to hear the brief — async, may fail silently */
  className?: string
}

const ENABLE_VOICE = process.env.NEXT_PUBLIC_ENABLE_VOICE === 'true'

export default function VoiceBriefButton({ result, className }: VoiceBriefButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg border border-violet-700/60 bg-violet-900/20 px-3 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-900/40 transition-colors ${className ?? ''}`}
      >
        <MicIcon />
        Voice Brief
      </button>

      {open && (
        <VoiceBriefModal result={result} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

// ── VoiceBriefModal ───────────────────────────────────────────────────────────

function VoiceBriefModal({
  result,
  onClose,
}: {
  result: SimulationResult
  onClose: () => void
}) {
  const [voiceState, setVoiceState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const briefText = buildBriefText(result)

  const handlePlayVoice = async () => {
    if (!ENABLE_VOICE) return
    setVoiceState('loading')

    try {
      const res = await fetch('/api/voice-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: briefText }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setVoiceState('idle')
      audio.onerror = () => setVoiceState('error')
      await audio.play()
      setVoiceState('playing')
    } catch {
      setVoiceState('error')
    }
  }

  const handleStop = () => {
    audioRef.current?.pause()
    setVoiceState('idle')
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-700">
          <div className="flex items-center gap-2">
            <MicIcon className="w-4 h-4 text-violet-400" />
            <h2 className="font-semibold text-slate-100 text-sm">Voice Brief</h2>
            <span className="text-xs text-slate-500">· {result.payer_name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Brief text */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Generated PA Brief
          </p>
          <div className="rounded-lg border border-navy-700 bg-navy-800 px-4 py-3 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {briefText}
          </div>
        </div>

        {/* Voice controls */}
        <div className="px-5 pb-5 flex items-center gap-3">
          {ENABLE_VOICE ? (
            <>
              {voiceState === 'playing' ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium px-4 py-2 transition-colors"
                >
                  <StopIcon />
                  Stop
                  <span className="flex gap-0.5 ml-1">
                    {[1,2,3].map(i => (
                      <span
                        key={i}
                        className="w-0.5 bg-white rounded-full animate-pulse"
                        style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePlayVoice}
                  disabled={voiceState === 'loading'}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 transition-colors"
                >
                  {voiceState === 'loading' ? (
                    <><Spinner /> Generating…</>
                  ) : (
                    <><PlayIcon /> Play brief</>
                  )}
                </button>
              )}

              {voiceState === 'error' && (
                <p className="text-xs text-red-400">Voice unavailable — brief text shown above.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-600 italic">
              Voice playback disabled. Set NEXT_PUBLIC_ENABLE_VOICE=true to enable ElevenLabs.
            </p>
          )}

          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(briefText)}
            className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <CopyIcon />
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Brief text generator ──────────────────────────────────────────────────────

function buildBriefText(result: SimulationResult): string {
  const hardBlockers = result.blockers.filter((b) => b.severity === 'hard')
  const softBlockers = result.blockers.filter((b) => b.severity === 'soft')

  const lines: string[] = [
    `Prior Authorization Brief — ${result.payer_name}`,
    `Drug: ${result.drug_key.replace(/_/g, ' ')}`,
    `Fit Score: ${result.fit_score}/100`,
    '',
    result.pa_summary,
  ]

  if (hardBlockers.length > 0) {
    lines.push('', `Hard Blockers (${hardBlockers.length}):`)
    hardBlockers.forEach((b, i) => {
      lines.push(`${i + 1}. ${b.description}`)
      lines.push(`   Resolution: ${b.resolution}`)
    })
  }

  if (softBlockers.length > 0) {
    lines.push('', `Soft Blockers (${softBlockers.length}):`)
    softBlockers.forEach((b, i) => {
      lines.push(`${i + 1}. ${b.description}`)
    })
  }

  lines.push('', `Next Best Action: ${result.next_best_action}`)

  return lines.join('\n')
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-3.5 h-3.5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
