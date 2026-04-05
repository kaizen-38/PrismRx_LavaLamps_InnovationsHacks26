'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Send, RotateCcw, AlertCircle, Sparkles, Grid3x3, Radio, Mic, MicOff, Volume2 } from 'lucide-react'
import type { AssistantResponse } from '@/lib/assistant-types'
import { StagedLoader } from '@/components/assistant/StagedLoader'
import { WidgetRenderer } from '@/components/assistant/WidgetRenderer'
import { WidgetReveal } from '@/components/assistant/WidgetReveal'

// ── Types ────────────────────────────────────────────────────────────────────

type ConversationEntry = {
  id: string
  role: 'user' | 'assistant'
  text: string
  response?: AssistantResponse
  isLoading?: boolean
  error?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type StreamPayload =
  | { type: 'delta'; text: string }
  | { type: 'complete'; data: AssistantResponse }
  | { type: 'error'; message: string }

/** Only hardcoded assistant copy: first bubble when the workspace opens (all later replies come from the API). */
const INTRO_ASSISTANT_TEXT =
  'Hi — I\'m here to help you interpret medical benefit drug policies (coverage, PA, step therapy) using the documents we can pull for your plan. Tell me the payer and drug you\'re working on—for example: "Does UnitedHealthcare cover infliximab?"'

function createWelcomeIntroResponse(
  initialPayers: Array<{ id: string; displayName: string }>,
  initialDrugs: Array<{ key: string; displayName: string }>,
): AssistantResponse {
  return {
    requestId: 'welcome-intro',
    intent: 'greeting',
    assistantText: INTRO_ASSISTANT_TEXT,
    widget: {
      type: 'welcome_quick_actions',
      props: {
        supportedPayerCount: initialPayers.length,
        supportedDrugCount: initialDrugs.length,
      },
    },
    sideWidgets: [],
    loaderStages: [],
    meta: {
      resolvedPayer: null,
      resolvedDrug: null,
      isIndexed: true,
      dataSource: 'manual_indexed',
      modelUsed: 'fallback',
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * SSE from POST /api/assistant/respond/stream — deltas while Bedrock generates, then full envelope.
 */
async function consumeAssistantStream(
  message: string,
  context: Record<string, string | string[] | undefined> | undefined,
  onPayload: (p: StreamPayload) => void,
): Promise<void> {
  const res = await fetch('/api/assistant/respond/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const block of parts) {
      for (const line of block.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const raw = trimmed.slice(5).trim()
        let json: StreamPayload
        try {
          json = JSON.parse(raw) as StreamPayload
        } catch {
          continue
        }
        onPayload(json)
      }
    }
  }
}

// ── Main workspace client ────────────────────────────────────────────────────

export function WorkspaceClient({
  initialPayers,
  initialDrugs,
}: {
  initialPayers: Array<{ id: string; displayName: string }>
  initialDrugs: Array<{ key: string; displayName: string }>
}) {
  const [conversation, setConversation] = useState<ConversationEntry[]>(() => {
    const response = createWelcomeIntroResponse(initialPayers, initialDrugs)
    return [
      {
        id: 'welcome-intro',
        role: 'assistant',
        text: INTRO_ASSISTANT_TEXT,
        response,
      },
    ]
  })
  const [input, setInput] = useState('')
  const [activeResponse, setActiveResponse] = useState<AssistantResponse | null>(() =>
    createWelcomeIntroResponse(initialPayers, initialDrugs),
  )
  const [showLoader, setShowLoader] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const reduceMotion = useReducedMotion()

  // Workspace is below the global nav; `scrollIntoView` on chat children was
  // scrolling the document. Reset window scroll when entering this page.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useLayoutEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [conversation, reduceMotion])

  const handleSend = useCallback(async (
    message: string,
    context?: Record<string, string | string[] | undefined>,
    silent = false
  ) => {
    if (!message.trim() || isSubmitting) return
    setIsSubmitting(true)

    const entryId = Math.random().toString(36).slice(2)

    if (!silent) {
      setConversation(prev => [...prev, { id: entryId + '_user', role: 'user', text: message }])
      setInput('')
    }

    const loadingId = entryId + '_assistant'
    setConversation(prev => [...prev, { id: loadingId, role: 'assistant', text: '', isLoading: true }])

    let accumulated = ''
    try {
      await consumeAssistantStream(message, context, p => {
        if (p.type === 'delta') {
          accumulated += p.text
          setConversation(prev => prev.map(e =>
            e.id === loadingId
              ? { id: loadingId, role: 'assistant', text: accumulated, isLoading: false }
              : e
          ))
        }
        if (p.type === 'complete') {
          const response = p.data
          setConversation(prev => prev.map(e =>
            e.id === loadingId
              ? { id: loadingId, role: 'assistant', text: response.assistantText, response, isLoading: false }
              : e
          ))
          if (response.loaderStages.length > 0) {
            setShowLoader(true)
            setActiveResponse(null)
          } else {
            setActiveResponse(response)
            setShowLoader(false)
          }
        }
        if (p.type === 'error') {
          setConversation(prev => prev.map(e =>
            e.id === loadingId
              ? { id: loadingId, role: 'assistant', text: '', isLoading: false, error: p.message }
              : e
          ))
          setShowLoader(false)
        }
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      setConversation(prev => prev.map(e =>
        e.id === loadingId
          ? { id: loadingId, role: 'assistant', text: '', isLoading: false, error: errMsg }
          : e
      ))
      setShowLoader(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  const handleLoaderComplete = useCallback(() => {
    setShowLoader(false)
    const last = conversation.findLast(e => e.role === 'assistant' && e.response)
    if (last?.response) setActiveResponse(last.response)
  }, [conversation])

  const handleIntakeSubmit = useCallback((values: { payer: string; drug: string; [k: string]: string | undefined }) => {
    const message = `Check indexed coverage for ${values.drug} under ${values.payer}${values.diagnosis ? ` for ${values.diagnosis}` : ''}`
    handleSend(message, {
      payer: values.payer,
      drug: values.drug,
      diagnosis: values.diagnosis,
      icd10: values.icd10,
      specialty: values.specialty,
      careSetting: values.careSetting,
      age: values.age,
    })
  }, [handleSend])

  const handleAction = useCallback((actionId: string) => {
    const messages: Record<string, string> = {
      check_coverage: 'I want to check coverage for a specific payer and drug',
      compare_payers: 'Compare indexed payers',
      explore_drugs: 'What drugs are in the indexed dataset?',
      view_evidence: 'Show me policy evidence',
    }
    handleSend(messages[actionId] ?? actionId)
  }, [handleSend])

  const handleLookup = useCallback((payer: string, drug: string) => {
    if (payer && drug) {
      handleSend(`Check indexed coverage for ${drug} under ${payer}`, { payer, drug })
    } else if (payer) {
      handleSend(`Show coverage options for ${payer}`, { payer })
    } else if (drug) {
      handleSend(`Show payer options for ${drug}`, { drug })
    }
  }, [handleSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  // ── Voice pipeline: record → STT → model → ElevenLabs TTS ───────────────
  type VoiceState = 'idle' | 'recording' | 'transcribing' | 'speaking'
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Ref-based speaking guard prevents stale closure re-entrancy
  const isSpeakingRef = useRef(false)

  // Stop any playing audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      URL.revokeObjectURL(audioRef.current.src)
      audioRef.current = null
    }
    isSpeakingRef.current = false
  }, [])

  // Speak text via ElevenLabs — always fires after each new assistant reply
  const speakText = useCallback(async (text: string) => {
    if (!text || isSpeakingRef.current) return
    isSpeakingRef.current = true
    stopAudio()
    isSpeakingRef.current = true // re-set after stopAudio clears it
    setVoiceState('speaking')
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) { isSpeakingRef.current = false; setVoiceState('idle'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { isSpeakingRef.current = false; setVoiceState('idle'); URL.revokeObjectURL(url) }
      audio.onerror = () => { isSpeakingRef.current = false; setVoiceState('idle'); URL.revokeObjectURL(url) }
      await audio.play()
    } catch {
      isSpeakingRef.current = false
      setVoiceState('idle')
    }
  }, [stopAudio])

  // Auto-speak every new assistant reply
  const lastAssistantText = useMemo(
    () => conversation.findLast(e => e.role === 'assistant' && e.text && !e.isLoading)?.text ?? '',
    [conversation]
  )
  const prevSpokenRef = useRef('')
  useEffect(() => {
    if (lastAssistantText && lastAssistantText !== prevSpokenRef.current) {
      prevSpokenRef.current = lastAssistantText
      speakText(lastAssistantText)
    }
  }, [lastAssistantText, speakText])

  // Filter out garbage STT results (background noise transcribed as sound descriptions)
  function isValidSpeech(transcript: string): boolean {
    // Remove parenthetical sound descriptions: (clapping), (music), etc.
    const stripped = transcript.replace(/\(.*?\)/g, '').trim()
    // Must have at least 3 real words after stripping
    const words = stripped.split(/\s+/).filter(w => /[a-zA-Z]{2,}/.test(w))
    return words.length >= 3
  }

  // Start recording via MediaRecorder
  const startRecording = useCallback(async () => {
    stopAudio()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setVoiceState('transcribing')
        try {
          const form = new FormData()
          form.append('audio', blob, 'audio.webm')
          const res = await fetch('/api/voice/transcribe', { method: 'POST', body: form })
          const { transcript } = await res.json()
          const cleaned = (transcript ?? '').trim()
          // Only send if it looks like real speech, not background noise
          if (cleaned && isValidSpeech(cleaned)) {
            handleSend(cleaned)
          }
          // If garbage, silently drop — user can try again or type
        } catch {
          // network failure — silently drop
        } finally {
          setVoiceState('idle')
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setVoiceState('recording')
    } catch {
      setVoiceState('idle')
    }
  }, [stopAudio, handleSend])

  // Stop recording
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }, [])

  // Single tap: toggle record on/off
  const handleMicClick = useCallback(() => {
    if (voiceState === 'recording') {
      stopRecording()
    } else if (voiceState === 'speaking') {
      stopAudio()
      setVoiceState('idle')
    } else if (voiceState === 'idle') {
      startRecording()
    }
  }, [voiceState, startRecording, stopRecording, stopAudio])

  const latestLoaderStages = conversation.findLast(e => e.response?.loaderStages.length)?.response?.loaderStages ?? []
  const displayResponse = activeResponse
  const displayWidget = displayResponse?.widget ?? null

  const lastAssistantId = useMemo(
    () => conversation.findLast(e => e.role === 'assistant')?.id,
    [conversation]
  )

  const deckSubtitle = useMemo(() => {
    if (showLoader) return 'Tracing sources · extracting criteria'
    const m = displayResponse?.meta
    if (m?.resolvedPayer && m?.resolvedDrug) {
      return `${m.resolvedPayer} · ${m.resolvedDrug}`
    }
    return `${initialPayers.length} payers · ${initialDrugs.length} drug families indexed`
  }, [showLoader, displayResponse?.meta, initialPayers.length, initialDrugs.length])

  const deckBadge = useMemo(() => {
    if (showLoader) return { label: 'Working', tone: 'pulse' as const }
    const src = displayResponse?.meta?.dataSource
    if (src === 'live_web') return { label: 'Live web + extract', tone: 'live' as const }
    if (src === 'manual_indexed') return { label: 'Indexed corpus', tone: 'idx' as const }
    return { label: 'Ready', tone: 'idle' as const }
  }, [showLoader, displayResponse?.meta?.dataSource])

  return (
    <div
      data-workspace-page
      className="paper-texture"
      style={{
        display: 'flex',
        height: '100dvh',
        maxHeight: '100dvh',
        background: 'var(--bg-canvas)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT: conversation stream ───────────────────────────────────── */}
      <div
        style={{
          width: 'clamp(300px, 38%, 480px)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--line-soft)',
          background: 'linear-gradient(180deg, var(--bg-surface) 0%, rgba(255,255,255,0.92) 100%)',
          flexShrink: 0,
          boxShadow: '4px 0 32px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--line-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--accent-blue-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
              <polygon
                points="9,1.5 16.5,15.5 1.5,15.5"
                fill="none"
                stroke="url(#workspace-header-tri)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="workspace-header-tri" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2B50FF" />
                  <stop offset="100%" stopColor="#0F766E" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.02em',
              }}
            >
              Policy Workspace
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B', lineHeight: 1.35 }}>
              Indexed data + live web policy search · {initialPayers.length} payers · {initialDrugs.length} drugs in index
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopAudio()
              setVoiceState('idle')
              setConversation([])
              setActiveResponse(null)
              setShowLoader(false)
              setTimeout(() => handleSend('hi', undefined, true), 100)
            }}
            title="Reset conversation"
            style={{
              marginLeft: 'auto',
              background: 'var(--bg-soft)',
              border: '1px solid var(--line-soft)',
              borderRadius: 10,
              cursor: 'pointer',
              color: 'var(--ink-muted)',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RotateCcw style={{ width: 15, height: 15 }} />
          </button>
        </div>

        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '0.75rem 1rem 0.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* marginTop: auto pins the thread to the bottom when there are few messages */}
          <div style={{ marginTop: 'auto', width: '100%' }}>
          <div style={{ position: 'relative', paddingLeft: 14 }}>
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 5,
                top: 8,
                bottom: 8,
                width: 2,
                borderRadius: 2,
                background: 'linear-gradient(180deg, rgba(43,80,255,0.35) 0%, rgba(15,118,110,0.25) 50%, rgba(43,80,255,0.12) 100%)',
              }}
            />
            <AnimatePresence initial={false}>
              {conversation.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: entry.role === 'user' ? 12 : -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: 'flex',
                    justifyContent: entry.role === 'user' ? 'flex-end' : 'flex-start',
                    marginBottom: idx === conversation.length - 1 ? 4 : 14,
                    position: 'relative',
                  }}
                >
                  {entry.role === 'user' ? (
                    <div
                      style={{
                        maxWidth: '88%',
                        padding: '0.65rem 1rem',
                        background: 'linear-gradient(135deg, #3d62ff 0%, #2B50FF 42%, #2340d8 100%)',
                        color: '#fff',
                        borderRadius: '18px 18px 6px 18px',
                        fontSize: 13,
                        lineHeight: 1.55,
                        boxShadow: '0 10px 28px rgba(43, 80, 255, 0.22)',
                      }}
                    >
                      {entry.text}
                    </div>
                  ) : (
                    <div style={{ maxWidth: '100%', paddingLeft: 6, width: '100%' }}>
                      {entry.isLoading ? (
                        <TypingIndicator />
                      ) : entry.error ? (
                        <ErrorBubble
                          message={entry.error}
                          onRetry={() => {
                            const lastUser = conversation.findLast(e => e.role === 'user')
                            if (lastUser) handleSend(lastUser.text)
                          }}
                        />
                      ) : (
                        <AssistantBubble
                          text={entry.text}
                          response={entry.response}
                          isLatest={entry.id === lastAssistantId}
                          onShowReport={() => entry.response && setActiveResponse(entry.response)}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          </div>
        </div>

        <div style={{ padding: '0.5rem 1.25rem 0.65rem', borderTop: '1px solid var(--line-soft)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              background: 'var(--bg-soft)',
              borderRadius: 16,
              border: '1px solid var(--line-mid)',
              padding: '0.45rem 0.55rem',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voiceState === 'recording' ? 'Listening… tap mic to stop' : voiceState === 'transcribing' ? 'Transcribing your voice…' : 'Ask about PA, step therapy, or coverage…'}
              rows={1}
              disabled={isSubmitting}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--ink-strong)',
                resize: 'none',
                lineHeight: '20px',
                margin: 0,
                padding: '6px 8px',
                boxSizing: 'border-box',
                maxHeight: 120,
                overflow: 'auto',
              }}
            />
            {/* Voice button — single tap toggles full voice pipeline */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleMicClick}
              disabled={voiceState === 'transcribing'}
              title={
                voiceState === 'recording' ? 'Tap to stop recording'
                : voiceState === 'speaking' ? 'Tap to stop speaking'
                : voiceState === 'transcribing' ? 'Transcribing…'
                : 'Tap to speak'
              }
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: voiceState === 'recording'
                  ? '1.5px solid rgba(194,65,12,0.5)'
                  : voiceState === 'speaking'
                  ? '1.5px solid rgba(43,80,255,0.4)'
                  : '1px solid var(--line-soft)',
                flexShrink: 0,
                background: voiceState === 'recording'
                  ? 'rgba(194,65,12,0.1)'
                  : voiceState === 'speaking'
                  ? 'rgba(43,80,255,0.1)'
                  : 'var(--bg-surface)',
                color: voiceState === 'recording'
                  ? '#C2410C'
                  : voiceState === 'speaking'
                  ? '#2B50FF'
                  : 'var(--ink-muted)',
                cursor: voiceState === 'transcribing' ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {voiceState === 'recording' && (
                <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
                  <MicOff style={{ width: 14, height: 14 }} />
                </motion.span>
              )}
              {voiceState === 'speaking' && (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  <Volume2 style={{ width: 14, height: 14 }} />
                </motion.span>
              )}
              {voiceState === 'transcribing' && (
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <Mic style={{ width: 14, height: 14 }} />
                </motion.span>
              )}
              {voiceState === 'idle' && <Mic style={{ width: 14, height: 14 }} />}
            </motion.button>
            {/* Send button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isSubmitting}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: 'none',
                flexShrink: 0,
                background: input.trim() && !isSubmitting
                  ? 'linear-gradient(135deg, #3d62ff, #2B50FF)'
                  : 'var(--line-mid)',
                color: '#fff',
                cursor: input.trim() && !isSubmitting ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: input.trim() && !isSubmitting ? '0 6px 18px rgba(43,80,255,0.25)' : 'none',
              }}
            >
              <Send style={{ width: 15, height: 15 }} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: insight deck ─────────────────────────────────────────── */}
      <div
        role="region"
        aria-label="Coverage intelligence deck"
        aria-busy={showLoader}
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="workspace-deck-mesh" aria-hidden />
        <div className="workspace-deck-grid" aria-hidden />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            padding: '1rem 1.25rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '0.85rem',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid var(--line-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <Grid3x3 style={{ width: 20, height: 20, color: 'var(--accent-blue)' }} strokeWidth={2} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--accent-blue)',
                  }}
                >
                  Intelligence deck
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink-strong)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.3,
                  }}
                >
                  {deckSubtitle}
                </p>
              </div>
            </div>
            <DeckBadge badge={deckBadge} reduceMotion={Boolean(reduceMotion)} />
          </div>

          <div
            className="workspace-deck-glass"
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: '1rem 1.1rem',
            }}
          >
            <AnimatePresence mode="wait">
              {showLoader ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}
                >
                  <StagedLoader stages={latestLoaderStages} onComplete={handleLoaderComplete} />
                </motion.div>
              ) : displayWidget ? (
                <motion.div
                  key="widgets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <WidgetReveal delay={0} style={{ marginBottom: 2 }}>
                    <WidgetRenderer
                      widget={displayWidget}
                      onAction={handleAction}
                      onIntakeSubmit={handleIntakeSubmit}
                      onLookup={handleLookup}
                      onNewLookup={() => handleAction('check_coverage')}
                      supportedPayers={initialPayers}
                      supportedDrugs={initialDrugs}
                    />
                  </WidgetReveal>

                  {displayResponse?.sideWidgets.map((w, i) => (
                    <WidgetReveal key={i} delay={0.06 + i * 0.06} style={{ marginBottom: 2 }}>
                      <WidgetRenderer
                        widget={w}
                        onAction={handleAction}
                        onIntakeSubmit={handleIntakeSubmit}
                        onLookup={handleLookup}
                        onNewLookup={() => handleAction('check_coverage')}
                        supportedPayers={initialPayers}
                        supportedDrugs={initialDrugs}
                      />
                    </WidgetReveal>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '2rem 1.5rem',
                    minHeight: 200,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 22,
                      background: 'linear-gradient(135deg, rgba(43,80,255,0.12), rgba(15,118,110,0.1))',
                      border: '1px solid rgba(43,80,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <Radio style={{ width: 28, height: 28, color: 'var(--accent-blue)' }} strokeWidth={1.75} />
                  </div>
                  <p
                    className="text-gradient-accent"
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      fontFamily: 'var(--font-serif)',
                    }}
                  >
                    Awaiting your next question
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: 13, color: 'var(--ink-muted)', maxWidth: 280, lineHeight: 1.5 }}>
                    Coverage widgets, evidence, and criteria render here as soon as the assistant resolves payer + drug.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Deck status pill ───────────────────────────────────────────────────────────

function DeckBadge({ badge, reduceMotion }: { badge: { label: string; tone: 'pulse' | 'live' | 'idx' | 'idle' }; reduceMotion: boolean }) {
  const colors = {
    pulse: { bg: 'rgba(43,80,255,0.12)', border: 'rgba(43,80,255,0.25)', fg: 'var(--accent-blue)' },
    live: { bg: 'rgba(15,118,110,0.12)', border: 'rgba(15,118,110,0.28)', fg: 'var(--accent-teal)' },
    idx: { bg: 'rgba(43,80,255,0.08)', border: 'var(--line-mid)', fg: 'var(--ink-body)' },
    idle: { bg: 'var(--bg-soft)', border: 'var(--line-soft)', fg: 'var(--ink-muted)' },
  }
  const c = colors[badge.tone]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 9999,
        background: c.bg,
        border: `1px solid ${c.border}`,
        fontSize: 11,
        fontWeight: 600,
        color: c.fg,
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.02em',
      }}
    >
      {badge.tone === 'pulse' && (
        <motion.span
          animate={reduceMotion ? {} : { opacity: [1, 0.35, 1], scale: [1, 0.92, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent-blue)',
          }}
        />
      )}
      {badge.label}
    </div>
  )
}

