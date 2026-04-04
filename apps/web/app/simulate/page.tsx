'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, ChevronRight, CheckCircle2,
  AlertCircle, XCircle, Loader2, ArrowRight,
} from 'lucide-react'
import { runSimulation } from '@/lib/api-client'
import type { SimulationCase, SimulationResult } from '@/lib/types'
import { fadeUp, stagger, spring } from '@/lib/motion/presets'

const DRUG_OPTIONS = [
  { key: 'infliximab', label: 'Infliximab (Remicade / biosimilars)' },
  { key: 'rituximab',  label: 'Rituximab (Rituxan / biosimilars)'  },
]

const CARE_SETTINGS = [
  { value: 'infusion_center', label: 'Infusion Center' },
  { value: 'hospital',        label: 'Hospital'         },
  { value: 'home',            label: 'Home'             },
  { value: 'office',          label: 'Office'           },
] as const

const EXAMPLE_CASES: Array<{ label: string; data: SimulationCase }> = [
  {
    label: 'RA — Infliximab, no prior therapy',
    data: { diagnosis: 'Rheumatoid Arthritis', icd10_code: 'M05.9', drug_key: 'infliximab', prior_therapies: [], specialty: 'Rheumatology', care_setting: 'infusion_center', age: 52, labs: {}, notes: '' },
  },
  {
    label: "Crohn's — Infliximab, after DMARD failure",
    data: { diagnosis: "Crohn's Disease", icd10_code: 'K50.90', drug_key: 'infliximab', prior_therapies: ['Azathioprine', 'Methotrexate'], specialty: 'Gastroenterology', care_setting: 'infusion_center', age: 38, labs: { calprotectin: 'elevated' }, notes: 'Steroid-dependent' },
  },
  {
    label: 'RA — Rituximab, post TNF-inhibitor failure',
    data: { diagnosis: 'Rheumatoid Arthritis', icd10_code: 'M05.79', drug_key: 'rituximab', prior_therapies: ['methotrexate', 'adalimumab'], specialty: 'Rheumatology', care_setting: 'infusion_center', age: 61, labs: { RF: 'positive' }, notes: 'Failed TNF inhibitor' },
  },
]

const EMPTY_CASE: SimulationCase = {
  diagnosis: '', icd10_code: '', drug_key: 'infliximab',
  prior_therapies: [], specialty: '', care_setting: 'infusion_center',
  age: 0, labs: {}, notes: '',
}

// ── Coverage status labels ─────────────────────────────────────────────────────

function coverageLabel(status: SimulationResult['coverage_status'], fitScore: number): string {
  if (fitScore >= 70) return 'Meets criteria'
  if (status === 'not_covered') return 'Restricted under current policy'
  if (status === 'nonpreferred') return 'Non-preferred — step therapy applies'
  return 'Needs more evidence'
}

function coverageColor(fitScore: number): string {
  if (fitScore >= 70) return '#0F766E'
  if (fitScore >= 40) return '#B45309'
  return '#C2410C'
}

function coverageBg(fitScore: number): string {
  if (fitScore >= 70) return '#EAF8F4'
  if (fitScore >= 40) return '#FFF6E8'
  return '#FFF1EB'
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CoverageFitBadge({ score }: { score: number }) {
  const color = coverageColor(score)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color, fontFamily: 'var(--font-ibm-plex-mono, monospace)', lineHeight: 1 }}>
        {score}
      </div>
      <div style={{ fontSize: 9, color: 'var(--ink-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
        cov. fit
      </div>
    </div>
  )
}

