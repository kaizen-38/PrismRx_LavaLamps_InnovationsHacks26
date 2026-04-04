'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, ChevronRight, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { runSimulation } from '@/lib/api-client'
import type { SimulationCase, SimulationResult } from '@/lib/types'

const DRUG_OPTIONS = [
  { key: 'infliximab', label: 'Infliximab (Remicade / biosimilars)' },
  { key: 'rituximab',  label: 'Rituximab (Rituxan / biosimilars)' },
]

const CARE_SETTINGS = [
  { value: 'infusion_center', label: 'Infusion Center' },
  { value: 'hospital',        label: 'Hospital' },
  { value: 'home',            label: 'Home' },
  { value: 'office',          label: 'Office' },
] as const

const EXAMPLE_CASES: Array<{ label: string; data: SimulationCase }> = [
  {
    label: 'RA — Infliximab, no prior therapy',
    data: {
      diagnosis: 'Rheumatoid Arthritis',
      icd10_code: 'M05.9',
      drug_key: 'infliximab',
      prior_therapies: [],
      specialty: 'Rheumatology',
      care_setting: 'infusion_center',
      age: 52,
      labs: {},
      notes: '',
    },
  },
  {
    label: 'Crohn\'s — Infliximab, after DMARD failure',
    data: {
      diagnosis: "Crohn's Disease",
      icd10_code: 'K50.90',
      drug_key: 'infliximab',
      prior_therapies: ['Azathioprine', 'Methotrexate'],
      specialty: 'Gastroenterology',
      care_setting: 'infusion_center',
      age: 38,
      labs: { calprotectin: 'elevated' },
      notes: 'Steroid-dependent',
    },
  },
  {
    label: 'RA — Rituximab, post TNF-inhibitor failure',
    data: {
      diagnosis: 'Rheumatoid Arthritis',
      icd10_code: 'M05.79',
      drug_key: 'rituximab',
      prior_therapies: ['methotrexate', 'adalimumab'],
      specialty: 'Rheumatology',
      care_setting: 'infusion_center',
      age: 61,
      labs: { RF: 'positive', 'anti-CCP': 'positive' },
      notes: 'Failed TNF inhibitor',
    },
  },
]

const EMPTY_CASE: SimulationCase = {
  diagnosis: '',
  icd10_code: '',
  drug_key: 'infliximab',
  prior_therapies: [],
  specialty: '',
  care_setting: 'infusion_center',
  age: 0,
  labs: {},
  notes: '',
}

function FitBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'
  return <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}</span>
}

function BlockerRow({ blocker }: { blocker: SimulationResult['blockers'][number] }) {
  const Icon = blocker.severity === 'hard' ? XCircle : AlertCircle
  const color = blocker.severity === 'hard' ? 'text-rose-400' : 'text-amber-400'
  return (
    <div className="flex gap-3 py-2 border-b border-slate-800 last:border-0">
      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm text-slate-200">{blocker.description}</p>
        <p className="text-xs text-slate-500 mt-0.5">{blocker.resolution}</p>
      </div>
    </div>
  )
}

