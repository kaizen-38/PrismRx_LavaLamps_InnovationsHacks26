'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Search, ArrowRight, LayoutGrid, ClipboardCheck, Radio,
  TrendingDown, TrendingUp, AlertCircle,
} from 'lucide-react'
import { useAssistant } from '@/components/assistant/AssistantContext'
import { fadeUp, stagger } from '@/lib/motion/presets'

// ── Static data ───────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label:   'Check coverage',
    body:    'Ask which payers cover a specific drug and what conditions apply.',
    prompt:  'Does UnitedHealthcare cover infliximab for Rheumatoid Arthritis?',
    accent:  '#2B50FF',
    bg:      '#ECF1FF',
  },
  {
    label:   'Compare payers',
    body:    'Rank all indexed payers by access friction for a drug family.',
    prompt:  'Compare all indexed payers for rituximab coverage and step therapy burden.',
    accent:  '#0F766E',
    bg:      '#EAF8F4',
  },
  {
    label:   'Find blockers',
    body:    'Surface the PA criteria most likely to delay or deny a case.',
    prompt:  'What prior authorization blockers exist for vedolizumab across payers?',
    accent:  '#C2410C',
    bg:      '#FFF1EB',
  },
  {
    label:   'Policy evidence',
    body:    'Pull cited source excerpts for a specific coverage requirement.',
    prompt:  'Show me the policy evidence for step therapy requirements for infliximab at Cigna.',
    accent:  '#7C3AED',
    bg:      '#F3F0FF',
  },
]

const RECENT_CHANGES = [
  { payer: 'UnitedHealthcare', drug: 'Infliximab', field: 'Step Therapy', drift: 'tightened' as const, summary: 'Added requirement for 3-month DMARD trial before approval.' },
  { payer: 'Cigna',           drug: 'Rituximab',  field: 'Site of Care', drift: 'tightened' as const, summary: 'Hospital site of care no longer covered — infusion center required.' },
  { payer: 'UnitedHealthcare', drug: 'Vedolizumab', field: 'Prior Auth',  drift: 'loosened'  as const, summary: 'Removed TNF-inhibitor step therapy requirement for IBD indication.' },
]

const DRIFT_STYLE = {
  tightened: { color: '#E53935', bg: '#FFEBEE', icon: TrendingDown },
  loosened:  { color: '#12B886', bg: '#E6FAF4', icon: TrendingUp   },
  new:       { color: '#7C3AED', bg: '#F3F0FF', icon: AlertCircle  },
}

