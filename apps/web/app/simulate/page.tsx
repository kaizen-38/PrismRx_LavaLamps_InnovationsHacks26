'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Policy Fit Simulator page  /simulate
// Coordinator-only: run synthetic PA scenarios across payers.
// AccessSheet shown to guests/analysts rather than a hard redirect.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SimulatorForm from '@/components/simulator-form'
import BlockerCard from '@/components/blocker-card'
import { AccessSheet } from '@/components/role-gate'
import { WorkspaceHeader, WorkspacePage } from '@/components/layout/workspace-page'
import type { SimulationCase, SimulationResult } from '@/lib/types'
import { runSimulation } from '@/lib/api-client'
import { getMockSimulationResults } from '@/lib/mock-simulate'

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
  const returnTo = `/simulate${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

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
      if (!data || data.length === 0) {
        await new Promise(r => setTimeout(r, 900))
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

  return (
    <AccessSheet
      capability="simulate"
      returnTo={returnTo}
      title="Policy Fit Simulator"
      description="Run synthetic prior-auth scenarios across payers and instantly surface unmet criteria, blockers, and the fastest approvable path. Available to coordinator accounts."
      requiredRole="coordinator"
      fallbackHref="/matrix"
      fallbackLabel="Continue browsing coverage matrix"
    >
    <PageShell>
      {/* PHI warning — light amber */}
      <div
        className="mb-6 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs"
        style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
      >
        <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span>
          <strong>Synthetic cases only.</strong> Do not enter real patient names, insurance IDs, or any identifying information.
          PrismRx uses public payer documents and synthetic demo data — no PHI.
        </span>
      </div>

      {/* Page header */}
      <WorkspaceHeader
        eyebrow="Coordinator Workflow"
        title="Policy Fit Simulator"
        description="Enter a synthetic patient scenario to surface approval blockers, missing evidence, and the fastest approvable path compared across major payers."
        icon={<SimIcon />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start">
        {/* Left: form */}
        <div className="lg:sticky lg:top-20">
          <SimulatorForm
            initialDrugKey={initialDrugKey}
            onSubmit={handleSubmit}
            loading={loading}
          />
          {results && !loading && (
            <button
              onClick={() => { setResults(null); setLastCase(null); setError(null) }}
              className="mt-3 w-full text-xs py-1 transition-colors"
              style={{ color: 'var(--ink-muted)' }}
            >
              ← Run a new simulation
            </button>
          )}
        </div>

        {/* Right: results */}
        <div className="space-y-4">
          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}
            >
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
    </AccessSheet>
  )
}

// ── ResultsSummary ────────────────────────────────────────────────────────────

function ResultsSummary({ results, caseData }: { results: SimulationResult[]; caseData: SimulationCase | null }) {
  const hardBlocked = results.filter(r => r.blockers.some(b => b.severity === 'hard')).length
  const clean = results.filter(r => r.blockers.length === 0).length
  const avgFit = Math.round(results.reduce((s, r) => s + r.fit_score, 0) / results.length)

  return (
    <div className="workspace-panel flex flex-wrap items-center gap-6 px-5 py-4">
      <Stat label="Payers analyzed" value={results.length} />
      <Stat label="Hard blocked" value={hardBlocked} color={hardBlocked > 0 ? '#DC2626' : '#059669'} />
      <Stat label="Clean approvals" value={clean} color={clean > 0 ? '#059669' : 'var(--ink-muted)'} />
      <Stat label="Avg fit score" value={avgFit} color={avgFit >= 70 ? '#059669' : avgFit >= 40 ? '#D97706' : '#DC2626'} />
      {caseData && (
        <div className="ml-auto text-right hidden md:block">
          <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{caseData.diagnosis}</p>
          <p style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
            {caseData.drug_key} · {caseData.prior_therapies.length} prior therapies
          </p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: color ?? 'var(--ink-strong)' }}>{value}</p>
    </div>
  )
}

// ── Loading / empty states ────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line-soft)' }}>
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

function EmptyState() {
  return (
    <div
      className="rounded-xl px-8 py-16 text-center"
      style={{ border: '1px dashed var(--line-mid)', background: 'var(--bg-soft)' }}
    >
      <div
        className="mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line-soft)' }}
      >
        <SimIcon />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-strong)', marginBottom: 6 }}>Ready to simulate</h3>
      <p style={{ fontSize: 14, color: 'var(--ink-muted)', maxWidth: '34ch', margin: '0 auto' }}>
        Fill in the patient scenario on the left and click{' '}
        <span style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>Run Simulation</span>.
        Results appear here — one card per payer with blockers and citations.
      </p>
    </div>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <WorkspacePage>{children}</WorkspacePage>
}

function SimIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'w-4 h-4'} style={{ color: '#7C3AED' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  )
}
