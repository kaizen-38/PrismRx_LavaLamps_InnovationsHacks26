'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — AssistantDrawer
// Slide-up panel housing the full chat assistant.
// Triggered by the "Ask PrismRx" FAB on the workspace page.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, RotateCcw, MessageSquare, AlertCircle } from 'lucide-react'
import type { Widget, LoaderStage, AssistantIntent } from '@/lib/assistant-types'
import { StagedLoader } from '@/components/assistant/StagedLoader'
import { WidgetRenderer } from '@/components/assistant/WidgetRenderer'
import { RequestSummaryCard } from '@/components/assistant/RequestSummaryCard'
import { WidgetReveal } from '@/components/assistant/WidgetReveal'
import { WelcomeQuickActions } from '@/components/assistant/WelcomeQuickActions'
import { AssistantMarkdown } from '@/components/assistant/AssistantMarkdown'

// ── Types ─────────────────────────────────────────────────────────────────────

type Meta = {
  resolvedPayer: string | null
  resolvedDrug: string | null
  isIndexed: boolean
  dataSource: string
  timestamp: string
}

type ReportState = {
  intent: AssistantIntent
  widget: Widget | null
  sideWidgets: Widget[]
  loaderStages: LoaderStage[]
  meta: Meta
  modelUsed: 'bedrock' | 'fallback'
}

type ConversationEntry = {
  id: string
  role: 'user' | 'assistant'
  text: string
  report?: ReportState
  isLoading?: boolean
  error?: string
}

// ── SSE stream consumer ────────────────────────────────────────────────────────