const SAMPLE_PROMPTS = [
  'Which payer has the most lenient criteria for infliximab?',
  'What does Aetna require for rituximab prior auth?',
  'Has Cigna changed their biosimilar step therapy this year?',
  'What site-of-care restrictions apply to vedolizumab?',
]

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkspaceClient({
  initialPayers,
  initialDrugs,
}: {
  initialPayers: Array<{ id: string; displayName: string }>
  initialDrugs:  Array<{ key: string; displayName: string }>
  payerDrugMap:  Record<string, string[]>
}) {
  const { open } = useAssistant()
  const router   = useRouter()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    if (q.length > 20 || /\b(cover|payer|pa|step|block|require|criteria)\b/i.test(q)) {
      open(q)
    } else {
      router.push(`/matrix?q=${encodeURIComponent(q)}`)
    }
  }

  return (
    <div
      data-workspace-page
      className="mx-auto max-w-screen-lg px-4 sm:px-8 pt-20 pb-20"
      style={{ minHeight: '100vh' }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="mb-10">
        <motion.p variants={fadeUp} style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-faint)', marginBottom: 8 }}>
          Policy Intelligence
        </motion.p>
        <motion.h1
          variants={fadeUp}
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: '-0.035em', marginBottom: '0.5rem' }}
        >
          Workspace
        </motion.h1>
        <motion.p variants={fadeUp} style={{ fontSize: 15, color: 'var(--ink-muted)', maxWidth: '52ch', lineHeight: 1.65 }}>
          Ask any coverage question in plain English, or jump directly into the structured tools below.
        </motion.p>
      </motion.div>

      {/* ── Ask bar ───────────────────────────────────────────────────────── */}
      <motion.form
        variants={fadeUp}
        initial="hidden"
        animate="show"
        onSubmit={handleSearch}
        className="mb-10"
      >
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4"
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--line-mid)',
            boxShadow: '0 4px 20px rgba(15,23,42,0.06)',
          }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: 'var(--ink-faint)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask about coverage, PA criteria, payer comparisons, or policy changes…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: 'var(--ink-strong)', fontSize: 15 }}
          />
          <button
            type="submit"
            className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ background: query.trim() ? '#2B50FF' : 'var(--line-mid)', color: query.trim() ? '#fff' : 'var(--ink-faint)', fontSize: 13 }}
          >
            Ask <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Sample prompts */}
        <div className="flex flex-wrap gap-2 mt-3">
          {SAMPLE_PROMPTS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => open(p)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{ background: 'var(--bg-soft)', color: 'var(--ink-muted)', border: '1px solid var(--line-soft)', cursor: 'pointer', fontSize: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2B50FF'; (e.currentTarget as HTMLElement).style.color = '#2B50FF' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-muted)' }}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.form>

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      <section className="mb-12">
        <p className="overline mb-4">Quick actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((a, i) => (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(15,23,42,0.09)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => open(a.prompt)}
              className="card p-5 text-left flex flex-col gap-3"
              style={{ cursor: 'pointer', border: 'none', fontFamily: 'var(--font-sans)' }}
            >
              <span
                className="inline-block w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: a.bg, color: a.accent, fontSize: 12, flexShrink: 0 }}
              >
                {a.label.charAt(0)}
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-strong)', marginBottom: 4 }}>{a.label}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.55 }}>{a.body}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Stats + Recent changes ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

        {/* Stats */}
        <section>
          <p className="overline mb-4">Indexed dataset</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { v: initialPayers.length, l: 'payers' },
              { v: initialDrugs.length,  l: 'drug families' },
              { v: initialPayers.length * initialDrugs.length, l: 'policy pairs' },
              { v: '< 5s',               l: 'to cited answer' },
            ].map(({ v, l }) => (
              <div
                key={l}
                className="card p-4"
                style={{ textAlign: 'center' }}
              >
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink-strong)', letterSpacing: '-0.03em', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  {v}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Jump to tools */}
          <p className="overline mb-4">Tools</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: '/matrix',   label: 'Coverage Matrix', body: 'Payer × drug coverage side-by-side.', icon: LayoutGrid,      accent: '#2B50FF' },
              { href: '/simulate', label: 'Simulator',       body: 'Score access friction for any case.', icon: ClipboardCheck, accent: '#0F766E' },
              { href: '/radar',    label: 'Radar',           body: 'Quarter-over-quarter policy changes.',  icon: Radio,          accent: '#7C3AED' },
            ].map(({ href, label, body, icon: Icon, accent }) => (
              <a
                key={href}
                href={href}
                className="card p-4 flex items-start gap-3 no-underline"
                style={{ color: 'inherit', cursor: 'pointer', textDecoration: 'none' }}
              >
                <span style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 15, height: 15, color: accent }} />
                </span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-strong)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{body}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Recent changes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="overline" style={{ margin: 0 }}>Recent policy changes</p>
            <a href="/radar" style={{ fontSize: 12, color: '#2B50FF', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </a>
          </div>
          <div className="card overflow-hidden">
            {RECENT_CHANGES.map((c, i) => {
              const d = DRIFT_STYLE[c.drift]
              const Icon = d.icon
              return (
                <div
                  key={i}
                  style={{
                    padding: '0.875rem 1rem',
                    borderBottom: i < RECENT_CHANGES.length - 1 ? '1px solid var(--line-soft)' : 'none',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 9999,
                        background: d.bg, color: d.color,
                        fontSize: 11, fontWeight: 600,
                      }}
                    >
                      <Icon style={{ width: 10, height: 10 }} />
                      {c.drift.charAt(0).toUpperCase() + c.drift.slice(1)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-strong)' }}>{c.payer}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>· {c.drug}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.55, margin: 0 }}>{c.summary}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
