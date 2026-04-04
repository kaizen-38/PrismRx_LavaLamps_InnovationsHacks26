'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Policy Fit Simulator page
// Gold path: form → run simulation → blocker cards with citations per payer.
// Works fully on mock data; swaps to real API once backend is live.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SimulatorForm from '@/components/simulator-form'
import BlockerCard from '@/components/blocker-card'
import type { SimulationCase, SimulationResult } from '@/lib/types'
import { runSimulation } from '@/lib/api-client'
import { getMockSimulationResults } from '@/lib/mock-simulate'

// Public page — no RouteGuard. Auth only required for save/export actions.
export default function SimulatePage() {
  return (
    <Suspense fallback={<PageShell><LoadingSkeleton /></PageShell>}>
      <SimulateInner />
    </Suspense>
  )
}

function SimulateInner() {
  const searchParams = useSearchParams()
  const initialDrugKey = searchParams.get('drug') ?? undefined

  const [results, setResults] = useState<SimulationResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCase, setLastCase] = useState<SimulationCase | null>(null)

  const handleSubmit = async (caseData: SimulationCase) => {
    setLoading(true)
    setError(null)
    setLastCase(caseData)

    try {
      let data = await runSimulation(caseData)

      // api-client returns [] stub while backend isn't live — use richer mock
      if (!data || data.length === 0) {
        await new Promise((r) => setTimeout(r, 900)) // realistic latency for demo
        data = getMockSimulationResults(caseData)
      }

      setResults(data)
    } catch {
      setError('Simulation failed — using cached results for demo.')
      setResults(getMockSimulationResults(caseData))
    } finally {
      setLoading(false)
    }
  }

  const clearResults = () => {
    setResults(null)
    setLastCase(null)
    setError(null)
  }

  return (
    <PageShell>
      {/* PHI warning banner */}
      <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-xs text-amber-300">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span>
          <strong>Synthetic cases only.</strong> Do not enter real patient names, insurance IDs, dates of birth, or any identifying information.
          PrismRx uses public payer documents and synthetic demo data only — no PHI.
        </span>
      </div>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-700">
            <SimIcon />
          </span>
          <h1 className="text-2xl font-bold text-slate-100">Policy Fit Simulator</h1>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          Enter a synthetic patient scenario to surface approval blockers, missing evidence,
          and the fastest approvable path — compared across all major payers simultaneously.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start">
        {/* Left: form (sticky on large screens) */}
        <div className="lg:sticky lg:top-20">
          <SimulatorForm
            initialDrugKey={initialDrugKey}
            onSubmit={handleSubmit}
            loading={loading}
          />
          {results && !loading && (
            <button
              onClick={clearResults}
              className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
            >
              ← Run a new simulation
            </button>
          )}
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
              {error}
            </div>
          )}

          {!loading && results === null && <EmptyState />}

          {!loading && results !== null && (
            <>
              <ResultsSummary results={results} caseData={lastCase} />
              {results.map((r, i) => (
                <BlockerCard key={r.case_id} result={r} index={i} />
              ))}
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}

// ── ResultsSummary ────────────────────────────────────────────────────────────

function ResultsSummary({
  results,
  caseData,
}: {
  results: SimulationResult[]
  caseData: SimulationCase | null
}) {
  const hardBlocked = results.filter((r) =>
    r.blockers.some((b) => b.severity === 'hard'),
  ).length
  const clean = results.filter((r) => r.blockers.length === 0).length
  const avgFit = Math.round(
    results.reduce((s, r) => s + r.fit_score, 0) / results.length,
  )

  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4 flex flex-wrap items-center gap-6">
      <Stat label="Payers analyzed" value={results.length} />
      <Stat
        label="Hard blocked"
        value={hardBlocked}
        color={hardBlocked > 0 ? 'text-red-400' : 'text-emerald-400'}
      />
      <Stat
        label="Clean approvals"
        value={clean}
        color={clean > 0 ? 'text-emerald-400' : 'text-slate-400'}
      />
      <Stat
        label="Avg fit score"
        value={avgFit}
        color={avgFit >= 70 ? 'text-emerald-400' : avgFit >= 40 ? 'text-amber-400' : 'text-red-400'}
      />
      {caseData && (
        <div className="ml-auto text-right hidden md:block">
          <p className="text-xs text-slate-400">{caseData.diagnosis}</p>
          <p className="text-xs text-slate-600 font-mono">
            {caseData.drug_key} · {caseData.prior_therapies.length} prior therapies
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  color = 'text-slate-100',
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-navy-700 bg-navy-900 overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="shimmer h-4 w-32 rounded" />
              <div className="shimmer h-3 w-64 rounded" />
            </div>
            <div className="shimmer w-12 h-12 rounded-full" />
          </div>
          <div className="px-5 pb-4 space-y-2">
            <div className="shimmer h-10 rounded-lg" />
            <div className="shimmer h-10 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-navy-600 bg-navy-900/50 px-8 py-16 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-navy-800 flex items-center justify-center">
        <SimIcon className="text-slate-500 w-6 h-6" />
      </div>
      <h3 className="text-slate-300 font-semibold mb-1">Ready to simulate</h3>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        Fill in the patient scenario on the left and click{' '}
        <span className="text-cyan-500">Run Simulation</span>. Results appear
        here — one card per payer with blockers and citations.
      </p>
    </div>
  )
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-screen-xl px-6 py-10">{children}</div>
}

// ── Icon ──────────────────────────────────────────────────────────────────────

function SimIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? 'w-4 h-4 text-violet-400'}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  )
}
