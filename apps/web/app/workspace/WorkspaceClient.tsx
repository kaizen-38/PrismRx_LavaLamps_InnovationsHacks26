'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RotateCcw, AlertCircle, Search, BarChart2, FlaskConical, BookOpen } from 'lucide-react'
import type { Widget, LoaderStage, AssistantIntent } from '@/lib/assistant-types'
import { StagedLoader } from '@/components/assistant/StagedLoader'
import { WidgetRenderer } from '@/components/assistant/WidgetRenderer'
import { RequestSummaryCard } from '@/components/assistant/RequestSummaryCard'
import { WidgetReveal } from '@/components/assistant/WidgetReveal'
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
  text: string           // streams in for assistant
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
  signal: AbortSignal
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
    buf = lines.pop() ?? ''  // keep incomplete line

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

// ── Main workspace client ────────────────────────────────────────────────────

export function WorkspaceClient({
  initialPayers,
  initialDrugs,
  payerDrugMap,
}: {
  initialPayers: Array<{ id: string; displayName: string }>
  initialDrugs: Array<{ key: string; displayName: string }>
  payerDrugMap: Record<string, string[]>
}) {
  const [conversation, setConversation] = useState<ConversationEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeReport, setActiveReport] = useState<ReportState | null>(null)
  const [showLoader, setShowLoader] = useState(false)
  const [loaderStages, setLoaderStages] = useState<LoaderStage[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // No auto-greeting — welcome state is rendered directly

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleSend = useCallback(async (
    message: string,
    context?: Record<string, string | undefined>,
    silent = false
  ) => {
    if (!message.trim() || isSubmitting) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsSubmitting(true)
    setActiveReport(null)
    setShowLoader(false)

    const entryId = Date.now().toString(36)

    if (!silent) {
      setConversation(prev => [...prev, { id: entryId + '_u', role: 'user', text: message }])
      setInput('')
    }

    const assistantId = entryId + '_a'
    setConversation(prev => [...prev, { id: assistantId, role: 'assistant', text: '', isLoading: true }])

    try {
      await streamAssistant(
        message,
        context,
        // onInit
        (report) => {
          if (report.loaderStages.length > 0) {
            setLoaderStages(report.loaderStages)
            setShowLoader(true)
          }
          // Store partial report (no modelUsed yet)
          setActiveReport({ ...report, modelUsed: 'fallback' })
          // Clear loading indicator
          setConversation(prev => prev.map(e => e.id === assistantId ? { ...e, isLoading: false } : e))
        },
        // onTextDelta — stream text into the conversation entry
        (delta) => {
          setConversation(prev => prev.map(e =>
            e.id === assistantId ? { ...e, text: e.text + delta, isLoading: false } : e
          ))
        },
        // onDone
        (modelUsed) => {
          setActiveReport(prev => prev ? { ...prev, modelUsed } : prev)
          setConversation(prev => prev.map(e =>
            e.id === assistantId
              ? { ...e, isLoading: false }
              : e
          ))
          setIsSubmitting(false)
        },
        controller.signal
      )
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setConversation(prev => prev.map(e =>
        e.id === assistantId ? { ...e, isLoading: false, error: msg } : e
      ))
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  const handleLoaderComplete = useCallback(() => {
    setShowLoader(false)
  }, [])

  const handleIntakeSubmit = useCallback((vals: { payer: string; drug: string; [k: string]: string | undefined }) => {
    const msg = `Check indexed coverage for ${vals.drug} under ${vals.payer}${vals.diagnosis ? ` for ${vals.diagnosis}` : ''}`
    handleSend(msg, { payer: vals.payer, drug: vals.drug, diagnosis: vals.diagnosis, icd10: vals.icd10, specialty: vals.specialty, careSetting: vals.careSetting, age: vals.age })
  }, [handleSend])

  const handleAction = useCallback((actionId: string) => {
    const msgs: Record<string, string> = {
      check_coverage: 'I want to check coverage for a specific payer and drug',
      compare_payers: 'Compare indexed payers',
      explore_drugs: 'What drugs are in the indexed dataset?',
      view_evidence: 'Show me policy evidence',
    }
    handleSend(msgs[actionId] ?? actionId)
  }, [handleSend])

  const handleLookup = useCallback((payer: string, drug: string) => {
    if (payer && drug) handleSend(`Check indexed coverage for ${drug} under ${payer}`, { payer, drug })
    else if (drug) handleSend(`Show payer options for ${drug}`, { drug })
    // payer-only: use handleSelectPayer instead
  }, [handleSend])

  // Opens the intake form prefilled with the selected payer — does NOT trigger a lookup
  const handleSelectPayer = useCallback((payerName: string) => {
    handleSend(`I want to check coverage under ${payerName}`, { payer: payerName })
  }, [handleSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input) }
  }

  const displayWidget = activeReport?.widget ?? null
  const displayReport = activeReport

  return (
    <div data-workspace-page style={{ display: 'flex', height: '100vh', paddingTop: 56, boxSizing: 'border-box', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }}>

      {/* ── LEFT PANE ─────────────────────────────────────────────────── */}
      <div style={{ width: 'clamp(320px, 42%, 520px)', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line-soft)', background: 'var(--bg-surface)', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <polygon points="9,1.5 16.5,15.5 1.5,15.5" fill="none" stroke="#2B50FF" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.01em' }}>Policy Workspace</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)' }}>Indexed snapshot · {initialPayers.length} payers · {initialDrugs.length} drugs</p>
          </div>
          <button
            onClick={() => { setConversation([]); setActiveReport(null); setShowLoader(false); setInput('') }}
            title="Reset"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: 4 }}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Messages */}
        <div role="log" aria-live="polite" aria-label="Conversation" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {conversation.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                Ask a question to get started. Try:
              </p>
              {[
                'Which payers cover rituximab for RA?',
                'What are the step therapy requirements for Cigna infliximab?',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  style={{ padding: '0.4rem 0.65rem', background: 'var(--bg-soft)', borderRadius: 9, border: '1px solid var(--line-soft)', fontSize: 12, color: 'var(--ink-body)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', transition: 'border-color 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-soft)')}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <AnimatePresence initial={false}>
            {conversation.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', justifyContent: entry.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                {entry.role === 'user' ? (
                  <div style={{ maxWidth: '80%', padding: '0.625rem 0.875rem', background: '#2B50FF', color: '#fff', borderRadius: '14px 14px 4px 14px', fontSize: 13, lineHeight: 1.5 }}>
                    {entry.text}
                  </div>
                ) : (
                  <div style={{ maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {entry.isLoading ? (
                      <TypingIndicator />
                    ) : entry.error ? (
                      <ErrorBubble message={entry.error} onRetry={() => { const u = conversation.findLast(e => e.role === 'user'); if (u) handleSend(u.text) }} />
                    ) : entry.text ? (
                      <AssistantBubble
                        text={entry.text}
                        modelUsed={displayReport?.modelUsed}
                        dataSource={displayReport?.meta.dataSource}
                        isLatest={entry === conversation.findLast(e => e.role === 'assistant' && e.text)}
                        onViewReport={() => setActiveReport(prev => prev)}
                      />
                    ) : null}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end', background: 'var(--bg-soft)', borderRadius: 14, border: '1px solid var(--line-mid)', padding: '0.625rem' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about indexed coverage, payers, or drugs…"
              rows={1}
              disabled={isSubmitting}
              aria-label="Message input"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-strong)', resize: 'none', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isSubmitting}
              aria-label="Send message"
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', flexShrink: 0, background: input.trim() && !isSubmitting ? '#2B50FF' : 'var(--line-mid)', color: '#fff', cursor: input.trim() && !isSubmitting ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
            >
              <Send style={{ width: 13, height: 13 }} />
            </motion.button>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center' }}>
            Based on indexed policy snapshots · not live payer data
          </p>
        </div>
      </div>

      {/* ── RIGHT PANE ────────────────────────────────────────────────── */}
      <div
        role="region"
        aria-label="Coverage report panel"
        aria-busy={showLoader}
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}
      >
        <AnimatePresence mode="wait">
          {showLoader ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StagedLoader stages={loaderStages} onComplete={handleLoaderComplete} />
            </motion.div>

          ) : displayWidget ? (
            <motion.div key="widgets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* Request summary */}
              {displayReport?.meta.resolvedPayer && displayReport?.meta.resolvedDrug && (
                <WidgetReveal delay={0} style={{ marginBottom: '1rem' }}>
                  <RequestSummaryCard
                    resolvedPayer={displayReport.meta.resolvedPayer}
                    resolvedDrug={displayReport.meta.resolvedDrug}
                    matchConfidence={
                      displayReport.meta.dataSource === 'live_web'
                        ? 'approximate'
                        : displayReport.meta.isIndexed
                          ? 'exact'
                          : 'unindexed'
                    }
                    originalQuery={conversation.findLast(e => e.role === 'user')?.text ?? ''}
                  />
                </WidgetReveal>
              )}

              {/* Primary widget */}
              <WidgetReveal delay={0.05} style={{ marginBottom: '1rem' }}>
                <WidgetRenderer
                  widget={displayWidget}
                  onAction={handleAction}
                  onIntakeSubmit={handleIntakeSubmit}
                  onLookup={handleLookup}
                  onSelectPayer={handleSelectPayer}
                  onNewLookup={() => handleAction('check_coverage')}
                  supportedPayers={initialPayers}
                  supportedDrugs={initialDrugs}
                  payerDrugMap={payerDrugMap}
                />
              </WidgetReveal>

              {/* Side widgets */}
              {displayReport?.sideWidgets.map((w, i) => (
                <WidgetReveal key={i} delay={0.08 + i * 0.07} style={{ marginBottom: '0.875rem' }}>
                  <WidgetRenderer
                    widget={w}
                    onAction={handleAction}
                    onIntakeSubmit={handleIntakeSubmit}
                    onLookup={handleLookup}
                    onSelectPayer={handleSelectPayer}
                    onNewLookup={() => handleAction('check_coverage')}
                    supportedPayers={initialPayers}
                    supportedDrugs={initialDrugs}
                    payerDrugMap={payerDrugMap}
                  />
                </WidgetReveal>
              ))}
            </motion.div>

          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} style={{ padding: '0.5rem' }}>
              <WelcomePanel
                payerCount={initialPayers.length}
                drugCount={initialDrugs.length}
                onAction={handleAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '0.625rem 0.875rem', background: 'var(--bg-soft)', borderRadius: '14px 14px 14px 4px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-faint)' }} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
      ))}
    </div>
  )
}

