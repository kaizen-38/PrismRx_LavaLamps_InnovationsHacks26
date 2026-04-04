'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Volume2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import type { BriefInput } from '@/app/api/voice/brief/route'

interface VoiceBriefProps extends BriefInput {
  context?: 'matrix' | 'radar' | 'simulator'
}

type State = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'error'

export function VoiceBrief({ context = 'matrix', ...briefData }: VoiceBriefProps) {
  const [state, setState]           = useState<State>('idle')
  const [transcript, setTranscript] = useState<string>('')
  const [showScript, setShowScript] = useState(false)
  const [progress, setProgress]     = useState(0)
  const [duration, setDuration]     = useState(0)
  const [error, setError]           = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const fetchAndPlay = useCallback(async () => {
    if (state === 'loading') return
    setState('loading')
    setError(null)

    try {
      const res = await fetch('/api/voice/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefData),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? `HTTP ${res.status}`)
      }

      // Extract transcript from response header
      const rawTranscript = res.headers.get('X-Brief-Transcript')
      if (rawTranscript) setTranscript(decodeURIComponent(rawTranscript))

      // Create audio blob URL
      const blob = await res.blob()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) setProgress(audio.currentTime / audio.duration)
      })
      audio.addEventListener('ended', () => { setState('ready'); setProgress(0) })
      audio.addEventListener('error', () => { setState('error'); setError('Audio playback failed') })

      await audio.play()
      setState('playing')
    } catch (err) {
      console.error('[VoiceBrief]', err)
      setError(err instanceof Error ? err.message : 'Failed to generate brief')
      setState('error')
    }
  }, [briefData, state])

  function togglePlayPause() {
    const audio = audioRef.current
    if (!audio) return
    if (state === 'playing') {
      audio.pause()
      setState('paused')
    } else if (state === 'paused') {
      audio.play()
      setState('playing')
    }
  }

  function replay() {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.play()
    setState('playing')
  }

  const isActive = state === 'playing' || state === 'paused' || state === 'ready'

  return (
    <div
      style={{
        borderRadius: 16,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #E7EDF5',
        boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px',
        }}
      >
        {/* Play / Pause / Replay button */}
        {state === 'idle' || state === 'error' ? (
          <motion.button
            onClick={fetchAndPlay}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 9999,
              background: '#2B50FF', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#FFFFFF',
              flexShrink: 0,
            }}
            whileHover={{ background: '#1D4ED8' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Play brief
          </motion.button>
        ) : state === 'loading' ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px', borderRadius: 9999,
              background: '#ECF1FF',
              fontSize: 13, fontWeight: 600, color: '#2B50FF',
            }}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating…
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={togglePlayPause}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#ECF1FF', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2B50FF', flexShrink: 0,
              }}
              title={state === 'playing' ? 'Pause' : 'Play'}
            >
              {state === 'playing'
                ? <Pause className="w-3.5 h-3.5" />
                : <Play className="w-3.5 h-3.5" style={{ marginLeft: 1 }} />
              }
            </button>
            <button
              onClick={replay}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94A3B8',
              }}
              title="Replay"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {state === 'idle' && (
            <span style={{ fontSize: 12, color: '#64748B' }}>
              30-second spoken summary
            </span>
          )}
          {state === 'error' && (
            <span style={{ fontSize: 12, color: '#C2410C' }}>
              {error ?? 'Try again'}
            </span>
          )}
          {isActive && (
            <div>
              {/* Progress bar */}
              <div
                style={{
                  height: 3, borderRadius: 9999,
                  background: '#E7EDF5', overflow: 'hidden', marginBottom: 4,
                }}
              >
                <motion.div
                  style={{
                    height: '100%', borderRadius: 9999,
                    background: '#2B50FF',
                    width: `${progress * 100}%`,
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              {duration > 0 && (
                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {Math.round(progress * duration)}s / {Math.round(duration)}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* Transcript toggle */}
        {transcript && (
          <button
            onClick={() => setShowScript(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 8,
              background: 'transparent', border: '1px solid #E7EDF5',
              cursor: 'pointer', fontSize: 11, color: '#64748B',
              flexShrink: 0,
            }}
          >
            Transcript
            {showScript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Waveform animation — only while playing */}
      <AnimatePresence>
        {state === 'playing' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 20, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '0 14px',
              borderTop: '1px solid #F3F6FB',
              overflow: 'hidden',
            }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                style={{ width: 2, borderRadius: 1, background: '#2B50FF', opacity: 0.6 }}
                animate={{ height: [4, 14, 4] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.06,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript drawer */}
      <AnimatePresence>
        {showScript && transcript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderTop: '1px solid #E7EDF5',
                background: '#F6F8FB',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Transcript
              </p>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, fontStyle: 'italic' }}>
                &ldquo;{transcript}&rdquo;
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
