'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, RotateCcw, AlertCircle } from 'lucide-react'
import type { AssistantResponse, Widget } from '@/lib/assistant-types'
import { StagedLoader } from '@/components/assistant/StagedLoader'
import { WidgetRenderer } from '@/components/assistant/WidgetRenderer'
import { RequestSummaryCard } from '@/components/assistant/RequestSummaryCard'
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
    signal: AbortSignal.timeout(30_000),
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
  const [activeWidgetOverride, setActiveWidgetOverride] = useState<Widget | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Send initial greeting on mount
  useEffect(() => {
    handleSend('hi', undefined, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleSend = useCallback(async (
    message: string,
    context?: Record<string, string | string[] | undefined>,
    silent = false
  ) => {
    if (!message.trim() || isSubmitting) return
    setIsSubmitting(true)
    setActiveWidgetOverride(null)

    const entryId = Math.random().toString(36).slice(2)

    if (!silent) {
      setConversation(prev => [...prev, { id: entryId + '_user', role: 'user', text: message }])
      setInput('')
    }

    // Add loading placeholder
    const loadingId = entryId + '_assistant'
    setConversation(prev => [...prev, { id: loadingId, role: 'assistant', text: '', isLoading: true }])

    try {
      const response = await sendMessage(message, context)

      // Replace loading entry
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

  const latestLoaderStages = conversation.findLast(e => e.response?.loaderStages.length)?.response?.loaderStages ?? []
  const displayResponse = activeResponse
  const displayWidget = activeWidgetOverride ?? displayResponse?.widget ?? null

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-canvas)', fontFamily: 'var(--font-sans)' }}>
      {/* ── LEFT PANE: conversation ─────────────────────────────────────── */}
      <div style={{
        width: 'clamp(320px, 42%, 520px)',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--line-soft)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <polygon points="9,1.5 16.5,15.5 1.5,15.5" fill="none" stroke="#2B50FF" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.01em' }}>Policy Workspace</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-muted)' }}>Indexed policy snapshot · {initialPayers.length} payers · {initialDrugs.length} drugs</p>
          </div>
          <button
            onClick={() => { setConversation([]); setActiveResponse(null); setShowLoader(false); setTimeout(() => handleSend('hi', undefined, true), 100) }}
            title="Reset conversation"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: '0.25rem' }}
          >
            <RotateCcw style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <AnimatePresence initial={false}>
            {conversation.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{ display: 'flex', justifyContent: entry.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                {entry.role === 'user' ? (
                  <div style={{
                    maxWidth: '80%', padding: '0.625rem 0.875rem',
                    background: '#2B50FF', color: '#fff', borderRadius: '14px 14px 4px 14px',
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {entry.text}
                  </div>
                ) : (
                  <div style={{ maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {entry.isLoading ? (
                      <TypingIndicator />
                    ) : entry.error ? (
                      <ErrorBubble message={entry.error} onRetry={() => {
                        const lastUser = conversation.findLast(e => e.role === 'user')
                        if (lastUser) handleSend(lastUser.text)
                      }} />
                    ) : (
                      <AssistantBubble
                        text={entry.text}
                        response={entry.response}
                        isLatest={entry === conversation.findLast(e => e.role === 'assistant')}
                        onShowReport={() => entry.response && setActiveResponse(entry.response)}
                      />
                    )}
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
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about indexed coverage, payers, or drugs…"
              rows={1}
              disabled={isSubmitting}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-strong)',
                resize: 'none', lineHeight: 1.5, maxHeight: 120, overflow: 'auto',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isSubmitting}
              style={{
                width: 32, height: 32, borderRadius: 9, border: 'none', flexShrink: 0,
                background: input.trim() && !isSubmitting ? '#2B50FF' : 'var(--line-mid)',
                color: '#fff', cursor: input.trim() && !isSubmitting ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <Send style={{ width: 13, height: 13 }} />
            </motion.button>
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: 10, color: 'var(--ink-faint)', textAlign: 'center' }}>
            Based on indexed policy snapshots · not live payer data
          </p>
        </div>
      </div>

      {/* ── RIGHT PANE: widgets ─────────────────────────────────────────── */}
      <div
        role="region"
        aria-label="Coverage report panel"
        aria-busy={showLoader}
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}
      >
        <AnimatePresence mode="wait">
          {showLoader ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StagedLoader stages={latestLoaderStages} onComplete={handleLoaderComplete} />
            </motion.div>
          ) : displayWidget ? (
            <motion.div key="widgets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {/* Request summary if applicable */}
              {displayResponse?.meta.resolvedPayer && displayResponse?.meta.resolvedDrug && (
                <WidgetReveal delay={0} style={{ marginBottom: '1rem' }}>
                  <RequestSummaryCard
                    resolvedPayer={displayResponse.meta.resolvedPayer}
                    resolvedDrug={displayResponse.meta.resolvedDrug}
                    matchConfidence={displayResponse.meta.isIndexed ? 'exact' : 'unindexed'}
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
                  onNewLookup={() => handleAction('check_coverage')}
                  supportedPayers={initialPayers}
                  supportedDrugs={initialDrugs}
                />
              </WidgetReveal>

              {/* Side widgets — progressively revealed */}
              {displayResponse?.sideWidgets.map((w, i) => (
                <WidgetReveal key={i} delay={0.08 + i * 0.07} style={{ marginBottom: '0.875rem' }}>
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
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }}>
              <p style={{ fontSize: 14, color: 'var(--ink-faint)', textAlign: 'center' }}>
                Results will appear here
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Small sub-components ──────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '0.625rem 0.875rem', background: 'var(--bg-soft)', borderRadius: '14px 14px 14px 4px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-faint)' }}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
        />
      ))}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{
        padding: '0.75rem 0.875rem', background: 'var(--bg-soft)',
        borderRadius: '14px 14px 14px 4px', fontSize: 13, color: 'var(--ink-body)', lineHeight: 1.6,
        border: '1px solid var(--line-soft)',
      }}>
        {text}
      </div>
      {hasReport && isLatest && (
        <button
          onClick={onShowReport}
          style={{
            alignSelf: 'flex-start', fontSize: 12, color: '#2B50FF',
            background: 'var(--accent-blue-soft)', border: 'none',
            borderRadius: 9999, padding: '0.25rem 0.75rem',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500,
          }}
        >
          View full report →
        </button>
      )}
      {response?.meta && (
        <p style={{ margin: 0, fontSize: 10, color: 'var(--ink-faint)' }}>
          {response.meta.dataSource === 'manual_indexed' ? 'Indexed policy snapshot' : 'Live data'} · {response.meta.modelUsed === 'bedrock' ? 'Bedrock' : 'Template'}
        </p>
      )}
    </div>
  )
}

function ErrorBubble({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      padding: '0.75rem 0.875rem', background: '#FFF1EB',
      borderRadius: 12, border: '1px solid #C2410C22',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle style={{ width: 13, height: 13, color: '#C2410C' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#C2410C' }}>Request failed</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-body)' }}>{message}</p>
      <button
        onClick={onRetry}
        style={{ alignSelf: 'flex-start', fontSize: 12, color: '#C2410C', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, textDecoration: 'underline' }}
      >
        Try again
      </button>
    </div>
  )
}