async function streamAssistant(
  message: string,
  context: Record<string, string | undefined> | undefined,
  onInit: (report: Omit<ReportState, 'modelUsed'>) => void,
  onTextDelta: (delta: string) => void,
  onDone: (modelUsed: 'bedrock' | 'fallback') => void,
  signal: AbortSignal,
) {
  const res = await fetch('/api/assistant/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context }),
    signal,
  })

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (!raw) continue
      let event: Record<string, unknown>
      try { event = JSON.parse(raw) } catch { continue }

      if (event.type === 'init') {
        onInit({
          intent: event.intent as AssistantIntent,
          widget: event.widget as Widget | null,
          sideWidgets: event.sideWidgets as Widget[],
          loaderStages: event.loaderStages as LoaderStage[],
          meta: event.meta as Meta,
        })
      } else if (event.type === 'text_delta') {
        onTextDelta(event.text as string)
      } else if (event.type === 'done') {
        onDone(event.modelUsed as 'bedrock' | 'fallback')
      }
    }
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AssistantDrawerProps {
  open: boolean
  onClose: () => void
  initialPayers: { id: string; displayName: string }[]
  initialDrugs:  { key: string; displayName: string }[]
  payerDrugMap:  Record<string, string[]>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssistantDrawer({ open, onClose, initialPayers, initialDrugs, payerDrugMap }: AssistantDrawerProps) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  const getContext = useCallback(() => {
    const last = conversation.filter(e => e.role === 'assistant' && e.report).at(-1)
    const meta = last?.report?.meta
    return meta
      ? { resolvedPayer: meta.resolvedPayer ?? undefined, resolvedDrug: meta.resolvedDrug ?? undefined }
      : undefined
  }, [conversation])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const userEntry: ConversationEntry = { id: crypto.randomUUID(), role: 'user', text }
    const assistantId = crypto.randomUUID()
    const loadingEntry: ConversationEntry = { id: assistantId, role: 'assistant', text: '', isLoading: true }

    setConversation(prev => [...prev, userEntry, loadingEntry])
    setIsStreaming(true)
    setInput('')

    try {
      await streamAssistant(
        text,
        getContext(),
        (report) => {
          setConversation(prev => prev.map(e =>
            e.id === assistantId
              ? { ...e, isLoading: false, report: { ...report, modelUsed: 'bedrock' } }
              : e,
          ))
        },
        (delta) => {
          setConversation(prev => prev.map(e =>
            e.id === assistantId ? { ...e, text: e.text + delta } : e,
          ))
        },
        (modelUsed) => {
          setConversation(prev => prev.map(e =>
            e.id === assistantId ? { ...e, report: e.report ? { ...e.report, modelUsed } : e.report } : e,
          ))
        },
        ctrl.signal,
      )
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setConversation(prev => prev.map(e =>
        e.id === assistantId
          ? { ...e, isLoading: false, error: (err as Error).message ?? 'Something went wrong.' }
          : e,
      ))
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, getContext])

  function handleQuickAction(actionId: string) {
    const map: Record<string, string> = {
      check_coverage:  'Which payers cover infliximab?',
      compare_payers:  'Compare coverage for rituximab across all payers',
      explore_drugs:   'What drug families are indexed?',
      view_evidence:   'Show me policy evidence for vedolizumab',
    }
    if (map[actionId]) sendMessage(map[actionId])
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function handleReset() {
    abortRef.current?.abort()
    setConversation([])
    setInput('')
    setIsStreaming(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55]"
            style={{ background: 'rgba(15,23,42,0.10)' }}
            onClick={onClose}
          />

          {/* Right side panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[60] flex flex-col"
            style={{
              width: 'min(480px, 100vw)',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--line-soft)',
              boxShadow: '-8px 0 40px rgba(15,23,42,0.08)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--line-soft)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: '#ECF1FF' }}>
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: '#2B50FF' }} />
                </div>
                <span className="font-semibold text-sm" style={{ color: 'var(--ink-strong)' }}>Ask PrismRx</span>
                <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>· indexed coverage assistant</span>
              </div>
              <div className="flex items-center gap-1">
                {conversation.length > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                    style={{ color: 'var(--ink-muted)' }}
                    title="Clear conversation"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 transition-colors"
                  style={{ color: 'var(--ink-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {conversation.length === 0 && (
                <WelcomeQuickActions
                  supportedPayerCount={initialPayers.length}
                  supportedDrugCount={initialDrugs.length}
                  onAction={handleQuickAction}
                />
              )}

              {conversation.map((entry) => (
                <div key={entry.id}>
                  {entry.role === 'user' && (
                    <div className="flex justify-end">
                      <div
                        className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                        style={{ background: '#2B50FF', color: '#fff' }}
                      >
                        {entry.text}
                      </div>
                    </div>
                  )}

                  {entry.role === 'assistant' && (
                    <div className="space-y-3">
                      {entry.isLoading && entry.report && (
                        <StagedLoader stages={entry.report.loaderStages} onComplete={() => {}} />
                      )}
                      {entry.isLoading && !entry.report && (
                        <div className="flex items-center gap-2" style={{ color: 'var(--ink-faint)' }}>
                          <span className="flex gap-1">
                            {[0,1,2].map(i => (
                              <span
                                key={i}
                                className="inline-block w-1.5 h-1.5 rounded-full animate-bounce"
                                style={{ background: 'currentColor', animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </span>
                          <span className="text-xs">Thinking…</span>
                        </div>
                      )}

                      {entry.error && (
                        <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ background: '#FFF1EB', color: '#C2410C' }}>
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          {entry.error}
                        </div>
                      )}

                      {entry.report && !entry.isLoading && (
                        <>
                          {entry.report.meta.resolvedPayer && entry.report.meta.resolvedDrug && (
                            <RequestSummaryCard
                              resolvedPayer={entry.report.meta.resolvedPayer}
                              resolvedDrug={entry.report.meta.resolvedDrug}
                              matchConfidence="exact"
                              originalQuery=""
                            />
                          )}
                          {entry.report.widget && (
                            <WidgetReveal>
                              <WidgetRenderer
                                widget={entry.report.widget}
                                payerDrugMap={payerDrugMap}
                                onAction={handleQuickAction}
                                onIntakeSubmit={(v) => sendMessage(`Coverage for ${v.drug} at ${v.payer}`)}
                                onLookup={(payer, drug) => sendMessage(`Coverage for ${drug} at ${payer}`)}
                                onSelectPayer={(payer) => sendMessage(`Show options for ${payer}`)}
                                onNewLookup={() => handleReset()}
                              />
                            </WidgetReveal>
                          )}
                          {entry.report.sideWidgets.map((w, i) => (
                            <WidgetReveal key={i}>
                              <WidgetRenderer
                                widget={w}
                                payerDrugMap={payerDrugMap}
                                onAction={handleQuickAction}
                                onIntakeSubmit={(v) => sendMessage(`Coverage for ${v.drug} at ${v.payer}`)}
                                onLookup={(payer, drug) => sendMessage(`Coverage for ${drug} at ${payer}`)}
                                onSelectPayer={(payer) => sendMessage(`Show options for ${payer}`)}
                                onNewLookup={() => handleReset()}
                              />
                            </WidgetReveal>
                          ))}
                        </>
                      )}

                      {entry.text && (
                        <div className="text-sm leading-7" style={{ color: 'var(--ink-body)' }}>
                          <AssistantMarkdown>{entry.text}</AssistantMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-2">
              <div
                className="flex items-end gap-2 rounded-2xl px-4 py-3"
                style={{ background: 'var(--bg-soft)', border: '1.5px solid var(--line-mid)' }}
              >
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about coverage, criteria, blockers, or policy changes…"
                  disabled={isStreaming}
                  className="flex-1 resize-none bg-transparent outline-none text-sm"
                  style={{
                    color: 'var(--ink-strong)',
                    maxHeight: 120,
                    lineHeight: '1.6',
                  }}
                />
                <button
                  type="button"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: input.trim() && !isStreaming ? '#2B50FF' : 'var(--line-mid)',
                    color: input.trim() && !isStreaming ? '#fff' : 'var(--ink-faint)',
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px]" style={{ color: 'var(--ink-faint)' }}>
                Public documents only · Synthetic cases · No PHI
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
