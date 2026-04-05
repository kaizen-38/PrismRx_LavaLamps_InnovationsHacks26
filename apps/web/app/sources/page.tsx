'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Sources page  /sources
// Source manifest: which payer documents were ingested, from where,
// when they were effective, and document freshness status.
// Public — no auth required.
// ─────────────────────────────────────────────────────────────────────────────

import { MOCK_POLICIES, DRUG_FAMILIES, PAYERS } from '@/lib/mock-data'
import { WorkspaceHeader, WorkspaceMetricCard, WorkspacePage } from '@/components/layout/workspace-page'

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
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Source Traceability"
        title="Sources"
        description="PrismRx indexes publicly available payer clinical policy bulletins and medical drug policies. All coverage intelligence is grounded in these source documents."
        icon={<DocIcon />}
      />

      {/* Data posture banner */}
      <div className="workspace-panel mb-8 px-5 py-4">
        <p className="text-sm font-semibold text-emerald-700">Public documents only · Synthetic cases · No PHI</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-muted)' }}>
          PrismRx uses only publicly available payer policy documents. No member data, claims data, or patient records
          are ingested or stored. Synthetic patient scenarios are used exclusively for the simulation feature.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <WorkspaceMetricCard label="Source documents" value={SOURCES.length.toString()} />
        <WorkspaceMetricCard label="Payers covered" value={PAYER_NAMES.length.toString()} />
        <WorkspaceMetricCard label="Drug families" value={DRUG_NAMES.length.toString()} />
        <WorkspaceMetricCard label="Data type" value="Public" tone="success" />
      </div>

      {/* Coverage scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="workspace-panel px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Payers Indexed</h2>
          <div className="space-y-1.5">
            {PAYER_NAMES.map(name => (
              <div key={name} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                {name}
              </div>
            ))}
          </div>
        </div>
        <div className="workspace-panel px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Drug Families Covered</h2>
          <div className="space-y-1.5">
            {DRUG_FAMILIES.map(d => (
              <div key={d.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  {d.display_name}
                </div>
                <span className="font-mono text-xs text-slate-500">{d.mechanism}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source document list */}
      <div className="workspace-panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--bg-soft)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Source Document Manifest ({SOURCES.length} documents)
          </h2>
          <span className="font-mono text-xs text-slate-500">Effective dates shown</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
          {SOURCES.map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-slate-900">{s.label}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">{s.payer}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{s.drug}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="font-mono text-xs text-slate-500">{s.version}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs text-slate-500">{s.effective_date}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="workspace-link text-xs"
                >
                  View ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology note */}
      <div className="workspace-panel mt-8 space-y-3 px-5 py-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600">Methodology</h2>
        <div className="space-y-2 text-sm leading-relaxed text-slate-700">
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
        <a href="/about" className="workspace-link mt-1 inline-block text-xs">
          Full methodology and compliance posture →
        </a>
      </div>
    </WorkspacePage>
  )
}

function DocIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