function AssistantBubble({
  text,
  modelUsed,
  dataSource,
  isLatest,
  onViewReport,
}: {
  text: string
  modelUsed?: 'bedrock' | 'fallback'
  dataSource?: string
  isLatest: boolean
  onViewReport: () => void
}) {
  const sourceLabel =
    dataSource === 'live_web' ? 'Live web excerpt' : 'Indexed snapshot'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ padding: '0.75rem 0.875rem', background: 'var(--bg-soft)', borderRadius: '14px 14px 14px 4px', fontSize: 13, color: 'var(--ink-body)', lineHeight: 1.65, border: '1px solid var(--line-soft)' }}>
        <AssistantMarkdown>{text}</AssistantMarkdown>
        {isLatest ? (
          <span style={{ display: 'inline-block', marginTop: 2, verticalAlign: 'middle' }}>
            <StreamCursor />
          </span>
        ) : null}
      </div>
      {modelUsed && (
        <p style={{ margin: 0, fontSize: 10, color: 'var(--ink-faint)' }}>
          {sourceLabel} · {modelUsed === 'bedrock' ? 'Bedrock' : 'Template'}
        </p>
      )}
    </div>
  )
}

function StreamCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ repeat: Infinity, duration: 0.9 }}
      style={{ display: 'inline-block', width: 2, height: '0.85em', background: 'var(--accent-blue)', borderRadius: 1, marginLeft: 2, verticalAlign: 'text-bottom' }}
    />
  )
}

