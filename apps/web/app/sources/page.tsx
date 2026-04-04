'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Sources page  /sources
// Source manifest: which payer documents were ingested, from where,
// when they were effective, and document freshness status.
// Public — no auth required.
// ─────────────────────────────────────────────────────────────────────────────

import { MOCK_POLICIES, DRUG_FAMILIES, PAYERS } from '@/lib/mock-data'

// Build the source manifest from mock policies
const SOURCES = (() => {
  const seen = new Set<string>()
  return MOCK_POLICIES.flatMap(p =>
    p.evidence_citations.map(c => ({
      id: c.id,
      payer: p.payer_name,
      drug: p.drug_display_name,
      label: c.source_label,
      url: c.source_url,
      effective_date: c.effective_date,
      version: p.version_label,
      pages: c.page,
    }))
  ).filter(s => {
    if (seen.has(s.label)) return false
    seen.add(s.label)
    return true
  })
})()

const PAYER_NAMES = Object.values(PAYERS)
const DRUG_NAMES = DRUG_FAMILIES.map(d => d.display_name)

export default function SourcesPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-700">
            <DocIcon />
          </span>
          <h1 className="text-2xl font-bold text-slate-100">Sources</h1>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          PrismRx indexes publicly available payer clinical policy bulletins and medical drug
          policies. All coverage intelligence is grounded in these source documents.
        </p>
      </div>

      {/* Data posture banner */}
      <div className="mb-8 rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-5 py-4 space-y-1">
        <p className="text-sm font-semibold text-emerald-300">Public documents only · Synthetic cases · No PHI</p>
        <p className="text-xs text-slate-500">
          PrismRx uses only publicly available payer policy documents. No member data, claims data, or patient records
          are ingested or stored. Synthetic patient scenarios are used exclusively for the simulation feature.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Source documents" value={SOURCES.length.toString()} />
        <StatCard label="Payers covered" value={PAYER_NAMES.length.toString()} />
        <StatCard label="Drug families" value={DRUG_NAMES.length.toString()} />
        <StatCard label="Data type" value="Public" color="text-emerald-400" />
      </div>

      {/* Coverage scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payers Indexed</h2>
          <div className="space-y-1.5">
            {PAYER_NAMES.map(name => (
              <div key={name} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                {name}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-navy-700 bg-navy-900 px-5 py-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Drug Families Covered</h2>
          <div className="space-y-1.5">
            {DRUG_FAMILIES.map(d => (
              <div key={d.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                  {d.display_name}
                </div>
                <span className="text-xs text-slate-500 font-mono">{d.mechanism}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source document list */}
      <div className="rounded-xl border border-navy-700 bg-navy-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-700 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Source Document Manifest ({SOURCES.length} documents)
          </h2>
          <span className="text-xs text-slate-500 font-mono">Effective dates shown</span>
        </div>
        <div className="divide-y divide-navy-800">
          {SOURCES.map((s, i) => (
            <div key={i} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-navy-800/40 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 truncate">{s.label}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">{s.payer}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{s.drug}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs font-mono text-slate-500">{s.version}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-slate-500">{s.effective_date}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  View ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology note */}
      <div className="mt-8 rounded-xl border border-navy-700 bg-navy-900 px-5 py-5 space-y-3">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Methodology</h2>
        <div className="space-y-2 text-sm text-slate-400 leading-relaxed">
          <p>
            PrismRx ingests PDF and HTML policy documents using an LLM-powered extraction pipeline.
            Each extracted criterion is linked to its source page and section. Confidence scores
            reflect extraction certainty — lower scores indicate ambiguous or implicit policy language.
          </p>
          <p>
            All LLM inference runs server-side. API keys are never exposed to the browser.
            Extracted facts are normalized against a canonical PolicyDNA schema and stored with
            document hashes for traceability.
          </p>
          <p>
            Policy documents are sourced directly from payer websites. PrismRx does not modify
            source content — extracted facts are attributed to exact page/section references.
          </p>
        </div>
        <a href="/about" className="inline-block text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1">
          Full methodology and compliance posture →
        </a>
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-slate-100' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-navy-700 bg-navy-900 px-4 py-3">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold font-mono mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

function DocIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