function BlockerRow({ blocker }: { blocker: SimulationResult['blockers'][number] }) {
  const hard = blocker.severity === 'hard'
  return (
    <div
      style={{
        display: 'flex', gap: 10, padding: '8px 0',
        borderBottom: '1px solid var(--line-soft)',
      }}
      className="last:border-0"
    >
      {hard
        ? <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#C2410C' }} />
        : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
      }
      <div>
        <p style={{ fontSize: 14, color: 'var(--ink-strong)', lineHeight: 1.5 }}>
          {blocker.description}
        </p>
        <p style={{ fontSize: 12, color: hard ? '#C2410C' : '#B45309', marginTop: 3, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
          {blocker.resolution}
        </p>
      </div>
    </div>
  )
}

function ResultCard({ result, rank }: { result: SimulationResult; rank: number }) {
  const [expanded, setExpanded] = useState(rank === 0)
  const fitColor = coverageColor(result.fit_score)
  const fitBg    = coverageBg(result.fit_score)
  const label    = coverageLabel(result.coverage_status, result.fit_score)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="card overflow-hidden"
    >
      <button
        className="w-full flex items-center justify-between gap-4 text-left transition-colors"
        style={{ padding: '1rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Coverage fit badge */}
          <div
            style={{
              width: 52, height: 52, borderRadius: 12,
              background: fitBg, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <CoverageFitBadge score={result.fit_score} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-strong)' }}>{result.payer_name}</p>
              {rank === 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: '#0F766E', background: '#EAF8F4', padding: '1px 7px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Best fit
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: fitColor, marginTop: 2, fontWeight: 500 }}>
              {label}
            </p>
            {result.blockers.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 1 }}>
                {result.blockers.length} blocker{result.blockers.length !== 1 ? 's' : ''} to resolve
              </p>
            )}
          </div>
        </div>
        <ChevronRight
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ color: 'var(--ink-faint)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.gentle}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--line-soft)' }}
          >
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Next best action */}
              <div style={{ background: '#F0F9FF', borderRadius: 10, padding: '10px 14px', border: '1px solid #BAE6FD' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Next step</p>
                <p style={{ fontSize: 14, color: '#0C4A6E', lineHeight: 1.6 }}>
                  {result.next_best_action}
                </p>
              </div>

              {/* Blockers */}
              {result.blockers.length > 0 && (
                <div>
                  <p className="overline mb-2">Access blockers</p>
                  {result.blockers.map((b, i) => <BlockerRow key={i} blocker={b} />)}
                </div>
              )}

              {result.blockers.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#0F766E' }}>
                  <CheckCircle2 className="w-4 h-4" />
                  No access blockers identified for this case
                </div>
              )}

              {/* PA Summary */}
              <div>
                <p className="overline mb-1">Prior authorization summary</p>
                <p style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65 }}>
                  {result.pa_summary}
                </p>
              </div>

              {/* Evidence checklist */}
              <div>
                <p className="overline mb-2">Evidence pack</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {result.evidence_checklist.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--ink-muted)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-teal)' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CaseReviewPage() {
  const [caseData, setCaseData]     = useState<SimulationCase>(EMPTY_CASE)
  const [results, setResults]       = useState<SimulationResult[] | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [priorInput, setPriorInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      setResults(await runSimulation(caseData))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function loadExample(ex: typeof EXAMPLE_CASES[number]) {
    setCaseData(ex.data)
    setPriorInput(ex.data.prior_therapies.join(', '))
    setResults(null)
  }

  const bestFit = results && results.length > 0 ? results[0] : null

  return (
    <div
      className="mx-auto max-w-screen-xl px-4 sm:px-8 pt-28 pb-20"
      style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}
    >
      {/* Page header */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="mb-10">
        <motion.p variants={fadeUp} className="overline mb-1">Access Review</motion.p>
        <motion.h1
          variants={fadeUp}
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 600, color: 'var(--ink-strong)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}
        >
          Case Review
        </motion.h1>
        <motion.p variants={fadeUp} style={{ fontSize: 15, color: 'var(--ink-muted)', maxWidth: '58ch', lineHeight: 1.65 }}>
          Enter a patient case to check coverage criteria across payers — surfaces access blockers, missing documentation, and the clearest path to approval.
        </motion.p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">

        {/* ── Form panel ── */}
        <div>
          {/* Quick examples */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>Example cases</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {EXAMPLE_CASES.map(ex => (
                <button
                  key={ex.label}
                  onClick={() => loadExample(ex)}
                  style={{
                    padding: '6px 12px', borderRadius: 9999,
                    border: '1px solid var(--line-mid)',
                    fontSize: 12, color: 'var(--ink-body)',
                    background: 'var(--bg-surface)', cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--accent-blue)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--line-mid)'
                    ;(e.currentTarget as HTMLElement).style.color = 'var(--ink-body)'
                  }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex', flexDirection: 'column', gap: 16,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line-soft)',
              borderRadius: 20, padding: '1.5rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            {/* Drug */}
            <Field label="Drug">
              <select
                value={caseData.drug_key}
                onChange={e => setCaseData(c => ({ ...c, drug_key: e.target.value }))}
                className="input-field"
              >
                {DRUG_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </Field>

            <Field label="Diagnosis">
              <input
                type="text" placeholder="e.g., Rheumatoid Arthritis"
                value={caseData.diagnosis}
                onChange={e => setCaseData(c => ({ ...c, diagnosis: e.target.value }))}
                className="input-field" required
              />
            </Field>

            <Field label="ICD-10 Code">
              <input
                type="text" placeholder="e.g., M05.9"
                value={caseData.icd10_code}
                onChange={e => setCaseData(c => ({ ...c, icd10_code: e.target.value }))}
                className="input-field"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
              />
            </Field>

            <Field label="Prior Therapies (comma-separated)">
              <input
                type="text" placeholder="e.g., Methotrexate, Azathioprine"
                value={priorInput}
                onChange={e => {
                  setPriorInput(e.target.value)
                  setCaseData(c => ({ ...c, prior_therapies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))
                }}
                className="input-field"
              />
            </Field>

            <Field label="Specialty">
              <input
                type="text" placeholder="e.g., Rheumatology"
                value={caseData.specialty}
                onChange={e => setCaseData(c => ({ ...c, specialty: e.target.value }))}
                className="input-field"
              />
            </Field>

            <Field label="Care Setting">
              <select
                value={caseData.care_setting}
                onChange={e => setCaseData(c => ({ ...c, care_setting: e.target.value as SimulationCase['care_setting'] }))}
                className="input-field"
              >
                {CARE_SETTINGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>

            <Field label="Patient Age">
              <input
                type="number" min={0} max={120}
                value={caseData.age || ''}
                onChange={e => setCaseData(c => ({ ...c, age: Number(e.target.value) }))}
                className="input-field"
              />
            </Field>

            <button
              type="submit"
              disabled={loading || !caseData.diagnosis}
              className="btn-primary w-full justify-center"
              style={{ opacity: loading || !caseData.diagnosis ? 0.5 : 1, cursor: loading || !caseData.diagnosis ? 'not-allowed' : 'pointer' }}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Checking coverage…</>
              ) : (
                <><ClipboardCheck className="w-4 h-4" /> Check Coverage</>
              )}
            </button>
          </form>
        </div>

        {/* ── Results panel ── */}
        <div>
          {error && (
            <div
              style={{
                borderRadius: 12, border: '1px solid #C2410C30',
                background: '#FFF1EB', padding: '0.75rem 1rem',
                fontSize: 14, color: '#C2410C', marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {results === null && !loading && (
            <div
              style={{
                border: '1px solid var(--line-soft)',
                borderRadius: 20,
                padding: '3rem',
                textAlign: 'center',
                background: 'var(--bg-soft)',
              }}
            >
              <ClipboardCheck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ink-faint)' }} />
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 8 }}>
                Fill in the case details and click <strong>Check Coverage</strong> to see payer-by-payer access analysis.
              </p>
              <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                Or select an example case above to get started.
              </p>
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div
              style={{
                border: '1px solid var(--line-soft)',
                borderRadius: 20, padding: '3rem',
                textAlign: 'center', color: 'var(--ink-muted)', fontSize: 14,
                background: 'var(--bg-soft)',
              }}
            >
              No matching policies found for this drug.
            </div>
          )}

          {results !== null && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Summary bar */}
              {bestFit && (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--line-soft)',
                    borderRadius: 14, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#0F766E' }} />
                  <div style={{ fontSize: 14, color: 'var(--ink-body)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--ink-strong)' }}>{results.length} payers checked</strong>
                    {' — '}
                    best fit is <strong style={{ color: '#0F766E' }}>{bestFit.payer_name}</strong> ({coverageLabel(bestFit.coverage_status, bestFit.fit_score).toLowerCase()})
                  </div>
                </div>
              )}

              {results.map((r, i) => <ResultCard key={r.case_id} result={r} rank={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