function ResultCard({ result }: { result: SimulationResult }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
    >
      <button
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 text-center">
            <FitBadge score={result.fit_score} />
            <p className="text-[10px] text-slate-600 mt-0.5">fit score</p>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-100 text-sm">{result.payer_name}</p>
            <p className="text-xs text-slate-500 truncate">{result.coverage_status} — {result.blockers.length} blocker{result.blockers.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-600 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-800"
          >
            <div className="px-5 py-4 space-y-4">
              {/* Next best action */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Next Best Action</p>
                <p className="text-sm text-slate-300">{result.next_best_action}</p>
              </div>

              {/* Blockers */}
              {result.blockers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Blockers</p>
                  <div>
                    {result.blockers.map((b, i) => (
                      <BlockerRow key={i} blocker={b} />
                    ))}
                  </div>
                </div>
              )}

              {/* PA Summary */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">PA Summary</p>
                <p className="text-sm text-slate-400 leading-relaxed">{result.pa_summary}</p>
              </div>

              {/* Evidence checklist */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Evidence Pack</p>
                <ul className="space-y-1">
                  {result.evidence_checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0 mt-0.5" />
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

export default function SimulatePage() {
  const [caseData, setCaseData]   = useState<SimulationCase>(EMPTY_CASE)
  const [results, setResults]     = useState<SimulationResult[] | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [priorInput, setPriorInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await runSimulation(caseData)
      setResults(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function loadExample(ex: (typeof EXAMPLE_CASES)[number]) {
    setCaseData(ex.data)
    setPriorInput(ex.data.prior_therapies.join(', '))
    setResults(null)
  }

  function updatePriorTherapies(val: string) {
    setPriorInput(val)
    setCaseData((c) => ({
      ...c,
      prior_therapies: val.split(',').map((s) => s.trim()).filter(Boolean),
    }))
  }

  return (
    <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-5 h-5 text-violet-400" />
          <h1 className="text-2xl font-bold text-slate-100">Policy Fit Simulator</h1>
        </div>
        <p className="text-sm text-slate-500 max-w-2xl">
          Enter a synthetic patient scenario to surface approval blockers, missing evidence,
          and the fastest approvable path across all payers.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">

        {/* ── Form panel ── */}
        <div>
          {/* Example cases */}
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CASES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => loadExample(ex)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:border-cyan-600 hover:text-cyan-400 transition-colors"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <Field label="Drug">
              <select
                value={caseData.drug_key}
                onChange={(e) => setCaseData((c) => ({ ...c, drug_key: e.target.value }))}
                className="input-base"
              >
                {DRUG_OPTIONS.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Diagnosis">
              <input
                type="text"
                placeholder="e.g., Rheumatoid Arthritis"
                value={caseData.diagnosis}
                onChange={(e) => setCaseData((c) => ({ ...c, diagnosis: e.target.value }))}
                className="input-base"
                required
              />
            </Field>

            <Field label="ICD-10 Code">
              <input
                type="text"
                placeholder="e.g., M05.9"
                value={caseData.icd10_code}
                onChange={(e) => setCaseData((c) => ({ ...c, icd10_code: e.target.value }))}
                className="input-base"
              />
            </Field>

            <Field label="Prior Therapies (comma-separated)">
              <input
                type="text"
                placeholder="e.g., Methotrexate, Azathioprine"
                value={priorInput}
                onChange={(e) => updatePriorTherapies(e.target.value)}
                className="input-base"
              />
            </Field>

            <Field label="Specialty">
              <input
                type="text"
                placeholder="e.g., Rheumatology"
                value={caseData.specialty}
                onChange={(e) => setCaseData((c) => ({ ...c, specialty: e.target.value }))}
                className="input-base"
              />
            </Field>

            <Field label="Care Setting">
              <select
                value={caseData.care_setting}
                onChange={(e) => setCaseData((c) => ({ ...c, care_setting: e.target.value as SimulationCase['care_setting'] }))}
                className="input-base"
              >
                {CARE_SETTINGS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Patient Age">
              <input
                type="number"
                min={0}
                max={120}
                value={caseData.age || ''}
                onChange={(e) => setCaseData((c) => ({ ...c, age: Number(e.target.value) }))}
                className="input-base"
              />
            </Field>

            <button
              type="submit"
              disabled={loading || !caseData.diagnosis}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <><FlaskConical className="w-4 h-4" /> Run Simulation</>
              )}
            </button>
          </form>
        </div>

        {/* ── Results panel ── */}
        <div>
          {error && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-400 mb-4">
              {error}
            </div>
          )}

          {results === null && !loading && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center text-slate-600 text-sm">
              Run a simulation to see payer-by-payer fit scores and blocker analysis.
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center text-slate-600 text-sm">
              No matching policies found for this drug.
            </div>
          )}

          {results !== null && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-4">
                {results.length} payer{results.length !== 1 ? 's' : ''} analyzed — sorted by fit score
              </p>
              {results.map((r) => (
                <ResultCard key={r.case_id} result={r} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .input-base {
          width: 100%;
          background: rgb(15 23 42);
          border: 1px solid rgb(51 65 85);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(226 232 240);
          outline: none;
        }
        .input-base:focus {
          border-color: rgb(34 211 238 / 0.6);
          box-shadow: 0 0 0 1px rgb(34 211 238 / 0.2);
        }
        .input-base option {
          background: rgb(15 23 42);
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
