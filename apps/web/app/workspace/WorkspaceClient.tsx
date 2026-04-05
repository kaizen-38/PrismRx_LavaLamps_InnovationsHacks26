'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Send, RotateCcw, AlertCircle, Sparkles, Grid3x3, Radio, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
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

async function sendMessage(
  message: string,
  context?: Record<string, string | string[] | undefined>
): Promise<AssistantResponse> {
  const res = await fetch('/api/assistant/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }

  const json = await res.json()
  if (json.status !== 'ok') throw new Error(json.message ?? 'Unknown error')
  return json.data as AssistantResponse
}

// ── Main workspace client ────────────────────────────────────────────────────

export function WorkspaceClient({
  initialPayers,
  initialDrugs,
}: {
  initialPayers: Array<{ id: string; displayName: string }>
  initialDrugs: Array<{ key: string; displayName: string }>
}) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [input, setInput] = useState('')
  const [activeResponse, setActiveResponse] = useState<AssistantResponse | null>(null)
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

  // Silent greeting on mount. Cleanup + `cancelled` drops the first Strict Mode
  // invocation’s in-flight result so dev doesn’t double the message; a real
  // navigation away and back remounts fresh and runs this again.
  useEffect(() => {
    let cancelled = false
    const entryId = Math.random().toString(36).slice(2)
    const loadingId = `${entryId}_assistant`

    setIsSubmitting(true)
    setConversation([{ id: loadingId, role: 'assistant', text: '', isLoading: true }])

    ;(async () => {
      try {
        const response = await sendMessage('hi', undefined)
        if (cancelled) return
        setConversation([
          {
            id: loadingId,
            role: 'assistant',
            text: response.assistantText,
            response,
            isLoading: false,
          },
        ])
        if (response.loaderStages.length > 0) {
          setShowLoader(true)
          setActiveResponse(null)
        } else {
          setActiveResponse(response)
          setShowLoader(false)
        }
      } catch (err) {
        if (cancelled) return
        const errMsg = err instanceof Error ? err.message : 'Something went wrong'
        setConversation([
          {
            id: loadingId,
            role: 'assistant',
            text: '',
            isLoading: false,
            error: errMsg,
          },
        ])
        setShowLoader(false)
      } finally {
        if (!cancelled) setIsSubmitting(false)
      }
    })()

    return () => {
      cancelled = true
    }
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

    try {
      const response = await sendMessage(message, context)

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

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) {
      alert('Voice input is only supported in Chrome or Edge. Please switch browsers.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript: string = e.results[0]?.[0]?.transcript ?? ''
      if (transcript) {
        setInput(prev => (prev ? prev + ' ' + transcript : transcript))
        setIsListening(false)
      }
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    recognitionRef.current = rec
    rec.start()
    setIsListening(true)
  }, [isListening])

  // ── ElevenLabs TTS output ────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speakText = useCallback(async (text: string) => {
    if (!text || isSpeaking) return
    // Stop any in-progress audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(true)
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
      await audio.play()
    } catch {
      setIsSpeaking(false)
    }
  }, [isSpeaking])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  // Auto-speak latest assistant reply when autoSpeak is on
  const lastAssistantText = useMemo(
    () => conversation.findLast(e => e.role === 'assistant' && e.text && !e.isLoading)?.text ?? '',
    [conversation]
  )
  const prevLastTextRef = useRef('')
  useEffect(() => {
    if (!autoSpeak) return
    if (lastAssistantText && lastAssistantText !== prevLastTextRef.current) {
      prevLastTextRef.current = lastAssistantText
      speakText(lastAssistantText)
    }
  }, [lastAssistantText, autoSpeak, speakText])

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
            background: 'linear-gradient(135deg, rgba(43,80,255,0.04) 0%, transparent 55%)',
          }}
        >
          <motion.div
            animate={reduceMotion ? {} : { rotate: [0, 6, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #2B50FF 0%, #5B7CFF 45%, #0F766E 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(43, 80, 255, 0.28)',
            }}
          >
            <Sparkles style={{ width: 18, height: 18, color: '#fff' }} strokeWidth={2} />
          </motion.div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--ink-strong)',
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-serif)',
              }}
            >
              PrismRx Copilot
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.35 }}>
              Document-grounded answers · indexed + live policy pull
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Auto-speak toggle */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (isSpeaking) stopSpeaking()
                setAutoSpeak(v => !v)
              }}
              title={autoSpeak ? 'Voice on — click to mute' : 'Click to enable voice responses'}
              style={{
                background: autoSpeak ? 'rgba(43,80,255,0.1)' : 'var(--bg-soft)',
                border: autoSpeak ? '1px solid rgba(43,80,255,0.3)' : '1px solid var(--line-soft)',
                borderRadius: 10, cursor: 'pointer',
                color: autoSpeak ? '#2B50FF' : 'var(--ink-muted)',
                padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isSpeaking
                ? <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}><Volume2 style={{ width: 15, height: 15 }} /></motion.span>
                : autoSpeak ? <Volume2 style={{ width: 15, height: 15 }} /> : <VolumeX style={{ width: 15, height: 15 }} />
              }
            </motion.button>
            {/* Reset */}
            <button
              type="button"
              onClick={() => {
                stopSpeaking()
                setConversation([])
                setActiveResponse(null)
                setShowLoader(false)
                setTimeout(() => handleSend('hi', undefined, true), 100)
              }}
              title="Reset conversation"
              style={{
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
        </div>

        <div
          ref={chatScrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '1rem 1rem 1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
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
                          onSpeak={speakText}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-soft)', background: 'var(--bg-surface)' }}>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-end',
              background: 'var(--bg-soft)',
              borderRadius: 16,
              border: '1px solid var(--line-mid)',
              padding: '0.5rem 0.6rem',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.04)',
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening…' : 'Ask about PA, step therapy, or coverage…'}
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
                lineHeight: 1.5,
                maxHeight: 120,
                overflow: 'auto',
              }}
            />
            {/* Mic button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={toggleVoice}
              title={isListening ? 'Stop listening' : 'Speak your question'}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                border: isListening ? '1.5px solid rgba(194,65,12,0.35)' : '1px solid var(--line-soft)',
                flexShrink: 0,
                background: isListening ? 'rgba(194,65,12,0.12)' : 'var(--bg-surface)',
                color: isListening ? '#C2410C' : 'var(--ink-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {isListening
                ? <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><MicOff style={{ width: 14, height: 14 }} /></motion.span>
                : <Mic style={{ width: 14, height: 14 }} />
              }
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

function AssistantBubble({ text, response, isLatest, onShowReport, onSpeak }: {
  text: string
  response?: AssistantResponse
  isLatest: boolean
  onShowReport: () => void
  onSpeak: (t: string) => void
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
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Speak this reply button */}
          <button
            type="button"
            onClick={() => onSpeak(text)}
            title="Read aloud"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--ink-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 0.25rem', fontFamily: 'var(--font-sans)',
            }}
          >
            <Volume2 style={{ width: 12, height: 12 }} />
            Speak
          </button>
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