function ErrorBubble({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ padding: '0.75rem 0.875rem', background: '#FFF1EB', borderRadius: 12, border: '1px solid #C2410C22', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertCircle style={{ width: 13, height: 13, color: '#C2410C' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#C2410C' }}>Request failed</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-body)' }}>{message}</p>
      <button onClick={onRetry} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#C2410C', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, textDecoration: 'underline' }}>
        Try again
      </button>
    </div>
  )
}

// ── Welcome panel (right pane, shown before first query) ─────────────────────

const QUICK_ACTIONS = [
  { id: 'check_coverage',  label: 'Check coverage',          icon: Search,       accent: '#2B50FF', bg: '#ECF1FF' },
  { id: 'compare_payers',  label: 'Compare indexed payers',  icon: BarChart2,    accent: '#0F766E', bg: '#EAF8F4' },
  { id: 'explore_drugs',   label: 'Explore supported drugs',  icon: FlaskConical, accent: '#B45309', bg: '#FFF6E8' },
  { id: 'view_evidence',   label: 'View policy evidence',     icon: BookOpen,     accent: '#7C3AED', bg: '#F3F0FF' },
]

function WelcomePanel({ payerCount, drugCount, onAction }: { payerCount: number; drugCount: number; onAction: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 520 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <polygon points="9,1.5 16.5,15.5 1.5,15.5" fill="none" stroke="#2B50FF" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.01em' }}>Policy Workspace</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-muted)' }}>{payerCount} payers · {drugCount} drug families indexed</p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-body)', lineHeight: 1.65, maxWidth: '48ch' }}>
          Ask any coverage question in plain English. PrismRx will pull the indexed payer policy, extract PA criteria, and return a structured verdict with citations.
        </p>
      </div>

      {/* Quick action grid */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-faint)' }}>
          Quick actions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {QUICK_ACTIONS.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(15,23,42,0.07)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onAction(a.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '0.75rem 1rem',
                background: 'var(--bg-surface)', borderRadius: 14,
                border: '1px solid var(--line-soft)',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 8, background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.icon style={{ width: 14, height: 14, color: a.accent }} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-body)', lineHeight: 1.3 }}>
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Suggested starters */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-faint)' }}>
          Try asking
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Does UnitedHealthcare cover infliximab for RA?',
            'What step therapy does Cigna require for rituximab?',
            'Which payer has the most lenient criteria for vedolizumab?',
          ].map((q) => (
            <button
              key={q}
              onClick={() => onAction(q)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-soft)', borderRadius: 10,
                border: '1px solid var(--line-soft)',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-sans)', fontSize: 13,
                color: 'var(--ink-body)', lineHeight: 1.45,
                transition: 'border-color 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line-soft)')}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
