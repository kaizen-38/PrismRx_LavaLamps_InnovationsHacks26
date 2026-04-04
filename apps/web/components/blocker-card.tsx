'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PrismRx — Blocker Card
// Renders one SimulationResult per payer: verdict, friction score, blockers
// with full citations. This is the primary judge-facing output component.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { SimulationResult, SimulationBlocker, CoverageStatus } from '@/lib/types'
import VoiceBriefButton from '@/components/voice-brief-button'

interface BlockerCardProps {
  result: SimulationResult
  /** Index so cards can stagger-animate */
  index?: number
}

export default function BlockerCard({ result }: BlockerCardProps) {
  const [expandedBlocker, setExpandedBlocker] = useState<number | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)

  const verdictConfig = getVerdictConfig(result.coverage_status, result.blockers.length)

  return (
    <div
      className={`rounded-xl border ${verdictConfig.border} bg-navy-900 overflow-hidden transition-all`}
    >
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div className={`px-5 py-4 flex items-start justify-between gap-4 ${verdictConfig.headerBg}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-100 text-base">{result.payer_name}</h3>
            <VerdictBadge status={result.coverage_status} blockerCount={result.blockers.length} />
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{result.pa_summary}</p>
        </div>

        {/* Fit score ring */}
        <div className="shrink-0 flex flex-col items-center">
          <FitScoreRing score={result.fit_score} />
          <span className="text-[10px] text-slate-500 mt-0.5 font-mono">fit score</span>
        </div>
      </div>

      {/* ── Blockers ────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-3">
        {result.blockers.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            No hard blockers — PA should be approvable with complete documentation.
          </div>
        ) : (
          result.blockers.map((blocker, i) => (
            <BlockerItem
              key={i}
              blocker={blocker}
              index={i}
              expanded={expandedBlocker === i}
              onToggle={() => setExpandedBlocker(expandedBlocker === i ? null : i)}
            />
          ))
        )}
      </div>

      {/* ── Next best action ────────────────────────────────────────────────── */}
      <div className="mx-5 mb-4 rounded-lg border border-navy-700 bg-navy-800/60 px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Next best action
        </p>
        <p className="text-sm text-slate-200">{result.next_best_action}</p>
      </div>

      {/* ── Voice brief button ──────────────────────────────────────────────── */}
      <div className="mx-5 mb-4 flex justify-end">
        <VoiceBriefButton result={result} />
      </div>

      {/* ── Evidence checklist (collapsible) ────────────────────────────────── */}
      <div className="mx-5 mb-5">
        <button
          type="button"
          onClick={() => setShowChecklist((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ChevronIcon open={showChecklist} />
          Evidence checklist ({result.evidence_checklist.length} items)
        </button>

        {showChecklist && (
          <ul className="mt-2 space-y-1">
            {result.evidence_checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded border border-slate-600 bg-navy-800" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── BlockerItem ───────────────────────────────────────────────────────────────

function BlockerItem({
  blocker,
  index,
  expanded,
  onToggle,
}: {
  blocker: SimulationBlocker
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`rounded-lg border ${
        blocker.severity === 'hard'
          ? 'border-red-800/60 bg-red-950/30'
          : 'border-amber-800/50 bg-amber-950/20'
      }`}
    >
      {/* Clickable summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <SeverityIcon severity={blocker.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                blocker.severity === 'hard'
                  ? 'bg-red-900/50 text-red-400'
                  : 'bg-amber-900/40 text-amber-400'
              }`}
            >
              {blocker.severity === 'hard' ? 'Hard Block' : 'Soft Block'}
            </span>
            <span className="text-xs text-slate-500 font-mono">{blocker.type.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm text-slate-200 mt-1 leading-relaxed">{blocker.description}</p>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {/* Expanded: resolution + citation */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-navy-700/50 pt-3">
          {/* Resolution */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Resolution
            </p>
            <p className="text-sm text-emerald-300">{blocker.resolution}</p>
          </div>

          {/* Citation */}
          {blocker.citation ? (
            <div className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-semibold text-cyan-400">
                  {blocker.citation.source_label}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  {blocker.citation.page !== null && (
                    <span>p.{blocker.citation.page}</span>
                  )}
                  {blocker.citation.section && (
                    <span>§ {blocker.citation.section}</span>
                  )}
                  {blocker.citation.effective_date && (
                    <span>{blocker.citation.effective_date}</span>
                  )}
                </div>
              </div>
              <blockquote className="text-xs text-slate-300 italic border-l-2 border-cyan-700 pl-2.5 leading-relaxed">
                "{blocker.citation.quote}"
              </blockquote>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic">No direct citation available for this criterion.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── FitScoreRing ──────────────────────────────────────────────────────────────

function FitScoreRing({ score }: { score: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#1e2d4d" strokeWidth="5" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text
        x="26"
        y="26"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#f1f5f9"
        fontFamily="JetBrains Mono, monospace"
      >
        {score}
      </text>
    </svg>
  )
}

// ── VerdictBadge ──────────────────────────────────────────────────────────────

function VerdictBadge({ status, blockerCount }: { status: CoverageStatus; blockerCount: number }) {
  if (blockerCount === 0 && status !== 'not_covered') {
    return (
      <span className="rounded-full bg-emerald-900/40 border border-emerald-700 px-2 py-0.5 text-xs font-semibold text-emerald-400">
        Likely Approvable
      </span>
    )
  }
  if (status === 'not_covered') {
    return (
      <span className="rounded-full bg-red-900/40 border border-red-700 px-2 py-0.5 text-xs font-semibold text-red-400">
        Blocked
      </span>
    )
  }
  return (
    <span className="rounded-full bg-amber-900/30 border border-amber-700 px-2 py-0.5 text-xs font-semibold text-amber-400">
      {blockerCount} Blocker{blockerCount !== 1 ? 's' : ''}
    </span>
  )
}

// ── Verdict header config ─────────────────────────────────────────────────────

function getVerdictConfig(status: CoverageStatus, blockerCount: number) {
  if (blockerCount === 0 && status !== 'not_covered') {
    return {
      border: 'border-emerald-800/40',
      headerBg: 'bg-emerald-950/20',
    }
  }
  if (status === 'not_covered' || blockerCount >= 2) {
    return {
      border: 'border-red-800/40',
      headerBg: 'bg-red-950/15',
    }
  }
  return {
    border: 'border-amber-800/30',
    headerBg: 'bg-amber-950/10',
  }
}

// ── Micro icons ───────────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: 'hard' | 'soft' }) {
  return severity === 'hard' ? (
    <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