// ── Chat sub-components ───────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0.65rem 0.9rem',
        background: 'var(--bg-soft)',
        borderRadius: '16px 16px 16px 6px',
        border: '1px solid var(--line-soft)',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-blue)' }}
            animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ repeat: Infinity, duration: 0.75, delay: i * 0.12 }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 500 }}>Thinking with your policies…</span>
    </div>
  )
}

function AssistantBubble({ text, response, isLatest, onShowReport }: {
  text: string
  response?: AssistantResponse
  isLatest: boolean
  onShowReport: () => void
}) {
  if (!text) return null
  const isIndexed = response?.meta.isIndexed
  const hasReport = isIndexed && response?.widget?.type === 'coverage_report_hero'

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', maxWidth: '100%' }}>
      <div
        aria-hidden
        style={{
          width: 3,
          borderRadius: 3,
          flexShrink: 0,
          background: 'linear-gradient(180deg, var(--accent-blue) 0%, var(--accent-teal) 100%)',
          opacity: 0.85,
          marginTop: 4,
          marginBottom: 4,
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            padding: '0.7rem 0.95rem',
            background: 'var(--bg-surface)',
            borderRadius: '16px 16px 16px 6px',
            fontSize: 13,
            color: 'var(--ink-body)',
            lineHeight: 1.6,
            border: '1px solid var(--line-soft)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {text}
        </div>
        {hasReport && isLatest && (
          <button
            type="button"
            onClick={onShowReport}
            style={{
              alignSelf: 'flex-start',
              fontSize: 12,
              color: '#fff',
              background: 'linear-gradient(135deg, #3d62ff, #2B50FF)',
              border: 'none',
              borderRadius: 9999,
              padding: '0.35rem 0.85rem',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              boxShadow: '0 6px 16px rgba(43,80,255,0.2)',
            }}
          >
            Open full report →
          </button>
        )}
      </div>
    </div>
  )
}

function ErrorBubble({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        padding: '0.75rem 0.9rem',
        background: 'var(--accent-coral-soft)',
        borderRadius: 14,
        border: '1px solid rgba(194, 65, 12, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle style={{ width: 14, height: 14, color: 'var(--accent-coral)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-coral)' }}>Something broke</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-body)' }}>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          alignSelf: 'flex-start',
          fontSize: 12,
          color: 'var(--accent-coral)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          textDecoration: 'underline',
        }}
      >
        Retry last message
      </button>
    </div>
  )
}
